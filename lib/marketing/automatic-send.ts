// lib/marketing/automatic-send.ts
import nodemailer from "nodemailer";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {renderNewsletterEmail} from "@/lib/marketing/email-test";
const normal=(email:string)=>email.trim().toLowerCase();
const valid=(email:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export async function runWelcomeAutomation(){
 const db=getSupabaseAdmin();
 const {data:models,error:modelsError}=await db.from("marketing_email_templates").select("id,subject,body,cta_label,cta_url,interest,landing_id,auto_include_existing,auto_activated_at").eq("auto_enabled",true).eq("active",true).not("landing_id","is",null).limit(10);
 if(modelsError)throw modelsError;
 const host=process.env.SMTP_HOST,user=process.env.SMTP_USER,pass=process.env.SMTP_PASS,from=process.env.SMTP_FROM_EMAIL;
 if(!host||!user||!pass||!from)throw new Error("SMTP não configurado");
 const transport=nodemailer.createTransport({host,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==="true"||process.env.SMTP_SECURE==="1",auth:{user,pass},connectionTimeout:12000,greetingTimeout:12000,socketTimeout:20000});
 let sent=0,failed=0;
 try{
 for(const model of models??[]){
  if(sent+failed>=10)break;
  let query=db.from("marketing_leads").select("id,name,email,created_at").eq("newsletter_opt_in",true).eq("landing_id",model.landing_id).order("created_at",{ascending:true}).limit(1000);
  if(model.interest)query=query.eq("interest",model.interest);
  if(!model.auto_include_existing&&model.auto_activated_at)query=query.gte("created_at",model.auto_activated_at);
  const {data:leads,error:leadError}=await query;
  if(leadError)throw leadError;
  for(const lead of leads??[]){
   if(sent+failed>=10)break;
   const email=normal(lead.email??"");
   if(!valid(email))continue;
   const {data:unsub,error:unsubscribeError}=await db.from("marketing_email_unsubscribes").select("email").eq("email",email).maybeSingle();
   if(unsubscribeError)throw unsubscribeError;
   if(unsub)continue;
   const {data:entry,error:createError}=await db.from("marketing_email_deliveries").upsert({template_id:model.id,email,lead_id:lead.id,lead_name:lead.name??null},{onConflict:"template_id,email",ignoreDuplicates:true}).select("id,unsubscribe_token,status").maybeSingle();
   if(createError)throw createError;
   if(!entry||entry.status!=="pending")continue;
   const {data:claim,error:claimError}=await db.from("marketing_email_deliveries").update({status:"sending",claimed_at:new Date().toISOString(),attempt_count:1}).eq("id",entry.id).eq("status","pending").select("id").maybeSingle();
   if(claimError)throw claimError;
   if(!claim)continue;
   const unsubUrl="https://app.dianavoltolini.com.br/newsletter/descadastrar?token="+encodeURIComponent(entry.unsubscribe_token);
   const name=(lead.name??"").trim().split(/\s+/)[0]||"";
   const subject=model.subject.replaceAll("{{nome}}",name);
   const body=model.body.replaceAll("{{nome}}",name).replace(/\[BOTAO:[^\]]+\]/g,"").trim();
   const formatted=body+(model.cta_url&&model.cta_label?"\n\n[BOTAO: "+model.cta_label+" | "+model.cta_url+"]":"");
   const html=renderNewsletterEmail(subject,formatted,unsubUrl);
   try{
    const delivery=await transport.sendMail({from:{name:process.env.SMTP_FROM_NAME||"Diana Voltolini",address:from},to:email,subject,html,text:subject+"\n\n"+body+"\n\nCancelar inscrição: "+unsubUrl,headers:{"List-Unsubscribe":"<"+unsubUrl+">"}});
    if(!delivery.accepted.some(a=>(typeof a==="string"?a:a.address).toLowerCase()===email))throw new Error("SMTP não aceitou o destinatário");
    await db.from("marketing_email_deliveries").update({status:"accepted",accepted_at:new Date().toISOString()}).eq("id",entry.id);
    sent++;
   }catch(err){
    await db.from("marketing_email_deliveries").update({status:"failed",error_message:err instanceof Error?err.message.slice(0,350):"Erro SMTP"}).eq("id",entry.id);
    failed++;
   }
  }
 }
 }finally{transport.close()}
 return {sent,failed};
}
