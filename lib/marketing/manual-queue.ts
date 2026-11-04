import nodemailer from "nodemailer";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {renderNewsletterEmail} from "@/lib/marketing/email-test";

type Claimed={
 recipient_id:string;campaign_id:string;email:string;lead_name:string|null;
 unsubscribe_token:string;subject:string|null;body:string|null;
 cta_url:string|null;cta_label:string|null;
};
const normalize=(value:string)=>value.trim().toLowerCase();

export async function processManualCampaignQueue(){
 if(process.env.MARKETING_MANUAL_QUEUE_ENABLED!=="1")
   return {enabled:false,message:"Fila desativada",processed:0,accepted:0,failed:0,skipped:0};
 const host=process.env.SMTP_HOST,user=process.env.SMTP_USER,pass=process.env.SMTP_PASS,from=process.env.SMTP_FROM_EMAIL;
 if(!host||!user||!pass||!from)throw Error("SMTP não configurado");
 const db=getSupabaseAdmin();
 const transport=nodemailer.createTransport({
  host,port:Number(process.env.SMTP_PORT||587),
  secure:["1","true"].includes(process.env.SMTP_SECURE??""),
  auth:{user,pass},connectionTimeout:12000,greetingTimeout:12000,socketTimeout:20000
 });
 let processed=0,accepted=0,failed=0,skipped=0;
 const campaigns=new Set<string>();
 try{
  for(let i=0;i<10;i++){
   // Cada claim consome uma vaga no orçamento móvel de 24h ANTES de tocar no SMTP.
   // Um registro em sending com resultado incerto nunca volta automaticamente a pending.
   const {data:claimed,error:claimError}=await db.rpc("claim_marketing_manual_recipient",{p_max_24h:800});
   if(claimError)throw claimError;
   const item=(claimed?.[0]??null) as Claimed|null;
   if(!item)break;
   processed++;
   campaigns.add(item.campaign_id);
   async function setStatus(status:"accepted"|"failed"|"skipped",message?:string){
    const {error}=await db.from("marketing_manual_send_recipients").update({
     status,accepted_at:status==="accepted"?new Date().toISOString():null,
     error_message:message??null
    }).eq("id",item!.recipient_id).eq("status","sending");
    if(error)throw error;
   }
   try{
    const email=normalize(item.email);
    const [{data:unsub,error:unsubError},{data:landingLeads,error:leadsError},{data:newsletterLeads,error:newsletterError}]=await Promise.all([
     db.from("marketing_email_unsubscribes").select("email").ilike("email",email).maybeSingle(),
     db.from("marketing_leads").select("id").ilike("email",email).eq("newsletter_opt_in",true).limit(1),
     db.from("marketing_newsletter_subscribers").select("id").ilike("email",email).eq("newsletter_opt_in",true).limit(1)
    ]);
    if(unsubError||leadsError||newsletterError)throw Error("Falha ao verificar consentimento");
    if(unsub||(!landingLeads?.length&&!newsletterLeads?.length)){
     await setStatus("skipped","Descadastrado ou sem consentimento no momento do envio");
     skipped++;
     continue;
    }
    if(!item.subject||!item.body)throw Error("Modelo da campanha sem conteúdo");
    const name=(item.lead_name??"").trim().split(/\s+/)[0]??"";
    const subject=item.subject.replaceAll("{{nome}}",name);
    const plain=item.body.replaceAll("{{nome}}",name).replace(/\[BOTAO:[^\]]+\]/g,"").trim();
    const formatted=plain+(item.cta_url&&item.cta_label?"\n\n[BOTAO: "+item.cta_label+" | "+item.cta_url+"]":"");
    const unsubUrl="https://app.dianavoltolini.com.br/newsletter/descadastrar?token="+encodeURIComponent(item.unsubscribe_token);
    const result=await transport.sendMail({
     from:{name:process.env.SMTP_FROM_NAME||"Diana Voltolini",address:from},
     to:email,subject,html:renderNewsletterEmail(subject,formatted,unsubUrl),
     text:subject+"\n\n"+plain+"\n\nCancelar inscrição: "+unsubUrl,
     headers:{"List-Unsubscribe":"<"+unsubUrl+">"}
    });
    if(!result.accepted.some(address=>(typeof address==="string"?address:address.address).toLowerCase()===email))
     throw Error("SMTP não aceitou o destinatário");
    await setStatus("accepted");
    accepted++;
   }catch(error){
    // Se o SMTP respondeu de forma incerta, a tentativa e registrada e NAO sera reenviada automaticamente.
    const message=error instanceof Error?error.message.slice(0,350):"Falha ao processar";
    console.error("[marketing manual queue] Falha no destinatário",{recipientId:item.recipient_id,message});
    try{await setStatus("failed",message);failed++;}
    catch(updateError){console.error("[marketing manual queue] Resultado incerto; registro permanece sending",updateError);failed++;}
   }
  }
 }finally{transport.close()}
 for(const id of campaigns){
  const {data:remaining,error:remainingError}=await db.from("marketing_manual_send_recipients").select("id").eq("send_id",id).in("status",["pending","sending"]).limit(1);
  if(remainingError){console.error("[marketing manual queue] Falha ao finalizar campanha",remainingError);continue;}
  if(remaining?.length)continue;
  const {data:bad,error:badError}=await db.from("marketing_manual_send_recipients").select("id").eq("send_id",id).in("status",["failed","skipped"]).limit(1);
  if(badError)continue;
  await db.from("marketing_manual_sends").update({status:bad?.length?"partial":"completed"}).eq("id",id).eq("status","processing");
 }
 return {enabled:true,processed,accepted,failed,skipped};
}
