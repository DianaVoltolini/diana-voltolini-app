// app/torre/produtos-entregas/import-to-v2.ts
"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

// Migração opcional: COPIA a versão atual, sem mover/apagar o PDF legado,
// sem conceder acesso ao cliente e sem alterar o checkout.
const ebookCode="EBOOK-IBSCBS-001";
const v2Library="/torre/comercio-v2/materiais";
const legacy="/torre/produtos-entregas";
const dest=(status:string):never=>redirect(legacy+"?migracao="+encodeURIComponent(status));

export async function copyCurrentEbookToV2(){
  const {userId}=await requireAdmin();
  const db=getSupabaseAdmin();
  const {data:product,error:productError}=await db.from("products")
    .select("id,code").eq("code",ebookCode).maybeSingle();
  if(productError||!product)dest("produto");

  const [{data:delivery,error:deliveryError},{data:v2product,error:v2error},
    {data:already,error:alreadyError}]=await Promise.all([
    db.from("product_deliveries").select("material_name,storage_bucket,storage_path,version")
      .eq("product_id",product.id).maybeSingle(),
    db.from("commerce_v2_products").select("id,code").eq("code",ebookCode).maybeSingle(),
    db.from("commerce_v2_legacy_material_imports").select("material_id,legacy_version")
      .eq("legacy_product_id",product.id).maybeSingle()
  ]);
  if(deliveryError||v2error||alreadyError)dest("consulta");
  if(!v2product)dest("v2ausente");
  if(!delivery?.storage_bucket||!delivery.storage_path||!delivery.version||delivery.version<1)
    dest("semaquivo");
  if(already)dest("jaimportado");

  const {data:source,error:downloadError}=await db.storage
    .from(delivery.storage_bucket).download(delivery.storage_path);
  if(downloadError||!source)dest("download");
  if(source.size===0||source.size>25*1024*1024)dest("tamanho");
  const bytes=await source.arrayBuffer();
  // A versão original permanece no bucket legado; a cópia tem chave própria V2.
  const path=v2product.id+"/"+crypto.randomUUID()+".pdf";
  const {error:uploadError}=await db.storage.from("commerce-v2-materials")
    .upload(path,bytes,{contentType:"application/pdf",upsert:false});
  if(uploadError)dest("upload");

  const name=(delivery.material_name||"E-book IBS e CBS na Prática").slice(0,180);
  const {data:material,error:materialError}=await db.from("commerce_v2_materials")
    .insert({
      product_id:v2product.id,title:name,description:"Cópia de homologação da versão vigente do e-book. A versão legada continua atendendo compradores.",
      category:"ebook",original_filename:"IBS_e_CBS_na_Pratica.pdf",
      storage_path:path,file_mime:"application/pdf",file_size:source.size,
      available_to_student:false,is_archived:false,created_by:userId,updated_by:userId
    }).select("id").single();
  if(materialError||!material){
    await db.storage.from("commerce-v2-materials").remove([path]);
    dest("cadastro");
  }
  // Registrar a origem antes de habilitar qualquer uso, evitando cópias repetidas.
  const {error:logError}=await db.from("commerce_v2_legacy_material_imports").insert({
    legacy_product_id:product.id,legacy_version:delivery.version,material_id:material.id
  });
  if(logError){
    await db.from("commerce_v2_materials").delete().eq("id",material.id);
    await db.storage.from("commerce-v2-materials").remove([path]);
    dest("registro");
  }
  const {error:eligibilityError}=await db.from("commerce_v2_material_product_eligibility")
    .upsert({material_id:material.id,product_id:v2product.id},
      {onConflict:"material_id,product_id",ignoreDuplicates:true});
  if(eligibilityError){
    console.error("[v2-ebook-import] Produto de referência não associado",eligibilityError.code);
    // O arquivo permanece copiado e identificado. A elegibilidade pode ser
    // regularizada manualmente no editor V2; nunca apagá-lo sem inspeção.
    dest("associacao");
  }
  revalidatePath(v2Library);
  revalidatePath(legacy);
  dest("concluida");
}
