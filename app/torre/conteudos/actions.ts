"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const categories = new Set(["Reforma Tributária","NF-e e Faturamento","Tributos na Prática","Sistemas e Parametrização","Obrigações e Prazos"]);
export async function saveFiscalArticle(data: FormData) {
  await requireAdmin();
  const read = (key: string, max: number) => String(data.get(key) ?? "").trim().slice(0,max);
  const id=read("id",40);
  const title=read("title",180),slug=read("slug",160).toLowerCase();
  const summary=read("summary",600),body=read("body",60000);
  const category=read("category",80),visibility=read("visibility",30),status=read("status",30);
  const source_links=read("source_links",4000);
  if (!title || !summary || !body || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !categories.has(category) || !["public","subscriber"].includes(visibility) || !["draft","published"].includes(status)) {
    redirect("/torre/conteudos?erro=dados");
  }
  const db=getSupabaseAdmin();
  const payload={ title,slug,summary,body,category,visibility,status,source_links,
    updated_at:new Date().toISOString() };
  if (id) {
    const {error}=await db.from("fiscal_articles").update(payload).eq("id",id);
    if(error) redirect("/torre/conteudos?erro=salvar");
  } else {
    const {error}=await db.from("fiscal_articles").insert({...payload,published_at:status==="published"?new Date().toISOString():null});
    if(error) redirect("/torre/conteudos?erro=salvar");
  }
  revalidatePath("/torre/conteudos");
  redirect("/torre/conteudos?salvo=1");
}
