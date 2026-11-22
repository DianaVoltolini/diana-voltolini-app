import "server-only";
import nodemailer from "nodemailer";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

export type FiscalNotificationKind="admin_message"|"client_message"|"client_file"|"admin_file"|"status_awaiting_client"|"status_in_progress"|"status_completed";
const ADMIN_URL="https://app.dianavoltolini.com.br/torre/analises-fiscais/";
const CLIENT_URL="https://app.dianavoltolini.com.br/painel/analises-fiscais/";
const validEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function escapeHtml(value:string):string{
 return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]??char));
}
const notificationContent:Record<FiscalNotificationKind,{title:string;message:string;to:"admin"|"client"}>={
 admin_message:{title:"Nova mensagem no seu atendimento",message:"A equipe enviou uma nova mensagem sobre sua Análise Fiscal Individual.",to:"client"},
 client_message:{title:"Nova resposta do cliente",message:"O cliente respondeu no atendimento da Análise Fiscal Individual.",to:"admin"},
 client_file:{title:"Documento recebido do cliente",message:"O cliente anexou um documento ao atendimento.",to:"admin"},
 admin_file:{title:"Novo documento no seu atendimento",message:"Um novo documento foi disponibilizado para consulta na sua Área do Cliente.",to:"client"},
 status_awaiting_client:{title:"Informações necessárias para sua análise",message:"Seu atendimento aguarda informações complementares. Acesse a Área do Cliente para conferir os detalhes.",to:"client"},
 status_in_progress:{title:"Sua análise fiscal está em andamento",message:"Seu atendimento está em análise. Você pode acompanhar o andamento pela Área do Cliente.",to:"client"},
 status_completed:{title:"Sua análise fiscal foi concluída",message:"Seu atendimento foi concluído. Acesse a Área do Cliente para consultar os documentos disponibilizados.",to:"client"}
};

/**
 * Avisos são complementares aos registros do banco. Uma falha SMTP jamais desfaz
 * mensagem, mudança de situação ou upload já persistido.
 * Não envia pergunta fiscal, conteúdo de mensagem nem nome de documento por e-mail.
 */
export async function notifyFiscalAnalysisService(requestId:string,kind:FiscalNotificationKind):Promise<void>{
 const db=getSupabaseAdmin();
 const config=notificationContent[kind];
 const {data:row,error:requestError}=await db.from("fiscal_analysis_requests")
  .select("id,protocol,customer_name,customer_email,user_id,paid_at").eq("id",requestId).maybeSingle();
 if(requestError||!row?.paid_at)return;
 const destination=config.to==="client"?row.customer_email:process.env.FISCAL_ANALYSIS_ADMIN_NOTIFY_EMAIL;
 const eventDetail={kind,recipient_role:config.to};
 const log=async(status:"sent"|"failed"|"not_configured")=>{
  const {error}=await db.from("fiscal_analysis_events").insert({
   request_id:requestId,event_type:"service_notification_"+status,
   detail:eventDetail
  });
  if(error)console.error("[fiscal-notification] failed to record event",error.code);
 };
 const host=process.env.SMTP_HOST,user=process.env.SMTP_USER,pass=process.env.SMTP_PASS;
 if(!destination||!validEmail.test(destination)||!host||!user||!pass){
  await log("not_configured");return;
 }
 const port=Number(process.env.SMTP_PORT||465);
 if(!Number.isInteger(port)||port<1||port>65535){await log("not_configured");return;}
 const url=(config.to==="client"?CLIENT_URL:ADMIN_URL)+encodeURIComponent(requestId);
 const protocol=row.protocol||requestId.slice(0,8);
 const subject="Análise Fiscal Individual · "+config.title+" · "+protocol;
 const greeting=config.to==="client"?"Olá, "+row.customer_name+".":"Olá.";
 const fromAddress=process.env.SMTP_FROM_EMAIL||user;
 const fromName=(process.env.SMTP_FROM_NAME||"Diana Voltolini").replace(/[\r\n"]/g,"");
 const text=[greeting,"",config.message,"","Acesse o atendimento: "+url,"",
  "Diana Voltolini · Especialista em Faturamento e Inteligência Fiscal"].join("\n");
 const html=`<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#102033">
 <div style="max-width:640px;margin:auto;background:#fff;border:1px solid #d6e0e8;border-top:5px solid #c9a227;border-radius:9px;overflow:hidden">
 <div style="text-align:center;padding:24px 28px"><img src="https://app.dianavoltolini.com.br/brand/logo-light.png" alt="Diana Voltolini" width="175" style="max-width:80%;height:auto"></div>
 <div style="padding:0 32px 32px"><h1 style="font-family:Georgia,serif;font-size:25px;line-height:1.3">${escapeHtml(config.title)}</h1>
 <p>${escapeHtml(greeting)}</p><p style="line-height:1.7">${escapeHtml(config.message)}</p>
 <p style="text-align:center;margin:28px 0"><a href="${escapeHtml(url)}" style="background:#c9a227;color:#102033;padding:14px 22px;border-radius:7px;font-weight:700;text-decoration:none;display:inline-block">Acessar atendimento</a></p>
 <p style="font-size:12px;color:#647381">Para proteger suas informações, documentos e mensagens ficam somente na área restrita.</p></div>
 <div style="text-align:center;background:#f7f9fb;border-top:1px solid #d6e0e8;padding:18px;font-size:11px;color:#536372">DIANA VOLTOLINI · ESPECIALISTA EM FATURAMENTO E INTELIGÊNCIA FISCAL</div>
 </div></body></html>`;
 const transporter=nodemailer.createTransport({
  host,port,secure:(process.env.SMTP_SECURE||String(port===465))==="true",
  auth:{user,pass},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:15000
 });
 try{
  const result=await transporter.sendMail({from:{name:fromName,address:fromAddress},to:destination,subject,text,html});
  const accepted=result.accepted.some(recipient=>{
   const addr=typeof recipient==="string"?recipient:recipient.address;
   return addr.toLowerCase()===destination.toLowerCase();
  });
  await log(accepted?"sent":"failed");
 }catch(error){
  console.error("[fiscal-notification] SMTP failed",{requestId,kind,error:error instanceof Error?error.message.slice(0,150):"unknown"});
  await log("failed");
 }finally{transporter.close();}
}
