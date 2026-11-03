"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function saveFiscalArticle(data: FormData) {
  await requireAdmin();
  const read = (key: string, max: number) => String(data.get(key) ?? "").trim().slice(0,max);
  const id=read("id",40);
  const title=read("title",180),slug=read("slug",160).toLowerCase();
  const summary=read("summary",600),body=read("body",60000);
  const category=read("category",80),status=read("status",30);
  const source_links=read("source_links",4000);
  const delivery_type=read("delivery_type",30);
  const visibility=delivery_type==="geral"?"public":"subscriber";
  const seo_title=read("seo_title",180)||null, seo_description=read("seo_description",320)||null;
  if (!title || !summary || !body || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !category || !["draft","published"].includes(status) || !["geral","radar","oficina","biblioteca","checklist"].includes(delivery_type)) {
    redirect("/torre/conteudos?erro=dados");
  }
  const db=getSupabaseAdmin();
  const {data:validCategory,error:categoryError}=await db.from("fiscal_categories").select("id").eq("name",category).maybeSingle();
  if(categoryError||!validCategory)redirect("/torre/conteudos?erro=categoria");
  const {data:slugOwner,error:slugError}=await db.from("fiscal_articles").select("id").eq("slug",slug).maybeSingle();
  if(slugError){console.error("[fiscal_articles] Falha ao consultar slug",{code:slugError.code,message:slugError.message});redirect("/torre/conteudos?erro=salvar");}
  if(slugOwner&&slugOwner.id!==id)redirect("/torre/conteudos?erro=duplicado");
  const payload={ title,slug,summary,body,category,visibility,status,source_links,seo_title,seo_description,delivery_type,
    updated_at:new Date().toISOString() };
  const handleSaveError=(error:{code?:string;message?:string;details?:string;hint?:string})=>{
    console.error("[fiscal_articles] Falha ao salvar conteúdo",{code:error.code,message:error.message,details:error.details,hint:error.hint,editing:Boolean(id)});
    if(error.code==="23505") redirect("/torre/conteudos?erro=duplicado");
    if(error.code==="23503") redirect("/torre/conteudos?erro=referencia");
    if(error.code==="23514") redirect("/torre/conteudos?erro=restricao");
    if(error.code==="42703"||error.code==="PGRST204") redirect("/torre/conteudos?erro=estrutura");
    redirect("/torre/conteudos?erro=salvar");
  };
  if (id) {
    // Registrar a data de primeira publicação ao mudar de rascunho para publicado.
    const {data:existing,error:readError}=await db.from("fiscal_articles").select("status,published_at").eq("id",id).maybeSingle();
    if(readError||!existing)redirect("/torre/conteudos?erro=salvar");
    const published_at=status==="published" ? (existing.published_at??new Date().toISOString()) : existing.published_at;
    const {error}=await db.from("fiscal_articles").update({...payload,published_at}).eq("id",id);
    if(error) handleSaveError(error);
  } else {
    const {error}=await db.from("fiscal_articles").insert({...payload,published_at:status==="published"?new Date().toISOString():null});
    if(error) handleSaveError(error);
  }
  revalidatePath("/torre/conteudos");
  redirect("/torre/conteudos?salvo=1");
}

/** Atualização rápida de acesso e status, sem modificar o conteúdo editorial. */
export async function updateFiscalArticleQuick(data: FormData) {
  await requireAdmin();
  const id=String(data.get("id")??"");
  const status=String(data.get("status")??"");
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    || !["draft","published"].includes(status)) {
    redirect("/torre/conteudos?erro=dados");
  }
  const db=getSupabaseAdmin();
  const {data:existing,error:readError}=await db.from("fiscal_articles")
    .select("id,published_at,status,delivery_type").eq("id",id).maybeSingle();
  if(readError||!existing)redirect("/torre/conteudos?erro=salvar");
  const visibility=existing.delivery_type==="geral"?"public":"subscriber";
  const now=new Date().toISOString();
  const published_at=status==="published" ? (existing.published_at??now) : existing.published_at;
  const {error}=await db.from("fiscal_articles")
    .update({visibility,status,published_at,updated_at:now})
    .eq("id",id);
  if(error)redirect("/torre/conteudos?erro=salvar");
  revalidatePath("/torre/conteudos");
  revalidatePath("/painel/assinatura");
  redirect("/torre/conteudos?salvo=1");
}


/** Exclusão definitiva de um artigo fiscal, disponível somente a administradores. */
export async function deleteFiscalArticle(data: FormData) {
  await requireAdmin();
  const id = String(data.get("id") ?? "");
  const slug = String(data.get("slug") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    redirect("/torre/conteudos?erro=excluir");
  }
  const db = getSupabaseAdmin();
  const {data:deleted,error} = await db.from("fiscal_articles")
    .delete()
    .eq("id",id)
    .eq("slug",slug)
    .select("id,slug");
  if (error || deleted?.length !== 1) {
    redirect("/torre/conteudos?erro=excluir");
  }
  revalidatePath("/torre/conteudos");
  revalidatePath("/painel/assinatura");
  redirect("/torre/conteudos?excluido=1");
}
