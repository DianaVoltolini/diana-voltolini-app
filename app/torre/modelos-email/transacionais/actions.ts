"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import nodemailer from "nodemailer";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

const IDS=[
 "eb0c0000-0000-4000-8000-000000000001",
 "eb0c0000-0000-4000-8000-000000000002",
 "eb0c0000-0000-4000-8000-000000000011",
 "eb0c0000-0000-4000-8000-000000000012",
];
const back="/torre/modelos-email";
const clean=(form:FormData,key:string,max:number)=>String(form.get(key)??"").trim().slice(0,max);
function allowed(id:string){return IDS.includes(id);}
export async function saveTransactionalEmail(form:FormData){
 await requireAdmin();
 const id=clean(form,"id",50),subject=clean(form,"subject",180),body=clean(form,"body",14000);
 if(!allowed(id)||!subject||!body)redirect(back+"?erro=campos");
 const {data,error}=await getSupabaseAdmin().from("marketing_email_templates")
 .update({subject,body,updated_at:new Date().toISOString()})
 .eq("id",id).eq("kind","transactional").select("id").maybeSingle();
 if(error||!data)redirect(back+"?erro=salvar");
 revalidatePath(back);
 redirect(back+"?salvo=1");
}
export async function sendTransactionalTest(form:FormData){
 await requireAdmin();
 const id=clean(form,"id",50);
 const to=clean(form,"test_email",254);
 if(!allowed(id)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)||form.get("confirm")!=="yes")
  redirect(back+"?erro=teste");
 const {data,error}=await getSupabaseAdmin().from("marketing_email_templates")
 .select("subject,body,event_key").eq("id",id).eq("kind","transactional").maybeSingle();
 if(error||!data)redirect(back+"?erro=teste");
 const variables:Record<string,string>={
  "{{nome}}":"Cliente Teste","{{valor}}":"R$ 29,90","{{forma_pagamento}}":"PIX",
  "{{situacao_encontro}}":"Sua inscrição no encontro está confirmada.",
  "{{produto}}":"Produto de Teste",
 };
 const render=(value:string)=>Object.entries(variables).reduce((s,[k,v])=>s.replaceAll(k,v),value);
 const subject="[TESTE] "+render(data.subject);
 const body=render(data.body);
 const port=Number(process.env.SMTP_PORT||"465");
 const user=process.env.SMTP_USER,pass=process.env.SMTP_PASS,host=process.env.SMTP_HOST;
 if(!user||!pass||!host)redirect(back+"?erro=smtp");
 const mail=nodemailer.createTransport({host,port,secure:(process.env.SMTP_SECURE||String(port===465))==="true",auth:{user,pass}});
 const from=process.env.SMTP_FROM_EMAIL||user;
 const display=(process.env.SMTP_FROM_NAME||"Diana Voltolini").replace(/["\\r\\n]/g,"");
 const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
 const isCharge=data.event_key==="ebook_charge_generated"||data.event_key==="default_charge_generated";
 // A prévia é visual e isolada: botão demonstrativo sem link para cobrança real.
 const buttonLabel=isCharge?"Ver cobrança":"Acessar minha compra";
 const logoUrl="https://app.dianavoltolini.com.br/brand/logo-light.png";
 const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head>
 <body style="margin:0;padding:20px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#405266">
 <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #dce4ec;border-radius:9px;overflow:hidden">
 <div style="text-align:center;border-top:4px solid #c9a227;padding:20px;background:#fff">
 <img src="${logoUrl}" alt="Diana Voltolini" width="175" style="max-width:80%;height:auto;border:0;display:inline-block" />
 </div>
 <div style="padding:28px 30px"><h1 style="font:700 24px/1.35 Georgia,serif;color:#102033;margin:0 0 20px">${escape(subject)}</h1>
 <div style="white-space:pre-line;line-height:1.75;font-size:14px">${escape(body)}</div>
 <p style="text-align:center;margin:28px 0"><span style="display:inline-block;background:#c9a227;padding:13px 19px;border-radius:6px;font-size:14px;font-weight:bold;color:#102033">${escape(buttonLabel)} (demonstração)</span></p>
 <p style="font-size:12px;color:#647381">Esta é uma prévia de teste. Nenhuma compra, cobrança ou confirmação de pagamento foi realizada.</p>
 </div>
 <div style="padding:22px 26px;border-top:1px solid #e1e7ed;text-align:center;background:#f7f9fb;color:#607184;font-size:11px;line-height:1.6">
 <strong style="color:#102033">Diana Voltolini</strong>
 <p style="margin:8px 0">Especialista em Faturamento e Inteligência Fiscal</p>
 <p style="margin:8px 0">Esta é uma comunicação referente à sua compra.</p>
 </div></div></body></html>`;
 try {
  await mail.sendMail({from:'"'+display+'" <'+from+'>',to,subject,
   text:body+"\\n\\n"+buttonLabel+" (demonstração — botão sem link)\\n\\nEsta é uma prévia de teste. Nenhuma compra, cobrança ou confirmação de pagamento foi realizada.\\n\\nDiana Voltolini — Especialista em Faturamento e Inteligência Fiscal.\\nEsta é uma comunicação referente à sua compra.",
   html
  });
 }catch{redirect(back+"?erro=smtp");}
 redirect("/torre/modelos-email/editor?editar="+encodeURIComponent(id)+"&teste=1");
}
