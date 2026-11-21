"use server";

import {randomUUID} from "node:crypto";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import nodemailer from "nodemailer";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {moneyBR,quoteUrl,quoteToken,quoteTokenHash} from "@/lib/fiscal/analysis-quote-links";

const validId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]??ch));
function fail(id:string,reason:string):never{
 redirect("/torre/analises-fiscais/"+id+"?erro="+encodeURIComponent(reason));
}
/** O servidor só habilita o envio junto com o checkout de valor variável. */
export async function sendFiscalAnalysisQuote(form:FormData){
 const {userId}=await requireAdmin();
 const requestId=String(form.get("request_id")??"").trim();
 const quoteId=String(form.get("quote_id")??"").trim();
 if(!validId.test(requestId)||!validId.test(quoteId))redirect("/torre/analises-fiscais?erro=identificacao");
 if(process.env.FISCAL_ANALYSIS_QUOTE_EMAIL_ENABLED!=="1" ||
    process.env.FISCAL_ANALYSIS_VARIABLE_CHECKOUT_ENABLED!=="1")
    fail(requestId,"envio_bloqueado");
 const db=getSupabaseAdmin();
 const [{data:req,error:re},{data:q,error:qe}]=await Promise.all([
  db.from("fiscal_analysis_requests").select("id,protocol,status,customer_name,customer_email").eq("id",requestId).maybeSingle(),
  db.from("fiscal_analysis_quotes").select("id,request_id,version,status,scope,amount_cents,delivery_business_days,valid_until,email_delivery_state")
   .eq("id",quoteId).eq("request_id",requestId).maybeSingle()
 ]);
 if(re||qe||!req||!q)fail(requestId,"nao_encontrado");
 if(q.status!=="draft"||!["received","awaiting_details","quoting"].includes(req.status))fail(requestId,"situacao");
 if(new Date(q.valid_until).getTime()<=Date.now())fail(requestId,"prazo");
 const email=req.customer_email.trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(requestId,"email");
 const claim=randomUUID();
 const now=new Date().toISOString();
 // A atualização condicional impede envio simultâneo do mesmo orçamento.
 const {data:reserved,error:reserveError}=await db.from("fiscal_analysis_quotes")
  .update({email_delivery_state:"sending",email_send_claim:claim,email_delivery_error:null,
    email_send_attempts:1,updated_at:now})
  .eq("id",q.id).eq("status","draft").in("email_delivery_state",["idle","failed"])
  .select("id").maybeSingle();
 if(reserveError||!reserved)fail(requestId,"envio_em_andamento");

 let success=false,reason="";
 const link=quoteUrl(q.id,q.version);
 const token=quoteToken(q.id,q.version);
 const hash=quoteTokenHash(token);
 const amount=moneyBR(q.amount_cents);
 const subject="Orçamento de Análise Fiscal Individual · "+(req.protocol||"Solicitação");
 const textBody=`Olá, ${req.customer_name}.\n\nSeu orçamento está disponível.\n\nServiço: Análise Fiscal Individual\nEscopo: ${q.scope}\nValor: ${amount}\nPrazo: ${q.delivery_business_days} dia(s) útil(eis)\n\nConsulte sua proposta: ${link}\n\nDiana Voltolini · Inteligência Fiscal`;
 const html=`<!doctype html><html lang="pt-BR"><body style="background:#f4f6f8;margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#102033">
 <div style="max-width:640px;background:#fff;border:1px solid #d6e0e8;border-top:5px solid #c9a227;margin:auto;border-radius:9px;overflow:hidden">
 <div style="padding:26px 32px;text-align:center"><img src="https://app.dianavoltolini.com.br/brand/logo-light.png" alt="Diana Voltolini" width="175" style="max-width:80%;height:auto"></div>
 <div style="padding:0 32px 32px"><h1 style="font-family:Georgia,serif;font-size:26px">Seu orçamento está disponível</h1>
 <p>Olá, ${escapeHtml(req.customer_name)}.</p>
 <p>Preparamos uma proposta individual para a sua solicitação.</p>
 <p style="white-space:pre-line;line-height:1.7"><strong>Escopo:</strong> ${escapeHtml(q.scope)}</p>
 <p style="font-size:24px;font-weight:bold;color:#102033">${escapeHtml(amount)}</p>
 <p>Prazo previsto: ${q.delivery_business_days} dia(s) útil(eis).</p>
 <p style="text-align:center;margin:28px 0"><a href="${escapeHtml(link)}" style="padding:14px 22px;display:inline-block;background:#c9a227;color:#102033;text-decoration:none;border-radius:7px;font-weight:700">Consultar meu orçamento</a></p>
 <p style="font-size:13px;color:#536372">Esta mensagem não é uma cobrança.</p>
 </div>
 <div style="padding:20px;text-align:center;background:#f7f9fb;font-size:12px;border-top:1px solid #d6e0e8">DIANA VOLTOLINI · ESPECIALISTA EM FATURAMENTO E INTELIGÊNCIA FISCAL</div></div></body></html>`;
 let mail:nodemailer.Transporter|undefined;
 try{
  const host=process.env.SMTP_HOST,user=process.env.SMTP_USER,pass=process.env.SMTP_PASS;
  if(!host||!user||!pass)throw new Error("SMTP indisponível");
  const port=Number(process.env.SMTP_PORT||465);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error("SMTP_PORT inválida");
  mail=nodemailer.createTransport({
   host,port,secure:(process.env.SMTP_SECURE||String(port===465))==="true",
   auth:{user,pass},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:15000
  });
  const fromEmail=process.env.SMTP_FROM_EMAIL||user;
  const result=await mail.sendMail({
   from:{name:(process.env.SMTP_FROM_NAME||"Diana Voltolini").replace(/[\r\n"]/g,""),address:fromEmail},
   to:email,subject,html,text:textBody
  });
  const recipientAccepted=result.accepted.some((recipient: string | {address:string})=>{
   const acceptedEmail=typeof recipient==="string"?recipient:recipient.address;
   return acceptedEmail.toLowerCase()===email;
  });
  if(!recipientAccepted)throw new Error("SMTP não aceitou o endereço");
  success=true;
 }catch(error){
  reason=error instanceof Error?error.message:"Falha no SMTP";
  console.error("[fiscal-analysis-email] Falha",{
   requestId,quoteId,error:reason.slice(0,150)
  });
 }finally{mail?.close();}
 if(!success){
  await db.from("fiscal_analysis_quotes")
   .update({email_delivery_state:"failed",email_delivery_error:reason.slice(0,200),updated_at:new Date().toISOString()})
   .eq("id",q.id).eq("email_send_claim",claim).eq("email_delivery_state","sending");
  fail(requestId,"smtp");
 }
 const sentAt=new Date().toISOString();
 const {data:sent,error:sentErr}=await db.from("fiscal_analysis_quotes")
  .update({status:"sent",email_delivery_state:"accepted",sent_at:sentAt,email_sent_at:sentAt,
   access_token_hash:hash,token_expires_at:q.valid_until,updated_at:sentAt})
  .eq("id",q.id).eq("email_send_claim",claim).eq("email_delivery_state","sending")
  .eq("status","draft").select("id").maybeSingle();
 if(sentErr||!sent){
  console.error("[fiscal-analysis-email] E-mail aceito mas falha ao registrar entrega:",quoteId,sentErr?.code);
  fail(requestId,"conferencia_envio");
 }
 const {error:statusError}=await db.from("fiscal_analysis_requests")
  .update({status:"quote_sent",updated_at:sentAt}).eq("id",requestId).eq("status","quoting");
 if(statusError)console.error("[fiscal-analysis-email] Falha ao atualizar solicitação",statusError.code);
 await db.from("fiscal_analysis_events").insert({request_id:requestId,actor_user_id:userId,
  event_type:"quote_email_accepted",detail:{quote_id:q.id,quote_version:q.version}})
  .then(({error})=>{if(error)console.error("[fiscal-analysis-email] Auditoria",error.code);});
 revalidatePath("/torre/analises-fiscais");
 revalidatePath("/torre/analises-fiscais/"+requestId);
 redirect("/torre/analises-fiscais/"+requestId+"?email=aceito");
}
