"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function field(form: FormData, key: string, max = 180) {
 return String(form.get(key) ?? "").trim().slice(0,max);
}

export async function publishProductDelivery(form: FormData) {
 await requireAdmin();
 const db=getSupabaseAdmin();
 const productId=field(form,"product_id",50);
 const pagePath=field(form,"page_path",180);
 const file=form.get("file");
 const name=field(form,"material_name",160);
 if (!/^[a-f0-9-]{36}$/i.test(productId) || !/^\/[a-z0-9][a-z0-9/-]*$/.test(pagePath) ||
     !name || !(file instanceof File) || !file.size || file.size>15*1024*1024 ||
     (file.type!=="application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))) {
   redirect("/torre/produtos-entregas?erro=validacao");
 }
 const {data:product,error:productError}=await db.from("products").select("id,code").eq("id",productId).eq("active",true).maybeSingle();
 if(productError||!product)redirect("/torre/produtos-entregas?erro=produto");
 const {data:other}=await db.from("product_deliveries").select("product_id").eq("page_path",pagePath).neq("product_id",productId).maybeSingle();
 if(other)redirect("/torre/produtos-entregas?erro=pagina");

 const {data:previous,error:previousError}=await db.from("product_deliveries")
   .select("storage_bucket,storage_path").eq("product_id",productId).maybeSingle();
 if(previousError)redirect("/torre/produtos-entregas?erro=salvar");
 // Upload has a unique immutable storage key: no already-published file is overwritten.
 const storagePath=product.code.toLowerCase()+"/"+crypto.randomUUID()+".pdf";
 const {error:uploadError}=await db.storage.from("product-deliveries").upload(storagePath,await file.arrayBuffer(),{contentType:"application/pdf",upsert:false});
 if(uploadError)redirect("/torre/produtos-entregas?erro=upload");
 // A row lock serializes version updates and history in one database transaction.
 const {error:publishError}=await db.rpc("publish_product_delivery",{
   p_product_id:productId,p_page_path:pagePath,p_material_name:name,
   p_storage_bucket:"product-deliveries",p_storage_path:storagePath
 });
 if(publishError){console.error("Falha na publicação de material:",publishError);redirect("/torre/produtos-entregas?erro=salvar");}
 // Somente o arquivo atual permanece no Storage. O histórico de publicação permanece no banco.
 if(previous?.storage_bucket && previous.storage_path &&
    (previous.storage_bucket!=="product-deliveries" || previous.storage_path!==storagePath)) {
   const {error:cleanupError}=await db.storage.from(previous.storage_bucket).remove([previous.storage_path]);
   if(cleanupError)console.error("Não foi possível remover a versão substituída:",cleanupError);
 }
 revalidatePath("/torre/produtos-entregas");
 revalidatePath("/painel/ebooks");
 revalidatePath("/painel");
 redirect("/torre/produtos-entregas?salvo=1");
}
