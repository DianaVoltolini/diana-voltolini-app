"use server";
// app/torre/modelos-email/reenvio-ebook/actions.ts
// Reenvio REAL administrativo do ebook. Nunca gera cobranca nem altera ownership.
import nodemailer from "nodemailer";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

export type ResendState={status:"idle"|"preview"|"sent"|"error";message:string;orderId?:string;customer?:string;originalEmail?:string;recipient?:string;product?:string;event?:string;subject?:string;body?:string;};
export const initial:ResendState={status:"idle",message:""};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
const money=(n:number)=>(n/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const url=(value:unknown)=>{if(typeof value!=="string")return null;try{const v=new URL(value);return v.protocol==="https:"?v.toString():null;}catch{return null;}};
const render=(s:string,values:Record<string,string>)=>s.replace(/{{([a-z_]+)}}/g,(all,k:string)=>values[k]??all);

export async function resendRealEbookEmail(_old:ResendState,form:FormData):Promise<ResendState>{
 try {
  return await handleResendRealEbookEmail(form);
 } catch (error) {
  // Não expor stack ou credenciais ao navegador; detalhes ficam nos logs.
  console.error("[ebook-email-resend] Falha ao processar operação:", error);
  return {status:"error",message:"Não foi possível consultar ou reenviar esta mensagem. A operação não foi concluída. Consulte os logs da Torre antes de tentar novamente."};
 }
}

async function handleResendRealEbookEmail(form:FormData):Promise<ResendState>{
 const {userId}=await requireAdmin();
 const orderId=String(form.get("order_id")??"").trim();
 const recipient=String(form.get("recipient_email")??"").trim().toLowerCase().slice(0,254);
 const event=String(form.get("event")??"");
 const mode=String(form.get("mode")??"");
 if(!UUID.test(orderId)||!EMAIL.test(recipient)||!["ebook_charge_generated","ebook_payment_confirmed"].includes(event)||!["preview","send"].includes(mode)){
  return {status:"error",message:"Informe o ID de um pedido válido, o destinatário e o tipo de mensagem."};
 }
 const db=getSupabaseAdmin();
 const {data:order,error:orderErr}=await db.from("orders")
  .select("id,product_id,customer_name,customer_email,amount_cents,status")
  .eq("id",orderId).maybeSingle();
 if(orderErr||!order)return {status:"error",message:"Pedido não encontrado. Confira o ID."};
 const {data:product,error:productErr}=await db.from("products")
  .select("code,name").eq("id",order.product_id).maybeSingle();
 if(productErr||product?.code!=="EBOOK-IBSCBS-001")return {status:"error",message:"Esta ferramenta é exclusiva para pedidos do e-book IBS/CBS."};
 const isCharge=event==="ebook_charge_generated";
 if(isCharge&&order.status!=="pending")return {status:"error",message:"Cobrança somente pode ser reenviada enquanto o pedido estiver pendente."};
 if(!isCharge&&order.status!=="paid")return {status:"error",message:"A confirmação somente pode ser reenviada para pedido pago."};
 const {data:payment,error:paymentErr}=await db.from("payments")
  .select("status,payment_method,payment_url").eq("order_id",orderId).eq("provider","bling")
  .order("created_at",{ascending:false}).limit(1).maybeSingle();
 if(paymentErr||!payment)return {status:"error",message:"Pagamento Bling não encontrado para este pedido."};
 if(isCharge&&payment.status!=="pending")return {status:"error",message:"A cobrança não está pendente no registro do pagamento."};
 if(!isCharge&&payment.status!=="paid")return {status:"error",message:"O pagamento ainda não está confirmado."};
 const paymentLink=isCharge?url(payment.payment_url):null;
 if(isCharge&&!paymentLink)return {status:"error",message:"O pedido não tem um link HTTPS de cobrança válido."};

 const {data:model,error:modelErr}=await db.from("marketing_email_templates")
  .select("subject,body,active").eq("kind","transactional").eq("event_key",event).maybeSingle();
 if(modelErr||!model?.active||!model.subject?.trim()||!model.body?.trim())return {status:"error",message:"Modelo específico do e-book está indisponível na Torre."};
 const app="https://app.dianavoltolini.com.br";
 const firstAccess=app+"/criar-acesso?email="+encodeURIComponent(recipient);
 const login=app+"/login?retorno=%2Fpainel%2Febooks";
 const values:Record<string,string>={
  nome:order.customer_name||"Cliente",produto:product.name,valor:money(Number(order.amount_cents)),
  forma_pagamento:payment.payment_method==="boleto"?"boleto":"PIX",
  situacao_encontro:"A aula on-line de 21/01/2027 integra a oferta. A participação é opcional."
 };
 const subject=render(model.subject,values);
 const body=render(model.body,values);
 const actionUrl=isCharge?paymentLink!:firstAccess;
 const actionLabel=isCharge?"Ver cobrança":"Criar meu acesso e baixar o e-book";
 const display={orderId,customer:values.nome,originalEmail:order.customer_email,recipient,product:product.name,event,subject,body};
 if(mode==="preview")return {status:"preview",message:"Confira os dados do pedido e o destinatário. A prévia não envia mensagem.",...display};
 if(form.get("confirm_identity")!=="yes"||form.get("confirm_send")!=="yes")
  return {status:"error",message:"Confirme a identidade do comprador e o envio real antes de continuar.",...display};
 const requestKey=String(form.get("request_key")??"").trim();
 if(!UUID.test(requestKey))return {status:"error",message:"Identificador de envio inválido. Atualize a página e tente novamente."};
 // Registro único ANTES do SMTP evita dois envios do mesmo formulário.
 const {error:auditErr}=await db.from("ebook_email_resend_audit").insert({
  request_key:requestKey,order_id:orderId,event_key:event,original_email:order.customer_email,
  recipient_email:recipient,actor_user_id:userId,status:"reserved"
 });
 if(auditErr)return {status:"error",message:"Não foi possível reservar o reenvio. Verifique o histórico ou atualize o formulário.",...display};
 let failed:string|null=null;
 try{
  const port=Number(process.env.SMTP_PORT||"465");
  const host=process.env.SMTP_HOST,user=process.env.SMTP_USER,pass=process.env.SMTP_PASS;
  if(!host||!user||!pass)throw new Error("SMTP não configurado");
  const fromEmail=process.env.SMTP_FROM_EMAIL||user;
  const fromName=(process.env.SMTP_FROM_NAME||"Diana Voltolini").replace(/["\r\n]/g,"");
  const mail=nodemailer.createTransport({host,port,secure:(process.env.SMTP_SECURE||String(port===465))==="true",auth:{user,pass},connectionTimeout:5000,greetingTimeout:5000,socketTimeout:7000});
  const extra=isCharge?"":`<p><strong>Já possui cadastro?</strong> <a href="${esc(login)}">Entrar na Área do Cliente</a> e acessar Meus E-books.</p>`;
  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body style="margin:0;padding:20px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#405266">
   <div style="max-width:620px;margin:auto;background:white;border:1px solid #dce4ec;border-radius:9px;overflow:hidden">
   <div style="text-align:center;border-top:4px solid #c9a227;padding:20px"><img src="https://app.dianavoltolini.com.br/brand/logo-light.png" alt="Diana Voltolini" width="175" style="max-width:80%;height:auto"></div>
   <div style="padding:28px 30px"><h1 style="font:700 24px/1.35 Georgia,serif;color:#102033">${esc(subject)}</h1>
   <div style="white-space:pre-line;line-height:1.75;font-size:14px">${esc(body)}</div>
   <p style="text-align:center;margin:28px 0"><a href="${esc(actionUrl)}" style="display:inline-block;background:#c9a227;color:#102033;padding:13px 19px;border-radius:6px;font-weight:bold;text-decoration:none">${esc(actionLabel)}</a></p>
   ${extra}</div>
   <div style="padding:22px 26px;border-top:1px solid #e1e7ed;text-align:center;background:#f7f9fb;color:#607184;font-size:11px;line-height:1.6"><strong style="color:#102033">Diana Voltolini</strong><p>Especialista em Faturamento e Inteligência Fiscal</p><p>Esta é uma comunicação referente à sua compra.</p></div></div></body></html>`;
  await mail.sendMail({from:'"'+fromName+'" <'+fromEmail+'>',to:recipient,subject,
   text:body+"\n\n"+actionLabel+": "+actionUrl+(isCharge?"":"\nJá tem acesso: "+login),html});
 }catch(e){failed=e instanceof Error?e.message:"Falha no envio SMTP";console.error("[ebook manual resend]",{orderId,event,reason:failed});}
 const {error:finishErr}=await db.from("ebook_email_resend_audit")
  .update({status:failed?"failed":"sent",sent_at:failed?null:new Date().toISOString(),error_message:failed?.slice(0,500)??null})
  .eq("request_key",requestKey).eq("status","reserved");
 if(finishErr)return {status:"error",message:"O resultado do SMTP não pôde ser gravado na auditoria. Confira antes de tentar novamente.",...display};
 if(failed)return {status:"error",message:"Falha ao reenviar. A tentativa ficou registrada para revisão; não repita sem verificar.",...display};
 return {status:"sent",message:"E-mail real reenviado. O servidor SMTP aceitou a mensagem. Nenhum dado financeiro foi alterado.",...display};
}
