"use server";
// app/torre/auditoria/actions.ts
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const home="/torre/auditoria";
const statuses=["pendente","em_andamento","bloqueada","concluida","validada"];
const priorities=["critica","alta","media","baixa"];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const field=(data:FormData,key:string,max:number)=>String(data.get(key)??"").trim().slice(0,max+1);
const fail=(reason:string):never=>redirect(home+"?erro="+reason);
const reload=()=>{revalidatePath(home);redirect(home+"?salvo=1");};

export async function saveAuditTask(data:FormData){
 await requireAdmin();
 const id=field(data,"id",36), area=field(data,"area",100), title=field(data,"title",180);
 const priority=field(data,"priority",20), status=field(data,"status",20);
 const description=field(data,"description",3000), notes=field(data,"notes",3000);
 const due=field(data,"due_date",10);
 if((id&&!uuid.test(id))||area.length<2||area.length>100||title.length<3||title.length>180||
    !priorities.includes(priority)||!statuses.includes(status)||
    description.length>3000||notes.length>3000||
    (due&&!/^\d{4}-\d{2}-\d{2}$/.test(due))) return fail("validacao");
 const db=getSupabaseAdmin();
 const base={area,title,description:description||null,priority,status,
  due_date:due||null,notes:notes||null,updated_at:new Date().toISOString()};
 if(id){
  const {data:previous,error:lookupError}=await db.from("torre_audit_tasks")
    .select("id,status,completed_at,validated_at").eq("id",id).maybeSingle();
  if(lookupError||!previous) return fail("nao_encontrada");
  const now=new Date().toISOString();
  const {error}=await db.from("torre_audit_tasks").update({
    ...base,
    completed_at:status==="concluida"||status==="validada" ? previous.completed_at??now : null,
    validated_at:status==="validada"?previous.validated_at??now:null,
  }).eq("id",id);
  if(error) return fail("salvar");
 }else{
  const now=new Date().toISOString();
  const {error}=await db.from("torre_audit_tasks").insert({
   ...base,
   completed_at:status==="concluida"||status==="validada"?now:null,
   validated_at:status==="validada"?now:null,
  });
  if(error) return fail("salvar");
 }
 reload();
}

export async function addAuditChecklistItem(data:FormData){
 await requireAdmin();
 const taskId=field(data,"task_id",36),title=field(data,"title",240);
 if(!uuid.test(taskId)||title.length<3||title.length>240) return fail("validacao");
 const db=getSupabaseAdmin();
 const {data:task}=await db.from("torre_audit_tasks").select("id").eq("id",taskId).maybeSingle();
 if(!task) return fail("nao_encontrada");
 const {error}=await db.from("torre_audit_checklist").insert({task_id:taskId,title});
 if(error) return fail("salvar");
 revalidatePath(home);
 redirect(home+"?tarefa="+taskId+"&salvo=1");
}

export async function toggleAuditChecklistItem(data:FormData){
 await requireAdmin();
 const taskId=field(data,"task_id",36),id=field(data,"item_id",36);
 if(!uuid.test(taskId)||!uuid.test(id)) return fail("validacao");
 const db=getSupabaseAdmin();
 const {data:item,error:readError}=await db.from("torre_audit_checklist")
  .select("id,is_done").eq("id",id).eq("task_id",taskId).maybeSingle();
 if(readError||!item) return fail("nao_encontrada");
 const done=!item.is_done;
 const {error}=await db.from("torre_audit_checklist")
  .update({is_done:done,completed_at:done?new Date().toISOString():null})
  .eq("id",id).eq("task_id",taskId);
 if(error) return fail("salvar");
 revalidatePath(home);
 redirect(home+"?tarefa="+taskId);
}

export async function removeAuditChecklistItem(data:FormData){
 await requireAdmin();
 const taskId=field(data,"task_id",36),id=field(data,"item_id",36);
 if(!uuid.test(taskId)||!uuid.test(id)) return fail("validacao");
 const db=getSupabaseAdmin();
 const {error}=await db.from("torre_audit_checklist").delete().eq("id",id).eq("task_id",taskId);
 if(error) return fail("salvar");
 revalidatePath(home);
 redirect(home+"?tarefa="+taskId);
}
