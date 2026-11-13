// lib/encounters/reminder-worker.ts
import "server-only";
import nodemailer from "nodemailer";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

// Primeira turma: um lembrete, no dia anterior, às 8h de Brasília.
// Próximas turmas deverão receber data própria no cadastro do produto.
const CODE="ENC-RT-2027-001";
const KEY="enc-rt-2027-one-day-before";
const SEND_DATE="2027-01-20";
const EVENT_TITLE="Reforma Tributária na Prática: Compras e Faturamento em 2027";
const EVENT_DATE="21/01/2027, das 19h30 às 21h (horário de Brasília)";
const EVENT_URL="https://app.dianavoltolini.com.br/painel/encontro-online";
const emailOk=(email:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function localDate(){
  return new Intl.DateTimeFormat("en-CA",{
    timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit",
  }).format(new Date());
}

function smtpTransport(){
  const host=process.env.SMTP_HOST;
  const user=process.env.SMTP_USER;
  const pass=process.env.SMTP_PASS;
  const from=process.env.SMTP_FROM_EMAIL||user;
  const port=Number(process.env.SMTP_PORT||587);
  if(!host||!user||!pass||!from||!Number.isInteger(port)||port<=0)
    throw new Error("SMTP do portal não configurado.");
  const secure=process.env.SMTP_SECURE==="true"||process.env.SMTP_SECURE==="1"||port===465;
  return {transport:nodemailer.createTransport({
    host,port,secure,auth:{user,pass},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,
  }),from};
}

export async function sendEncounterReminders(){
  // Não enviar fora da data nem em testes acidentais do endpoint.
  if(localDate()!==SEND_DATE)return {eligible:0,sent:0,failed:0,skipped:"outside_window"};
  const db=getSupabaseAdmin();
  const {data:product,error:productError}=await db.from("products").select("id").eq("code",CODE).maybeSingle();
  if(productError)throw productError;
  if(!product)return {eligible:0,sent:0,failed:0,skipped:"product_not_found"};
  const {data:opted,error:optedError}=await db.from("encounter_attendance_confirmations")
    .select("order_id,attendee_name").eq("attendance_status","confirmed")
    .eq("reminder_opt_in",true).not("terms_acknowledged_at","is",null).limit(200);
  if(optedError)throw optedError;
  const ids=(opted??[]).map(a=>a.order_id);
  if(!ids.length)return {eligible:0,sent:0,failed:0};
  const {data:orders,error:ordersError}=await db.from("orders")
    .select("id,customer_email,customer_name").in("id",ids)
    .eq("product_id",product.id).eq("status","paid").not("paid_at","is",null);
  if(ordersError)throw ordersError;
  const known=new Map((opted??[]).map(a=>[a.order_id,a]));
  const {transport,from}=smtpTransport();
  let sent=0,failed=0,eligible=0;
  try{
    for(const order of orders??[]){
      if(!order.customer_email||!emailOk(order.customer_email))continue;
      eligible++;
      const {data:reservation,error:reservationError}=await db.from("encounter_reminder_dispatches")
        .upsert({order_id:order.id,reminder_key:KEY,status:"reserved"},
          {onConflict:"order_id,reminder_key",ignoreDuplicates:true})
        .select("order_id").maybeSingle();
      if(reservationError)throw reservationError;
      if(!reservation)continue; // já reservado ou enviado: prevenir duplicidade
      const recipient=order.customer_email.trim();
      const firstName=(known.get(order.id)?.attendee_name||order.customer_name||"Participante").trim();
      const subject="Lembrete: seu encontro online acontece amanhã, 21/01";
      const body=`Olá, ${firstName}!\n\nSeu encontro ${EVENT_TITLE} acontece amanhã, ${EVENT_DATE}, pelo Google Meet.\n\nConsulte a Área do Cliente para conferir as orientações de participação.\n${EVENT_URL}\n\nEste lembrete foi enviado porque você autorizou o recebimento na Área do Cliente.\n\nDiana Voltolini`;
      let status:"sent"|"failed"="failed",reason:string|null=null;
      try{
        const outcome=await transport.sendMail({
          from:{name:process.env.SMTP_FROM_NAME||"Diana Voltolini",address:from},
          to:recipient,subject,text:body,
          html:`<div style="font-family:Arial,sans-serif;color:#102033;max-width:640px;margin:auto;padding:25px"><h2>${subject}</h2><p>Olá!</p><p>O encontro <strong>Reforma Tributária na Prática: Compras e Faturamento em 2027</strong> será amanhã, <strong>21/01/2027, das 19h30 às 21h</strong> (Brasília), pelo Google Meet.</p><p>Confira as orientações em sua Área do Cliente.</p><p><a href="${EVENT_URL}" style="display:inline-block;padding:14px 19px;background:#c9a227;color:#102033;text-decoration:none;border-radius:6px">Acessar meu encontro</a></p><p>Este lembrete foi solicitado por você na Área do Cliente.</p></div>`,
        });
        if(!outcome.accepted.some(x=>(typeof x==="string"?x:x.address).toLowerCase()===recipient.toLowerCase()))
          throw new Error("Destinatário não aceito pelo SMTP.");
        status="sent";sent++;
      }catch(error){
        failed++;
        reason=error instanceof Error?error.message:"Falha SMTP não identificada";
        console.error("[encounter-reminder] Erro de envio",{orderId:order.id,reason});
      }
      const {error:finalError}=await db.from("encounter_reminder_dispatches")
        .update({status,sent_at:status==="sent"?new Date().toISOString():null,
          error_message:reason?.slice(0,500)??null,updated_at:new Date().toISOString()})
        .eq("order_id",order.id).eq("reminder_key",KEY);
      if(finalError)throw finalError;
    }
  }finally{transport.close();}
  return {eligible,sent,failed};
}
