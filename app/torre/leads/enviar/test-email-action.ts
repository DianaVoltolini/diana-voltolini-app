"use server";
import {requireAdmin} from "@/lib/auth/require-admin";
import {sendMarketingTest} from "@/lib/marketing/email-test";
export type TestEmailResult={ok:boolean;message:string};
export async function sendTestEmail(_prev:TestEmailResult,form:FormData):Promise<TestEmailResult>{
 await requireAdmin();
 const to=String(form.get("to")??"").trim().toLowerCase();
 const subject=String(form.get("subject")??"").trim();
 const body=String(form.get("body")??"").trim();
 const confirmed=form.get("confirmed")==="yes";
 if(!confirmed)return {ok:false,message:"Confirme o envio individual de teste."};
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)||to.length>254)return {ok:false,message:"Informe um endereço de e-mail válido."};
 if(!subject||subject.length>180||!body||body.length>14000)return {ok:false,message:"Informe assunto e mensagem válidos."};
 try{
  await sendMarketingTest(to,subject.replaceAll("{{nome}}","Diana"),body.replaceAll("{{nome}}","Diana"));
  return {ok:true,message:"Mensagem aceita pelo servidor SMTP para "+to+". Confira o recebimento e a pasta de spam."};
 }catch{
  return {ok:false,message:"Falha no envio de teste. Confira as variáveis SMTP e os logs do servidor, sem expor credenciais."};
 }
}
