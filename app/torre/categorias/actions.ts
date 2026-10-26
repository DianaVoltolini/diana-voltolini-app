"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
const go="/torre/categorias";
export async function createCategory(data:FormData){
 await requireAdmin();
 const name=String(data.get("name")??"").trim();
 if(name.length<2||name.length>80)redirect(go+"?erro=nome");
 const {error}=await getSupabaseAdmin().from("fiscal_categories").insert({name});
 if(error)redirect(go+"?erro=salvar");
 revalidatePath(go);revalidatePath("/torre/conteudos/editor");redirect(go+"?salvo=1");
}
export async function renameCategory(data:FormData){
 await requireAdmin();
 const id=String(data.get("id")??""),name=String(data.get("name")??"").trim();
 if(!/^[0-9a-f-]{36}$/i.test(id)||name.length<2||name.length>80)redirect(go+"?erro=nome");
 const {error}=await getSupabaseAdmin().from("fiscal_categories").update({name}).eq("id",id);
 if(error)redirect(go+"?erro=salvar");
 revalidatePath(go);revalidatePath("/torre/conteudos");revalidatePath("/torre/conteudos/editor");revalidatePath("/painel/assinatura");
 redirect(go+"?salvo=1");
}
export async function deleteCategory(data:FormData){
 await requireAdmin();
 const id=String(data.get("id")??"");
 if(!/^[0-9a-f-]{36}$/i.test(id))redirect(go+"?erro=excluir");
 const {error}=await getSupabaseAdmin().from("fiscal_categories").delete().eq("id",id);
 if(error)redirect(go+"?erro=emuso");
 revalidatePath(go);revalidatePath("/torre/conteudos/editor");redirect(go+"?excluido=1");
}
