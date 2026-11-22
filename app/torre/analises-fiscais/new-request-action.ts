"use server";
import {randomUUID} from "node:crypto";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

const back="/torre/analises-fiscais/nova";
const clean=(form:FormData,key:string,max:number)=>String(form.get(key)??"").trim().slice(0,max+1);
export async function createFiscalAnalysisRequest(form:FormData){
 const {userId}=await requireAdmin();
 const name=clean(form,"customer_name",180);
 const email=clean(form,"customer_email",254).toLowerCase();
 const phone=clean(form,"customer_phone",30);
 const question=clean(form,"question",10000);
 const preferred=clean(form,"preferred_contact",30);
 if(name.length<2||name.length>180||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
    email.length>254||
    phone.length<8||phone.length>30||
    question.length<10||question.length>10000||
    !["email","whatsapp"].includes(preferred)){
  redirect(back+"?erro=campos");
 }
 const protocol="AFI-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+randomUUID().slice(0,8).toUpperCase();
 const db=getSupabaseAdmin();
 const {data,error}=await db.from("fiscal_analysis_requests")
  .insert({protocol,customer_name:name,customer_email:email,customer_phone:phone,
   preferred_contact:preferred,question,status:"received"})
  .select("id").single();
 if(error||!data){
  console.error("[fiscal-analysis] Request creation failed",error?.code);
  redirect(back+"?erro=salvar");
 }
 await db.from("fiscal_analysis_events").insert({
  request_id:data.id,actor_user_id:userId,event_type:"request_registered_by_admin",
  detail:{source:"torre"}
 }).then(({error})=>{if(error)console.error("[fiscal-analysis] Audit event",error.code);});
 redirect("/torre/analises-fiscais/"+data.id+"?salvo=1");
}
