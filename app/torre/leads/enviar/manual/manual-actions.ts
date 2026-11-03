"use server";
// app/torre/leads/enviar/manual/manual-actions.ts
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
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
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||seen.has(email)||blocked.has(email))continue;
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

  // A confirmacao apenas registra a fila: nao envia SMTP na requisição do navegador.
  const {data:queued,error:queueError}=await db.rpc("enqueue_marketing_manual_campaign",{
    p_send_id:sendId,p_template_id:templateId,p_description:description,
    p_interest:interest||null,p_landing_id:landing||null,
    p_recipients:leads.map(lead=>({email:lead.email,name:lead.name??""}))
  });
  if(queueError){
    console.error("[marketing queue] Falha ao criar campanha",{code:queueError.code,message:queueError.message});
    return {...initialManualState,stage:"error",message:"Não foi possível registrar a fila. Confira o histórico antes de tentar novamente."};
  }
  return {stage:"done",message:"Campanha adicionada à fila. O processamento ocorrerá pela rotina agendada. Consulte Resultados das campanhas.",eligible:leads.length,sent:0,failed:0,sendId};
 }catch(error){console.error("Erro ao processar envio manual",error);return {...initialManualState,stage:"error",message:"Falha ao consultar ou processar a campanha. Consulte os registros antes de tentar novamente."};}
}
