"use server";
// app/torre/leads/enviar/manual/manual-actions.ts
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {renderNewsletterEmail} from "@/lib/marketing/email-test";
import nodemailer from "nodemailer";
type Lead={id:string;name:string|null;email:string};
export type ManualState={stage:"initial"|"review"|"done"|"error";message:string;eligible:number;sent:number;failed:number;sendId:string};
const initialManualState:ManualState={stage:"initial",message:"",eligible:0,sent:0,failed:0,sendId:""};
const uuid=(v:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const normalize=(v:string)=>v.trim().toLowerCase();
async function getAudience(interest:string,landing:string):Promise<Lead[]>{
 const db=getSupabaseAdmin();
 let leadQuery=db.from("marketing_leads").select("id,name,email").eq("newsletter_opt_in",true).order("created_at",{ascending:false}).limit(1000);
 if(interest)leadQuery=leadQuery.eq("interest",interest);
 if(landing)leadQuery=leadQuery.eq("landing_id",landing);
 const [leadsResult,newsletterResult,blockedResult]=await Promise.all([
  leadQuery,
  !interest&&!landing?db.from("marketing_newsletter_subscribers").select("id,name,email").eq("newsletter_opt_in",true).order("created_at",{ascending:false}).limit(1000):Promise.resolve({data:[] as Lead[],error:null}),
  db.from("marketing_email_unsubscribes").select("email").limit(3000)
 ]);
 if(leadsResult.error)throw leadsResult.error;
 if(newsletterResult.error)throw newsletterResult.error;
 if(blockedResult.error)throw blockedResult.error;
 const blocked=new Set((blockedResult.data??[]).map(x=>normalize(x.email)));
 const seen=new Set<string>(),result:Lead[]=[];
 for(const row of [...(leadsResult.data??[]),...(newsletterResult.data??[])]){
  const email=normalize(row.email??"");
  if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)||seen.has(email)||blocked.has(email))continue;
  seen.add(email);result.push({...row,email});
 }
 return result;
}
export async function manualSendAction(_previous:ManualState,form:FormData):Promise<ManualState>{
 await requireAdmin();
 const templateId=String(form.get("template_id")??"");
 const interest=String(form.get("interest")??"").trim().slice(0,120);
 const landing=String(form.get("landing_id")??"");
 const description=String(form.get("description")??"").trim().slice(0,300);
 const mode=String(form.get("mode")??"");
 const sendId=String(form.get("send_id")??"");
 if(!uuid(templateId)||landing&&!uuid(landing)||!description)return {...initialManualState,stage:"error",message:"Preencha a descrição e selecione um modelo válido."};
 const db=getSupabaseAdmin();
 const {data:model,error:modelError}=await db.from("marketing_email_templates").select("id,subject,body,cta_url,cta_label").eq("id",templateId).eq("active",true).maybeSingle();
 if(modelError||!model)return {...initialManualState,stage:"error",message:"Modelo indisponível."};
 try{
  const leads=await getAudience(interest,landing);
  if(mode==="review")return {...initialManualState,stage:"review",eligible:leads.length,message:leads.length?"Confira o público e confirme o disparo.":"Nenhum contato elegível encontrado."};
  if(mode!=="send"||form.get("confirm")!=="yes"||!uuid(sendId))return {...initialManualState,stage:"error",message:"Confirmação inválida. Revise a campanha novamente."};
  if(!leads.length)return {...initialManualState,stage:"error",message:"Não há destinatários elegíveis."};
  if(leads.length>20)return {...initialManualState,stage:"error",message:"Esta versão envia até 20 destinatários por campanha. Refine os filtros antes de confirmar."};
  const host=process.env.SMTP_HOST,user=process.env.SMTP_USER,pass=process.env.SMTP_PASS,from=process.env.SMTP_FROM_EMAIL;
  if(!host||!user||!pass||!from)return {...initialManualState,stage:"error",message:"SMTP não configurado."};
  // Um ID por confirmação: reenvios da mesma requisição não criam outra campanha.
  const {error:saveError}=await db.from("marketing_manual_sends").insert({id:sendId,template_id:templateId,description,interest:interest||null,landing_id:landing||null,recipient_count:leads.length,status:"processing"});
  if(saveError)return {...initialManualState,stage:"error",message:"Esta campanha já foi processada ou não pôde ser registrada. Confira o histórico antes de repetir."};
  const transport=nodemailer.createTransport({host,port:Number(process.env.SMTP_PORT||587),secure:["true","1"].includes(process.env.SMTP_SECURE??""),auth:{user,pass},connectionTimeout:12000,greetingTimeout:12000,socketTimeout:20000});
  let sent=0,failed=0;
  try{
   for(const lead of leads){
    const {data:unsubscribeCheck,error:unsubscribeError}=await db.from("marketing_email_unsubscribes").select("email").eq("email",lead.email).maybeSingle();
    if(unsubscribeError){failed++;continue;}
    if(unsubscribeCheck)continue;
    const {data:row,error:rowError}=await db.from("marketing_manual_send_recipients").insert({send_id:sendId,email:lead.email,lead_name:lead.name??null,status:"sending"}).select("id,unsubscribe_token").single();
    if(rowError||!row){failed++;continue;}
    const unsubUrl="https://app.dianavoltolini.com.br/newsletter/descadastrar?token="+row.unsubscribe_token;
    const firstName=(lead.name??"").trim().split(/\s+/)[0]||"";
    const subject=model.subject.replaceAll("{{nome}}",firstName);
    const plain=model.body.replaceAll("{{nome}}",firstName).replace(/\[BOTAO:[^\]]+\]/g,"").trim();
    const rich=plain+(model.cta_label&&model.cta_url?"\n\n[BOTAO: "+model.cta_label+" | "+model.cta_url+"]":"");
    try{
     const response=await transport.sendMail({from:{name:process.env.SMTP_FROM_NAME||"Diana Voltolini",address:from},to:lead.email,subject,html:renderNewsletterEmail(subject,rich,unsubUrl),text:subject+"\n\n"+plain+"\n\nCancelar inscrição: "+unsubUrl,headers:{"List-Unsubscribe":"<"+unsubUrl+">"}});
     if(!response.accepted.some(x=>(typeof x==="string"?x:x.address).toLowerCase()===lead.email))throw Error("Destinatário não aceito pelo SMTP");
     await db.from("marketing_manual_send_recipients").update({status:"accepted",accepted_at:new Date().toISOString()}).eq("id",row.id);
     sent++;
    }catch(error){
     failed++;
     await db.from("marketing_manual_send_recipients").update({status:"failed",error_message:error instanceof Error?error.message.slice(0,350):"Falha no SMTP"}).eq("id",row.id);
    }
   }
  }finally{transport.close()}
  await db.from("marketing_manual_sends").update({status:failed?"partial":"completed"}).eq("id",sendId);
  return {stage:"done",message:"Campanha processada. Mensagens aceitas pelo SMTP não significam necessariamente entregues.",eligible:leads.length,sent,failed,sendId};
 }catch(error){console.error("Erro ao processar envio manual",error);return {...initialManualState,stage:"error",message:"Falha ao consultar ou processar a campanha. Consulte os registros antes de tentar novamente."};}
}
