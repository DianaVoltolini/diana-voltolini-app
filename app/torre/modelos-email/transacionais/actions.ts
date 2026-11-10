"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import nodemailer from "nodemailer";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

const back="/torre/modelos-email";
const clean=(form:FormData,key:string,max:number)=>String(form.get(key)??"").trim().slice(0,max);
const uuid=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const eventKeys=["charge_generated","payment_confirmed"];
const fullEventKey=(code:string,event:string)=>"product:"+code+":"+event;
export async function saveTransactionalEmail(form:FormData){
 await requireAdmin();
 const id=clean(form,"id",50),name=clean(form,"name",120),description=clean(form,"description",500);
 const subject=clean(form,"subject",180),body=clean(form,"body",14000);
 const productId=clean(form,"product_id",50),event=clean(form,"trigger_event",32);
 if(!name||!subject||!body)redirect("/torre/modelos-email/editor?erro=campos");
 const db=getSupabaseAdmin();
 if(id){
  if(!uuid(id))redirect(back+"?erro=campos");
  const {data:existing,error:lookupError}=await db.from("marketing_email_templates")
   .select("id,kind").eq("id",id).eq("kind","transactional").maybeSingle();
  if(lookupError||!existing)redirect(back+"?erro=salvar");
  const {data,error}=await db.from("marketing_email_templates")
   .update({name,description:description||null,subject,body,updated_at:new Date().toISOString()})
   .eq("id",id).eq("kind","transactional").select("id").maybeSingle();
  if(error||!data)redirect(back+"?erro=salvar");
 }else{
  if(!uuid(productId)||!eventKeys.includes(event))redirect("/torre/modelos-email/editor?erro=produto");
  const {data:product,error:productError}=await db.from("products").select("id,code,active").eq("id",productId).maybeSingle();
  if(productError||!product||!product.active)redirect("/torre/modelos-email/editor?erro=produto");
  const event_key=fullEventKey(product.code,event);
  const {data:dupe,error:dupeError}=await db.from("marketing_email_templates").select("id").eq("event_key",event_key).maybeSingle();
  if(dupeError||dupe)redirect("/torre/modelos-email/editor?erro=duplicado");
  if(product.code==="EBOOK-IBSCBS-001"){
   const legacyKey=event==="charge_generated"?"ebook_charge_generated":"ebook_payment_confirmed";
   const {data:legacy,error:legacyError}=await db.from("marketing_email_templates").select("id").eq("event_key",legacyKey).maybeSingle();
   if(legacyError||legacy)redirect("/torre/modelos-email/editor?erro=duplicado");
  }
  const {error}=await db.from("marketing_email_templates").insert({
   name,description:description||null,subject,body,kind:"transactional",event_key,
   active:false,auto_enabled:false,auto_include_existing:false,
   cta_label:event==="charge_generated"?"Ver cobrança":"Acessar minha compra",
   cta_url:"https://app.dianavoltolini.com.br/painel"
  });
  if(error)redirect("/torre/modelos-email/editor?erro=salvar");
 }
 revalidatePath(back);
 redirect(back+"?salvo=1");
}
export async function sendTransactionalTest(form:FormData){
 await requireAdmin();
 const id=clean(form,"id",50);
 const to=clean(form,"test_email",254);
 if(!uuid(id)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)||form.get("confirm")!=="yes")
  redirect(back+"?erro=teste");
 const {data,error}=await getSupabaseAdmin().from("marketing_email_templates")
 .select("subject,body").eq("id",id).eq("kind","transactional").maybeSingle();
 if(error||!data)redirect(back+"?erro=teste");
 const variables:Record<string,string>={
  "{{nome}}":"Cliente Teste","{{valor}}":"R$ 29,90","{{forma_pagamento}}":"PIX",
  "{{situacao_encontro}}":"Sua inscrição no encontro está confirmada.",
 };
 const render=(value:string)=>Object.entries(variables).reduce((s,[k,v])=>s.replaceAll(k,v),value);
 const subject="[TESTE] "+render(data.subject);
 const body=render(data.body);
 const port=Number(process.env.SMTP_PORT||"465");
 const user=process.env.SMTP_USER,pass=process.env.SMTP_PASS,host=process.env.SMTP_HOST;
 if(!user||!pass||!host)redirect(back+"?erro=smtp");
 const mail=nodemailer.createTransport({host,port,secure:(process.env.SMTP_SECURE||String(port===465))==="true",auth:{user,pass}});
 const from=process.env.SMTP_FROM_EMAIL||user;
 const display=(process.env.SMTP_FROM_NAME||"Diana Voltolini").replace(/["\r\n]/g,"");
 const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
 try {
  await mail.sendMail({from:'"'+display+'" <'+from+'>',to,subject,
   text:body+"\n\nPrévia de teste; nenhum pagamento ou disparo automático foi realizado.",
   html:'<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h2>'+escape(subject)+'</h2><div style="white-space:pre-line;line-height:1.65">'+escape(body)+'</div><p>Prévia de teste: nenhum pagamento foi realizado.</p></div>'
  });
 }catch{redirect(back+"?erro=smtp");}
 redirect("/torre/modelos-email/editor?editar="+encodeURIComponent(id)+"&teste=1");
}
