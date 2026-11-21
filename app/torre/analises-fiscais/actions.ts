"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function read(form:FormData,key:string,max=10000){
 return String(form.get(key)??"").trim().slice(0,max+1);
}
function parseCents(value:string):number|null{
 const match=value.replace(/\s/g,"").match(/^(?:R\$)?([1-9]\d{0,6})(?:[.,](\d{1,2}))?$/i);
 if(!match)return null;
 const cents=Number(match[1])*100+Number((match[2]??"").padEnd(2,"0"));
 return Number.isSafeInteger(cents)&&cents>0&&cents<=100000000?cents:null;
}
function fail(id:string,code:string):never{
 redirect(`/torre/analises-fiscais/${id}?erro=${encodeURIComponent(code)}`);
}
/** Salva apenas rascunhos. Envio, aceite e checkout exigem rotas separadas. */
export async function saveFiscalAnalysisQuoteDraft(form:FormData){
 const {userId}=await requireAdmin();
 const requestId=read(form,"request_id",36);
 const scope=read(form,"scope");
 const notes=read(form,"notes",3000);
 const amountCents=parseCents(read(form,"amount",30));
 const days=Number(read(form,"delivery_business_days",5));
 const validity=read(form,"valid_until",10);
 if(!uuid.test(requestId))redirect("/torre/analises-fiscais?erro=solicitacao");
 if(scope.length<10||scope.length>10000||notes.length>3000||amountCents===null||
    !Number.isSafeInteger(days)||days<1||days>90||!/^\d{4}-\d{2}-\d{2}$/.test(validity)){
  fail(requestId,"validacao");
 }
 const [year,month,day]=validity.split("-").map(Number);
 const calendarCheck=new Date(Date.UTC(year,month-1,day));
 if(calendarCheck.getUTCFullYear()!==year||calendarCheck.getUTCMonth()!==month-1||
    calendarCheck.getUTCDate()!==day)fail(requestId,"data_invalida");
 const validUntil=new Date(`${validity}T23:59:59-03:00`);
 if(!(validUntil.getTime()>Date.now()))fail(requestId,"validade_expirada");
 const db=getSupabaseAdmin();
 const {data:request,error:lookupError}=await db.from("fiscal_analysis_requests")
  .select("id,status").eq("id",requestId).maybeSingle();
 if(lookupError||!request)fail(requestId,"solicitacao");
 if(!["received","awaiting_details","quoting"].includes(request.status))fail(requestId,"situacao");

 const {data:quotes,error:quotesError}=await db.from("fiscal_analysis_quotes")
  .select("id,version,status").eq("request_id",requestId).order("version",{ascending:false}).limit(10);
 if(quotesError)fail(requestId,"consulta_orcamentos");
 const latest=quotes?.[0];
 const active=quotes?.some(q=>q.status==="sent"||q.status==="accepted");
 if(active)fail(requestId,"proposta_ativa");
 const now=new Date().toISOString();
 const fields={
  scope,notes:notes||null,amount_cents:amountCents,delivery_business_days:days,
  valid_until:validUntil.toISOString(),updated_at:now
 };
 let quoteId:string|null=null;
 if(latest?.status==="draft"){
  const {data,error}=await db.from("fiscal_analysis_quotes")
   .update(fields).eq("id",latest.id).eq("status","draft").select("id").maybeSingle();
  if(error||!data)fail(requestId,"salvar");
  quoteId=data.id;
 }else{
  const version=(latest?.version??0)+1;
  const {data,error}=await db.from("fiscal_analysis_quotes")
   .insert({...fields,request_id:requestId,version,status:"draft"})
   .select("id").single();
  if(error||!data)fail(requestId,error?.code==="23505"?"conflito":"salvar");
  quoteId=data.id;
 }
 if(request.status!=="quoting"){
  const {error}=await db.from("fiscal_analysis_requests")
   .update({status:"quoting",updated_at:now}).eq("id",requestId)
   .in("status",["received","awaiting_details"]);
  if(error)fail(requestId,"atualizar_situacao");
 }
 const {error:eventError}=await db.from("fiscal_analysis_events").insert({
  request_id:requestId,actor_user_id:userId,event_type:"quote_draft_saved",
  detail:{quote_id:quoteId,amount_cents:amountCents,delivery_business_days:days}
 });
 if(eventError)console.error("[fiscal-analysis] Failed to audit draft",eventError.code);
 revalidatePath("/torre/analises-fiscais");
 revalidatePath(`/torre/analises-fiscais/${requestId}`);
 redirect(`/torre/analises-fiscais/${requestId}?salvo=1`);
}
