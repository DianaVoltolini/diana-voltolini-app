"use server";
// app/torre/clientes/campanhas/actions.ts
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
export type CampaignState={stage:"initial"|"review"|"queued"|"error";message:string;count:number};
const initial:CampaignState={stage:"initial",message:"",count:0};
const uuid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const norm=(s:string)=>s.trim().toLowerCase();
type Audience={email:string;name:string};
async function buyerAudience(productId:string,status:string):Promise<Audience[]>{
 const db=getSupabaseAdmin();
 let query=db.from("orders").select("customer_email,customer_name").eq("status",status).order("created_at",{ascending:false}).limit(1000);
 if(productId!=="all")query=query.eq("product_id",productId);
 const [orders,leads,subscribers,unsubscribes]=await Promise.all([
  query,
  db.from("marketing_leads").select("email").eq("newsletter_opt_in",true).limit(3000),
  db.from("marketing_newsletter_subscribers").select("email").eq("newsletter_opt_in",true).limit(3000),
  db.from("marketing_email_unsubscribes").select("email").limit(3000)
 ]);
 for(const result of [orders,leads,subscribers,unsubscribes])if(result.error)throw result.error;
 const consent=new Set([...(leads.data??[]),...(subscribers.data??[])].map(r=>norm(r.email??"")));
 const blocked=new Set((unsubscribes.data??[]).map(r=>norm(r.email??"")));
 const recipients=new Map<string,Audience>();
 for(const row of orders.data??[]){
  const email=norm(row.customer_email??"");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!consent.has(email)||blocked.has(email))continue;
  if(!recipients.has(email))recipients.set(email,{email,name:row.customer_name??""});
 }
 return [...recipients.values()];
}
export async function buyerCampaignAction(_previous:CampaignState,form:FormData):Promise<CampaignState>{
 await requireAdmin();
 const db=getSupabaseAdmin();
 const templateId=String(form.get("template_id")??"");
 const productId=String(form.get("product_id")??"");
 const status=String(form.get("status")??"");
 const name=String(form.get("description")??"").trim().slice(0,300);
 const sendId=String(form.get("send_id")??"");
 const mode=String(form.get("mode")??"");
 if(!uuid(templateId)||!(productId==="all"||uuid(productId))||!["paid","pending"].includes(status)||!name)
  return {...initial,stage:"error",message:"Selecione o produto, a situação, o modelo e informe o nome da campanha."};
 const {data:model,error:err}=await db.from("marketing_email_templates").select("id").eq("id",templateId).eq("active",true).eq("kind","manual").eq("audience_kind","buyers").maybeSingle();
 if(err||!model)return {...initial,stage:"error",message:"Modelo para clientes não disponível."};
 try{
  const audience=await buyerAudience(productId,status);
  if(mode==="review")return {stage:"review",count:audience.length,message:audience.length?"Confira a prévia e confirme a campanha.":"Nenhum comprador com autorização de marketing foi encontrado."};
  if(mode!=="send"||form.get("confirm")!=="yes"||!uuid(sendId))
   return {...initial,stage:"error",message:"Confirmação inválida. Revise o público novamente."};
  if(!audience.length)return {...initial,stage:"error",message:"Não há destinatários autorizados."};
  const {error}=await db.rpc("enqueue_marketing_manual_campaign",{
   p_send_id:sendId,p_template_id:templateId,p_description:name,
   p_interest:null,p_landing_id:null,
   p_recipients:audience.map(r=>({email:r.email,name:r.name}))
  });
  if(error){console.error("[buyer campaign] erro na fila",error.code,error.message);return {...initial,stage:"error",message:"Não foi possível registrar a campanha. Consulte o histórico antes de tentar novamente."};}
  return {stage:"queued",count:audience.length,message:"Campanha adicionada à fila. Acompanhe o processamento em Resultados dos envios."};
 }catch(error){console.error("[buyer campaign] audience",error);return {...initial,stage:"error",message:"Falha ao consultar os compradores ou suas autorizações de marketing."};}
}
