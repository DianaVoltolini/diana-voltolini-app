"use server";
// app/torre/modelos-email/test-newsletter-action.ts
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {renderNewsletterEmail} from "@/lib/marketing/email-test";
import nodemailer from "nodemailer";
export type NewsletterTestState={ok:boolean;message:string};
export async function sendNewsletterControlledTest(_state:NewsletterTestState,form:FormData):Promise<NewsletterTestState>{
 await requireAdmin();
 const templateId=String(form.get("template_id")??"").trim();
 const email=String(form.get("email")??"").trim().toLowerCase();
 if(form.get("confirm")!=="yes")return {ok:false,message:"Confirme o envio controlado."};
 if(!/^[0-9a-f-]{36}$/i.test(templateId)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return {ok:false,message:"Modelo ou e-mail inválido."};
 const db=getSupabaseAdmin();
 const {data:model,error:modelError}=await db.from("marketing_email_templates").select("id,subject,body,cta_label,cta_url").eq("id",templateId).maybeSingle();
 if(modelError||!model)return {ok:false,message:"Modelo não encontrado."};
 const {data:optOut,error:optOutError}=await db.from("marketing_email_unsubscribes").select("email").eq("email",email).maybeSingle();
 if(optOutError)return {ok:false,message:"Não foi possível verificar descadastros."};
 if(optOut)return {ok:false,message:"Este endereço cancelou a newsletter. Não enviaremos a mensagem."};
 const host=process.env.SMTP_HOST,user=process.env.SMTP_USER,pass=process.env.SMTP_PASS,from=process.env.SMTP_FROM_EMAIL;
 if(!host||!user||!pass||!from)return {ok:false,message:"SMTP não configurado."};
 const {data:entry,error:entryError}=await db.from("marketing_email_deliveries").insert({template_id:templateId,email,status:"sending",attempt_count:1}).select("id,unsubscribe_token").single();
 if(entryError||!entry)return {ok:false,message:"Este endereço já possui registro para este modelo. Use outro e-mail controlado ou consulte o histórico."};
 const unsubscribeUrl="https://app.dianavoltolini.com.br/newsletter/descadastrar?token="+entry.unsubscribe_token;
 const body=model.body.replaceAll("{{nome}}","Diana").replace(/\[BOTAO:[^\]]+\]/g,"").trim();
 const formatted=body+(model.cta_url&&model.cta_label?"\n\n[BOTAO: "+model.cta_label+" | "+model.cta_url+"]":"");
 const subject=model.subject.replaceAll("{{nome}}","Diana");
 const transport=nodemailer.createTransport({host,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==="true"||process.env.SMTP_SECURE==="1",auth:{user,pass},connectionTimeout:12000,greetingTimeout:12000,socketTimeout:20000});
 try{
  const sent=await transport.sendMail({from:{name:process.env.SMTP_FROM_NAME||"Diana Voltolini",address:from},to:email,subject,html:renderNewsletterEmail(subject,formatted,unsubscribeUrl),text:subject+"\n\n"+body+"\n\nCancelar inscrição: "+unsubscribeUrl,headers:{"List-Unsubscribe":"<"+unsubscribeUrl+">"}});
  if(!sent.accepted.some(a=>(typeof a==="string"?a:a.address).toLowerCase()===email))throw new Error("Endereço não aceito pelo SMTP");
  const {error:updateError}=await db.from("marketing_email_deliveries").update({status:"accepted",accepted_at:new Date().toISOString()}).eq("id",entry.id);
  if(updateError)throw updateError;
  return {ok:true,message:"Envio controlado aceito pelo SMTP. Confira o recebimento, o CTA, o descadastro e o histórico."};
 }catch(error){
  await db.from("marketing_email_deliveries").update({status:"failed",error_message:error instanceof Error?error.message.slice(0,300):"Erro no envio"}).eq("id",entry.id);
  return {ok:false,message:"Não foi possível concluir o envio. Consulte os logs do servidor."};
 }finally{transport.close()}
}
