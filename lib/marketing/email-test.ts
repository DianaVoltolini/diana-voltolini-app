// lib/marketing/email-test.ts
import nodemailer from "nodemailer";

const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]??char));
const safeUrl=(value:string)=>{try{const u=new URL(value);return u.protocol==="https:"&&(u.hostname==="dianavoltolini.com.br"||u.hostname==="www.dianavoltolini.com.br")?u.href:null}catch{return null}};
function renderBody(value:string){
 const marker=/\[BOTAO:\s*([^\]\n|]{1,80})\s*\|\s*(https:\/\/[^\]\s]+)\]/g;
 let out="",last=0;
 for(const m of value.matchAll(marker)){
  const start=m.index??0;
  out+=escapeHtml(value.slice(last,start)).replace(/\n/g,"<br>");
  const url=safeUrl(m[2]);
  out+=url?`<a href="${escapeHtml(url)}" style="display:inline-block;background:#c9a227;color:#102033;text-decoration:none;padding:13px 20px;border-radius:6px;font-weight:bold;margin:12px 0">${escapeHtml(m[1].trim())}</a>`:escapeHtml(m[0]);
  last=start+m[0].length;
 }
 return out+escapeHtml(value.slice(last)).replace(/\n/g,"<br>");
}
export function renderMarketingEmail(subject:string,body:string){
 const safeSubject=escapeHtml(subject);
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
 <body style="background:#f4f6f9;padding:28px 12px;font-family:Arial,sans-serif;color:#405266;margin:0">
 <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:650px;width:100%;margin:auto;background:#fff;border:1px solid #dfe5ea;border-collapse:separate;border-spacing:0">
 <tr><td style="border-top:4px solid #c9a227;padding:24px;text-align:center"><img src="https://app.dianavoltolini.com.br/brand/logo-light.png" alt="Diana Voltolini" width="185" style="width:185px;max-width:85%;height:auto"/></td></tr>
 <tr><td style="padding:20px 35px 35px"><h1 style="font-family:Georgia,serif;color:#102033;font-size:26px;line-height:1.3">${safeSubject}</h1><div style="font-size:15px;line-height:1.8;overflow-wrap:anywhere">${renderBody(body)}</div></td></tr>
 <tr><td style="border-top:1px solid #dfe5ea;background:#f7f9fb;text-align:center;padding:23px;font-size:12px;color:#607184"><strong>Diana Voltolini</strong><br>Faturamento e Inteligência Fiscal<br><br>Mensagem de teste do painel administrativo. Nenhuma campanha foi enviada.</td></tr>
 </table></body></html>`;
}
export async function sendMarketingTest(to:string,subject:string,body:string){
 const host=process.env.SMTP_HOST, user=process.env.SMTP_USER, pass=process.env.SMTP_PASS;
 const from=process.env.SMTP_FROM_EMAIL;
 const port=Number(process.env.SMTP_PORT||587);
 if(!host||!user||!pass||!from||!Number.isInteger(port)||port<1||port>65535)throw new Error("SMTP não configurado");
 const secure=process.env.SMTP_SECURE==="true"||process.env.SMTP_SECURE==="1";
 const transport=nodemailer.createTransport({host,port,secure,auth:{user,pass},connectionTimeout:12000,greetingTimeout:12000,socketTimeout:20000});
 try{
  const sent=await transport.sendMail({from:{name:process.env.SMTP_FROM_NAME||"Diana Voltolini",address:from},to,subject:"[TESTE] "+subject,html:renderMarketingEmail(subject,body),text:"[TESTE] "+subject+"\n\n"+body+"\n\nMensagem administrativa de teste."});
  if(!sent.accepted.some(address=>(typeof address==="string"?address:address.address).toLowerCase()===to.toLowerCase()))throw new Error("Destinatário não aceito pelo SMTP");
  return sent.messageId;
 }finally{transport.close()}
}

export function renderNewsletterEmail(subject:string,body:string,unsubscribeUrl:string){
 const base=renderMarketingEmail(subject,body);
 const footer='Você está recebendo esta mensagem porque autorizou a Newsletter Fiscal.<br><a href="'+escapeHtml(unsubscribeUrl)+'" style="color:#86650c;text-decoration:underline">Cancelar inscrição</a>';
 return base.replace("Mensagem de teste do painel administrativo. Nenhuma campanha foi enviada.",footer);
}
