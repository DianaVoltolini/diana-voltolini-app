"use server";

import {randomUUID} from "node:crypto";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {normalizeFiscalWhatsapp} from "./whatsapp-format";

const PUBLIC_PATH="/solicitar-analise-fiscal";
function value(form:FormData,key:string,max:number):string{
 const raw=form.get(key);
 return typeof raw==="string"?raw.trim().slice(0,max+1):"";
}
function fail(code:string):never{
 redirect(PUBLIC_PATH+"?erro="+encodeURIComponent(code));
}
export async function submitPublicFiscalAnalysisRequest(form:FormData){
 // Honeypot para automações simples: nunca guardar dados que o cliente não informou.
 if(value(form,"website",200))redirect(PUBLIC_PATH+"?recebida=1");
 const name=value(form,"customer_name",180);
 const email=value(form,"customer_email",254).toLowerCase();
 const phone=normalizeFiscalWhatsapp(value(form,"customer_phone",30));
 const preferred=value(form,"preferred_contact",30);
 const question=value(form,"question",10000);
 const consent=value(form,"consent",10);
 if(name.length<2||name.length>180||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||
  phone===null||
  !["email","whatsapp"].includes(preferred)||
  question.length<10||question.length>10000||
  consent!=="yes")fail("campos");

 const db=getSupabaseAdmin();
 // Evita que um mesmo endereço dispare solicitações repetidas na rotina.
 const {count,error:limitError}=await db.from("fiscal_analysis_requests")
  .select("id",{count:"exact",head:true}).eq("customer_email",email)
  .gte("created_at",new Date(Date.now()-24*60*60*1000).toISOString());
 if(limitError)fail("indisponivel");
 if((count??0)>=3)fail("limite");

 const protocol="AFI-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+randomUUID().slice(0,8).toUpperCase();
 const {data,error}=await db.from("fiscal_analysis_requests").insert({
  protocol,customer_name:name,customer_email:email,customer_phone:phone,
  preferred_contact:preferred,question,status:"received"
 }).select("id").single();
 if(error||!data){
  console.error("[fiscal-public-intake] Insert failed",error?.code);
  fail("indisponivel");
 }
 const {error:eventError}=await db.from("fiscal_analysis_events").insert({
  request_id:data.id,event_type:"request_received_public",detail:{channel:"form"}
 });
 if(eventError)console.error("[fiscal-public-intake] Audit failed",eventError.code);
 revalidatePath("/torre/analises-fiscais");
 redirect(PUBLIC_PATH+"?recebida=1&protocolo="+encodeURIComponent(protocol));
}
