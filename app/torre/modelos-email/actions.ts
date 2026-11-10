"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
const value=(f:FormData,k:string,max:number)=>String(f.get(k)||"").trim().slice(0,max);
export async function saveEmailTemplate(f:FormData){
 await requireAdmin();
 const id=value(f,"id",50),name=value(f,"name",120),subject=value(f,"subject",180),body=value(f,"body",14000);
 const kind=value(f,"kind",20)==="welcome"?"welcome":"manual";
 const audience_kind=value(f,"audience_kind",20)==="buyers"?"buyers":"leads";
 const description=value(f,"description",500),interest=value(f,"interest",120),landing_id=value(f,"landing_id",50),cta_label=value(f,"cta_label",80),cta_url=value(f,"cta_url",300);
 const allowed=["https://dianavoltolini.com.br/blog","https://dianavoltolini.com.br/ibs-cbs-na-pratica","https://dianavoltolini.com.br/diagnostico-ibs-cbs","https://dianavoltolini.com.br/fiscal-na-pratica","https://dianavoltolini.com.br/produtos","https://dianavoltolini.com.br"];
 if(!allowed.includes(cta_url)||!cta_label)redirect("/torre/modelos-email/editor?erro=cta");
 if(!name||!subject||!body)redirect("/torre/modelos-email/editor?erro=campos");
 const db=getSupabaseAdmin();
 const auto_enabled=f.get("auto_enabled")==="yes",auto_include_existing=f.get("auto_include_existing")==="yes";
 if(auto_enabled&&kind!=="welcome"&&!landing_id)redirect("/torre/modelos-email/editor?erro=landing");
 const existingTemplate=id?await db.from("marketing_email_templates").select("auto_enabled,auto_activated_at").eq("id",id).maybeSingle():{data:null};
 const auto_activated_at=auto_enabled?(existingTemplate.data?.auto_enabled?existingTemplate.data.auto_activated_at??new Date().toISOString():new Date().toISOString()):null;
 const payload={audience_kind,auto_activated_at,auto_enabled,auto_include_existing:auto_enabled&&auto_include_existing,name,description:description||null,subject,body,kind,interest:interest||null,landing_id:landing_id||null,cta_label,cta_url,active:f.get("active")==="yes",updated_at:new Date().toISOString()};
 const {error}=id?await db.from("marketing_email_templates").update(payload).eq("id",id):await db.from("marketing_email_templates").insert(payload);
 if(error)redirect("/torre/modelos-email/editor?erro=salvar");
 revalidatePath("/torre/modelos-email");redirect("/torre/modelos-email?salvo=1");
}
export async function saveEmailDraft(f:FormData){
 await requireAdmin();
 const id=value(f,"id",50),subject=value(f,"subject",180),body=value(f,"body",14000),interest=value(f,"interest",120),template_id=value(f,"template_id",50),landing_id=value(f,"landing_id",50);
 if(!subject||!body)redirect("/torre/leads/enviar?erro=campos");
 const payload={subject,body,interest:interest||null,template_id:template_id||null,landing_id:landing_id||null};
 const db=getSupabaseAdmin();
 const {error}=id?await db.from("marketing_email_campaigns").update(payload).eq("id",id).eq("status","draft"):await db.from("marketing_email_campaigns").insert({...payload,status:"draft"});
 if(error)redirect("/torre/leads/enviar?erro=salvar");
 revalidatePath("/torre/leads/enviar");
 redirect("/torre/leads/enviar?salvo=1");
}

export async function deleteEmailDraft(f:FormData){
 await requireAdmin();
 const id=value(f,"id",50);
 if(!/^[0-9a-f-]{36}$/i.test(id))redirect("/torre/leads/enviar?erro=excluir");
 const {error}=await getSupabaseAdmin().from("marketing_email_campaigns").delete().eq("id",id).eq("status","draft");
 if(error)redirect("/torre/leads/enviar?erro=excluir");
 revalidatePath("/torre/leads/enviar");
 redirect("/torre/leads/enviar?excluido=1");
}

/** Exclui somente modelos sem histórico, campanhas ou automatização ativa. */
export async function deleteEmailTemplate(f:FormData){
 await requireAdmin();
 const id=value(f,"id",50);
 const back="/torre/modelos-email";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  redirect(back+"?erro=excluir");
 // Referência fixa dos avisos de Blog: usada pela função SQL de enfileiramento.
 if(id.toLowerCase()==="b10b0000-0000-4000-8000-000000000001")
  redirect(back+"?erro=protegido");
 const db=getSupabaseAdmin();
 const {data:model,error:modelError}=await db.from("marketing_email_templates")
  .select("id,auto_enabled").eq("id",id).maybeSingle();
 if(modelError||!model)redirect(back+"?erro=excluir");
 if(model.auto_enabled)redirect(back+"?erro=automatico");
 // Uma campanha/entrega histórica jamais deve desaparecer com seu modelo.
 const results=await Promise.all([
  db.from("marketing_manual_sends").select("id").eq("template_id",id).limit(1),
  db.from("marketing_email_deliveries").select("id").eq("template_id",id).limit(1),
  db.from("marketing_email_campaigns").select("id").eq("template_id",id).limit(1)
 ]);
 if(results.some(r=>r.error))redirect(back+"?erro=excluir");
 if(results.some(r=>(r.data??[]).length>0))redirect(back+"?erro=vinculado");
 const {data:deleted,error:deleteError}=await db.from("marketing_email_templates")
  .delete().eq("id",id).select("id").maybeSingle();
 if(deleteError||!deleted)redirect(back+"?erro=excluir");
 revalidatePath(back);
 redirect(back+"?excluido=1");
}
