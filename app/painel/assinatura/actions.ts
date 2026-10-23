"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function cancelFiscalSubscription(){
 const auth=await createClient();
 const {data,error}=await auth.auth.getClaims();
 const uid=typeof data?.claims?.sub==="string"?data.claims.sub:null;
 if(error||!uid)redirect("/login");
 const db=getSupabaseAdmin();
 // Desliga a renovação de todas as assinaturas ainda renováveis.
 // Não cancela cobranças existentes no Bling; isso deve ser implementado antes da venda real.
 const {error:updateError}=await db.from("fiscal_subscriptions")
 .update({renewal_enabled:false,cancellation_requested_at:new Date().toISOString(),updated_at:new Date().toISOString()})
 .eq("user_id",uid).eq("renewal_enabled",true).in("status",["active","past_due"]);
 if(updateError)throw new Error("Não foi possível registrar o pedido de cancelamento.");
 revalidatePath("/painel/assinatura");
 revalidatePath("/painel");
 redirect("/painel/assinatura?cancelamento=solicitado");
}
