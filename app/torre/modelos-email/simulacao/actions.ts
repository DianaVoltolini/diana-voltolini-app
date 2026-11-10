"use server";
// app/torre/modelos-email/simulacao/actions.ts
// Simulador isolado: não escreve em orders, payments, subscriptions ou Bling.
import nodemailer from "nodemailer";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

export type SimulationState={
 status:"idle"|"preview"|"sent"|"error";
 message:string;
 recipient?:string;
 customer?:string;
 product?:string;
 model?:string;
 subject?:string;
 body?:string;
 scenario?:string;
};
const initial:SimulationState={status:"idle",message:""};
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
const htmlFooter='<div style="padding:20px 26px;border-top:1px solid #e1e7ed;text-align:center;background:#f7f9fb;color:#607184;font-size:11px;line-height:1.6"><strong style="color:#102033">Diana Voltolini</strong><p>Especialista em Faturamento e Inteligência Fiscal</p><p>SIMULAÇÃO INTERNA — nenhum pedido ou pagamento foi alterado.</p></div>';
const currency=(n:number)=>(n/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const render=(s:string,values:Record<string,string>)=>s.replace(/{{([a-z_]+)}}/g,(full,k:string)=>values[k]??full);

export async function simulateBuyerEmail(_previous:SimulationState,form:FormData):Promise<SimulationState>{
 const admin=await requireAdmin();
 const email=String(form.get("customer_email")??"").trim().toLowerCase().slice(0,254);
 const event=String(form.get("event")??"");
 const scenario=String(form.get("scenario")??"");
 const mode=String(form.get("mode")??"");
 if(!emailPattern.test(email)||!["charge_generated","payment_confirmed"].includes(event)||!["default","routing"].includes(scenario)||!["preview","send"].includes(mode))
  return {...initial,status:"error",message:"Informe um e-mail cadastrado e selecione um cenário válido."};

 const db=getSupabaseAdmin();
 const {data:orders,error:ordersError}=await db.from("orders")
  .select("id,customer_name,customer_email,amount_cents,product_id,status")
  .ilike("customer_email",email).order("created_at",{ascending:false}).limit(1);
 if(ordersError)return {...initial,status:"error",message:"Não foi possível consultar os pedidos desse cadastro."};
 const order=orders?.[0];
 if(!order||order.customer_email?.trim().toLowerCase()!==email)
  return {...initial,status:"error",message:"Não foi encontrado pedido para o e-mail informado. A simulação exige um cadastro com pedido existente."};
 const {data:product,error:productError}=await db.from("products").select("name,code").eq("id",order.product_id).maybeSingle();
 if(productError||!product)return {...initial,status:"error",message:"Não foi possível identificar o produto do cadastro."};

 let templateKey=event==="charge_generated"?"default_charge_generated":"default_payment_confirmed";
 let flow="Modelo geral aplicado apenas na simulação";
 if(scenario==="routing"){
  if(product.code==="EBOOK-IBSCBS-001"){
   templateKey=event==="charge_generated"?"ebook_charge_generated":"ebook_payment_confirmed";
   flow="Modelo específico do e-book";
  }else if(["ASSINATURA-FISCAL-001","diagnostico-expresso-ibs-cbs"].includes(product.code)){
   return {...initial,status:"preview",recipient:email,customer:order.customer_name||"Cliente",product:product.name,
    scenario,message:"Este produto possui disparos específicos no site, fora dos quatro modelos da Torre. O simulador não envia um e-mail genérico para representar indevidamente esse fluxo. Escolha 'Modelo geral' para testar a mensagem padrão, ou teste o fluxo real em homologação."};
  }else{
   flow="Modelo geral selecionado pelo roteamento";
  }
 }
 const {data:template,error:templateError}=await db.from("marketing_email_templates")
  .select("name,subject,body,active").eq("kind","transactional").eq("event_key",templateKey).maybeSingle();
 if(templateError||!template||!template.active)return {...initial,status:"error",message:"Não foi encontrado um modelo ativo para este evento."};
 const values:Record<string,string>={
  nome:order.customer_name||"Cliente",produto:product.name,valor:currency(Number(order.amount_cents??0)),
  forma_pagamento:"PIX (simulado)",situacao_encontro:"Informação ilustrativa de participação no encontro."
 };
 const subject="[SIMULAÇÃO — NÃO É UMA COMPRA] "+render(template.subject,values);
 const body=render(template.body,values);
 const preview={recipient:email,customer:values.nome,product:product.name,model:template.name,subject,body,scenario};
 if(mode==="preview")return {status:"preview",message:flow+". Confira os dados e confirme se deseja enviar um único e-mail de simulação.",...preview};
 if(form.get("confirm")!=="yes")return {status:"error",message:"Marque a confirmação antes de enviar.",...preview};
 // O único destino permitido é o endereço de um pedido existente, conferido acima.
 // Não há mutação nem chamada a provedores financeiros.
 const host=process.env.SMTP_HOST,user=process.env.SMTP_USER,pass=process.env.SMTP_PASS;
 if(!host||!user||!pass)return {...initial,status:"error",message:"SMTP não configurado na Torre."};
 const port=Number(process.env.SMTP_PORT||"465");
 const transport=nodemailer.createTransport({host,port,secure:(process.env.SMTP_SECURE||String(port===465))==="true",auth:{user,pass}});
 const fromEmail=process.env.SMTP_FROM_EMAIL||user;
 const fromName=(process.env.SMTP_FROM_NAME||"Diana Voltolini").replace(/["\r\n]/g,"");
 const button=event==="charge_generated"?"Ver cobrança":"Acessar minha compra";
 const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head>
 <body style="margin:0;padding:20px;background:#f4f6f8;font-family:Arial,sans-serif;color:#405266">
 <div style="max-width:620px;margin:auto;background:white;border:1px solid #dce4ec;border-radius:9px;overflow:hidden">
 <div style="text-align:center;border-top:4px solid #c9a227;padding:20px"><img src="https://app.dianavoltolini.com.br/brand/logo-light.png" width="175" alt="Diana Voltolini" style="max-width:80%;height:auto"></div>
 <div style="padding:28px 30px"><h1 style="font:700 23px Georgia,serif;color:#102033">${esc(subject)}</h1><div style="white-space:pre-line;line-height:1.75">${esc(body)}</div>
 <p style="text-align:center;margin:26px 0"><span style="display:inline-block;background:#c9a227;color:#102033;padding:13px 19px;border-radius:6px;font-weight:bold">${esc(button)} (demonstração, sem link)</span></p>
 <p style="color:#9a3412;font-size:12px"><strong>SIMULAÇÃO:</strong> nenhuma cobrança, venda, baixa financeira ou liberação de acesso foi realizada.</p></div>${htmlFooter}</div></body></html>`;
 try{
  await transport.sendMail({from:'"'+fromName+'" <'+fromEmail+'>',to:email,subject,html,
   text:body+"\n\n"+button+" (demonstração, sem link)\n\nSIMULAÇÃO: nenhuma cobrança, venda ou pagamento foi realizado.\nDiana Voltolini — Especialista em Faturamento e Inteligência Fiscal."});
 }catch(error){console.error("[email simulation] SMTP failure",error);return {...initial,status:"error",message:"Falha no envio SMTP de teste.",...preview};}
 return {status:"sent",message:"Um e-mail de simulação foi enviado para o cadastro informado. Nenhum dado financeiro foi modificado.",...preview};
}
