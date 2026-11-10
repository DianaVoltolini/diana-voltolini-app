"use server";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
export async function markMaterialUpdateRead(form:FormData) {
 const auth=await createClient();
 const {data:claims,error}=await auth.auth.getClaims();
 const userId=typeof claims?.claims?.sub==="string"?claims.claims.sub:null;
 if(error||!userId)throw new Error("Sessão inválida.");
 const productId=String(form.get("product_id")??"");
 if(!/^[0-9a-f-]{36}$/i.test(productId))throw new Error("Produto inválido.");
 const db=getSupabaseAdmin();
 const [{data:orders,error:orderError},{data:delivery,error:deliveryError}]=await Promise.all([
  db.from("orders").select("id").eq("user_id",userId).eq("product_id",productId).eq("status","paid").limit(1),
  db.from("product_deliveries").select("version").eq("product_id",productId).maybeSingle()
 ]);
 if(orderError||deliveryError||!orders?.length||!delivery||delivery.version<1)
   throw new Error("Atualização não disponível para este comprador.");
 // Only mark as read after checking ownership. Never accept a version sent by client.
 const {error:saveError}=await db.from("product_delivery_reads").upsert({
   user_id:userId,product_id:productId,seen_version:delivery.version,seen_at:new Date().toISOString()
 },{onConflict:"user_id,product_id"});
 if(saveError)throw saveError;
 revalidatePath("/painel");
 revalidatePath("/painel/ebooks");
}