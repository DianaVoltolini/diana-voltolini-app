"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
export async function updateSuggestion(data:FormData){
 await requireAdmin();
 const id=String(data.get("id")??"");
 const status=String(data.get("status")??"");
 const url=String(data.get("published_url")??"").trim();
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||
   !["pending","approved","planned","published","rejected"].includes(status)||
   url.length>350||Boolean(url&&!(/^\/blog\/[a-z0-9-]+$/.test(url)||/^https:\/\/(app\.)?dianavoltolini\.com\.br\/[a-zA-Z0-9/_-]+$/.test(url))))
   redirect("/torre/sugestoes?erro=validacao");
 if(status==="published"&&!url)redirect("/torre/sugestoes?erro=link");
 const {error}=await getSupabaseAdmin().from("fiscal_content_suggestions")
  .update({status,published_url:url||null,updated_at:new Date().toISOString()}).eq("id",id);
 if(error){console.error("[suggestions] moderation error",{code:error.code,message:error.message});redirect("/torre/sugestoes?erro=salvar");}
 revalidatePath("/torre/sugestoes");
 redirect("/torre/sugestoes?ok=1");
}
