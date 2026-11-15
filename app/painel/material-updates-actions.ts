// app/painel/material-updates-actions.ts
"use server";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {getV2MaterialNoticesForUser} from "@/lib/commerce-v2/material-update-notices";

export async function markMaterialUpdateRead(form:FormData){
  const auth=await createClient();
  const {data:claims,error}=await auth.auth.getUser();
  const userId=!error?claims.user?.id:null;
  if(!userId)throw new Error("Sessão inválida.");
  const productId=String(form.get("product_id")??"");
  if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(productId))
    throw new Error("Produto inválido.");

  // Confirma novamente a compra, liberação e prazo antes de marcar como lido.
  const notices=await getV2MaterialNoticesForUser(userId);
  const notice=notices.find(n=>n.product_id===productId);
  if(!notice)throw new Error("Nenhuma atualização disponível para este comprador.");

  const db=getSupabaseAdmin();
  // A data da última atualização observada é o marco, não now():
  // uma edição concorrente posterior continua aparecendo como nova.
  const {error:saveError}=await db.from("product_delivery_reads").upsert({
    user_id:userId,product_id:productId,
    seen_version:0,seen_at:notice.latestUpdate
  },{onConflict:"user_id,product_id"});
  if(saveError)throw saveError;
  revalidatePath("/painel");
  revalidatePath("/painel/ebooks");
  revalidatePath("/painel/encontro-online");
}
