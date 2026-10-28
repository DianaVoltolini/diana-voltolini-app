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
 if(!name||!subject||!body)redirect("/torre/modelos-email?erro=campos");
 const db=getSupabaseAdmin();
 const payload={name,subject,body,kind,active:f.get("active")==="yes",updated_at:new Date().toISOString()};
 const {error}=id?await db.from("marketing_email_templates").update(payload).eq("id",id):await db.from("marketing_email_templates").insert(payload);
 if(error)redirect("/torre/modelos-email?erro=salvar");
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
