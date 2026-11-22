"use server";

import {randomUUID} from "node:crypto";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {FISCAL_ACTIVE_STATUSES,FISCAL_ALLOWED_TYPES,FISCAL_FILES_BUCKET,FISCAL_MAX_FILE_BYTES,fiscalUuid,getFiscalClientRequest} from "@/lib/fiscal/analysis-service";

type Role="admin"|"client";
const adminPath=(id:string)=>"/torre/analises-fiscais/"+id;
const clientPath=(id:string)=>"/painel/analises-fiscais/"+id;
const route=(role:Role,id:string)=>role==="admin"?adminPath(id):clientPath(id);
function fail(role:Role,id:string,code:string):never{
 redirect(route(role,id)+"?erro="+encodeURIComponent(code));
}
async function access(role:Role,id:string){
 if(!fiscalUuid(id))throw new Error("Solicitação inválida");
 if(role==="admin"){
  const {userId}=await requireAdmin();
  const db=getSupabaseAdmin();
  const {data,error}=await db.from("fiscal_analysis_requests").select("id,status,paid_at").eq("id",id).maybeSingle();
  if(error||!data)throw new Error("Solicitação não encontrada");
  return {userId,request:data};
 }
 const found=await getFiscalClientRequest(id);
 if(!found)throw new Error("Acesso não autorizado");
 return {userId:found.uid,request:found.request};
}
function refresh(id:string){
 revalidatePath(adminPath(id));
 revalidatePath(clientPath(id));
 revalidatePath("/torre/analises-fiscais");
 revalidatePath("/painel/analises-fiscais");
}
async function postMessage(role:Role,form:FormData){
 const id=String(form.get("request_id")??"");
 const body=String(form.get("body")??"").trim();
 if(!fiscalUuid(id))redirect(role==="admin"?"/torre/analises-fiscais":"/painel/analises-fiscais");
 const {userId,request}=await access(role,id);
 if(body.length<1||body.length>10000)fail(role,id,"mensagem");
 if(!request.paid_at||!FISCAL_ACTIVE_STATUSES.includes(request.status as typeof FISCAL_ACTIVE_STATUSES[number]))fail(role,id,"situacao");
 const db=getSupabaseAdmin();
 const {error}=await db.from("fiscal_analysis_messages").insert({
  request_id:id,sender_role:role,sender_user_id:userId,body,visible_to_client:true
 });
 if(error)fail(role,id,"salvar_mensagem");
 await db.from("fiscal_analysis_events").insert({request_id:id,actor_user_id:userId,event_type:"service_message_sent",detail:{sender_role:role}})
  .then(({error})=>{if(error)console.error("[fiscal-service] Event",error.code)});
 refresh(id);
 redirect(route(role,id)+"?mensagem=1");
}
export async function sendFiscalAdminMessage(form:FormData){return postMessage("admin",form);}
export async function sendFiscalClientMessage(form:FormData){return postMessage("client",form);}

export async function updateFiscalServiceStatus(form:FormData){
 const id=String(form.get("request_id")??"");
 if(!fiscalUuid(id))redirect("/torre/analises-fiscais");
 const {userId,request}=await access("admin",id);
 const target=String(form.get("status")??"");
 const transitions:Record<string,string[]>={
  paid:["in_progress","awaiting_client"],
  in_progress:["awaiting_client","completed"],
  awaiting_client:["in_progress","completed"]
 };
 if(!request.paid_at||!transitions[request.status]?.includes(target))fail("admin",id,"transicao");
 const now=new Date().toISOString(),db=getSupabaseAdmin();
 const {data,error}=await db.from("fiscal_analysis_requests").update({
  status:target,updated_at:now,...(target==="completed"?{completed_at:now}:{})
 }).eq("id",id).eq("status",request.status).not("paid_at","is",null).select("id").maybeSingle();
 if(error||!data)fail("admin",id,"conflito");
 await db.from("fiscal_analysis_events").insert({request_id:id,actor_user_id:userId,event_type:"service_status_changed",detail:{from:request.status,to:target}})
  .then(({error})=>{if(error)console.error("[fiscal-service] Event",error.code)});
 refresh(id);
 redirect(adminPath(id)+"?situacao=1");
}
async function upload(role:Role,form:FormData){
 const id=String(form.get("request_id")??"");
 if(!fiscalUuid(id))redirect(role==="admin"?"/torre/analises-fiscais":"/painel/analises-fiscais");
 const {userId,request}=await access(role,id);
 if(!request.paid_at||!FISCAL_ACTIVE_STATUSES.includes(request.status as typeof FISCAL_ACTIVE_STATUSES[number]))fail(role,id,"situacao");
 const file=form.get("document");
 if(!(file instanceof File)||!file.size||file.size>FISCAL_MAX_FILE_BYTES)fail(role,id,"arquivo");
 const ext=FISCAL_ALLOWED_TYPES.get(file.type);
 if(!ext)fail(role,id,"tipo");
 const visible=role==="client"||form.get("visible_to_client")==="yes";
 const path=id+"/"+randomUUID()+"."+ext;
 const db=getSupabaseAdmin();
 const {error:storageError}=await db.storage.from(FISCAL_FILES_BUCKET)
  .upload(path,await file.arrayBuffer(),{contentType:file.type,upsert:false});
 if(storageError)fail(role,id,"storage");
 const {error}=await db.from("fiscal_analysis_attachments").insert({
  request_id:id,storage_path:path,original_filename:file.name.slice(0,240)||"documento."+ext,
  media_type:file.type,size_bytes:file.size,uploaded_by_role:role,
  visible_to_client:visible
 });
 if(error){
  await db.storage.from(FISCAL_FILES_BUCKET).remove([path]);
  fail(role,id,"salvar_arquivo");
 }
 await db.from("fiscal_analysis_events").insert({
  request_id:id,actor_user_id:userId,event_type:"service_file_uploaded",
  detail:{uploaded_by_role:role,visible_to_client:visible}
 }).then(({error})=>{if(error)console.error("[fiscal-service] Event",error.code)});
 refresh(id);
 redirect(route(role,id)+"?arquivo=1");
}
export async function uploadFiscalAdminFile(form:FormData){return upload("admin",form);}
export async function uploadFiscalClientFile(form:FormData){return upload("client",form);}
