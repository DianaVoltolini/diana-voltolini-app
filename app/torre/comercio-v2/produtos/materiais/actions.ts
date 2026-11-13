// app/torre/comercio-v2/produtos/materiais/actions.ts
"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

const base="/torre/comercio-v2/produtos/materiais";
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
function go(productId:string,code:string):never{
  redirect(base+"?produto="+encodeURIComponent(productId)+"&"+code);
}
function validCivilDate(value:string){
  if(!datePattern.test(value)) return false;
  const [year,month,day]=value.split("-").map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
}
export async function saveStudentDelivery(form:FormData){
  await requireAdmin();
  const productId=String(form.get("productId")??"");
  const materialId=String(form.get("materialId")??"");
  const mode=String(form.get("releaseMode")??"");
  const date=String(form.get("releaseDate")??"");
  if(!uuid.test(productId)||!uuid.test(materialId)||
     !["after_payment","scheduled"].includes(mode)||
     (mode==="scheduled"&&!validCivilDate(date)))go(productId,"erro=validacao");
  const db=getSupabaseAdmin();
  const [{data:product,error:productError},{data:material,error:materialError}]=await Promise.all([
    db.from("commerce_v2_products").select("id").eq("id",productId).maybeSingle(),
    db.from("commerce_v2_materials").select("id,storage_path").eq("id",materialId)
      .eq("is_archived",false).eq("available_to_student",true).maybeSingle(),
  ]);
  if(productError||!product||materialError||!material?.storage_path)go(productId,"erro=material");
  const {data:eligibility,error:eligibilityError}=await db
    .from("commerce_v2_material_product_eligibility").select("material_id")
    .eq("material_id",materialId).eq("product_id",productId).maybeSingle();
  if(eligibilityError||!eligibility)go(productId,"erro=material");
  const {error}=await db.from("commerce_v2_product_materials").upsert({
    product_id:productId,material_id:materialId,
    release_mode:mode,release_date:mode==="scheduled"?date:null,
    updated_at:new Date().toISOString(),
  },{onConflict:"product_id,material_id"});
  if(error){console.error("[commerce-v2-material-delivery] save",error.code);go(productId,"erro=salvar");}
  revalidatePath(base);
  go(productId,"salvo=1");
}
export async function removeStudentDelivery(form:FormData){
  await requireAdmin();
  const productId=String(form.get("productId")??"");
  const materialId=String(form.get("materialId")??"");
  if(!uuid.test(productId)||!uuid.test(materialId))go(productId,"erro=validacao");
  const db=getSupabaseAdmin();
  const {error}=await db.from("commerce_v2_product_materials")
    .delete().eq("product_id",productId).eq("material_id",materialId);
  if(error){console.error("[commerce-v2-material-delivery] remove",error.code);go(productId,"erro=salvar");}
  revalidatePath(base);
  go(productId,"removido=1");
}

/**
 * Vincula o produto V2 a um produto da tabela real de vendas.
 * A entrega segue desligada até ativação explícita em outra operação.
 */
export async function linkSalesProduct(form:FormData) {
  await requireAdmin();
  const productId=String(form.get("productId")??"");
  const salesProductId=String(form.get("salesProductId")??"");
  if(!uuid.test(productId) || (salesProductId && !uuid.test(salesProductId)))
    go(productId,"erro=validacao");
  const db=getSupabaseAdmin();
  const {data:adminProduct,error:adminError}=await db.from("commerce_v2_products")
    .select("id,code,student_delivery_active").eq("id",productId).maybeSingle();
  if(adminError||!adminProduct)go(productId,"erro=produto");
  if(adminProduct.student_delivery_active)go(productId,"erro=desativar");
  if(salesProductId){
    const {data:live,error:liveError}=await db.from("products")
      .select("id,code").eq("id",salesProductId).maybeSingle();
    // O mesmo código deve existir em ambos os catálogos para impedir
    // a entrega dos materiais de um produto em outra compra.
    if(liveError||!live||live.code!==adminProduct.code)go(productId,"erro=codigo");
  }
  const {error}=await db.from("commerce_v2_products")
    .update({sales_product_id:salesProductId||null,student_delivery_active:false})
    .eq("id",productId);
  if(error){console.error("[commerce-v2-sales-link]",error.code);go(productId,"erro=vinculo");}
  revalidatePath(base);
  go(productId,"vinculado=1");
}

export async function setStudentDeliveryActive(form:FormData){
  await requireAdmin();
  const productId=String(form.get("productId")??"");
  const activate=String(form.get("active")??"")==="true";
  if(!uuid.test(productId))go(productId,"erro=validacao");
  const db=getSupabaseAdmin();
  const {data:product,error:productError}=await db.from("commerce_v2_products")
    .select("code,sales_product_id").eq("id",productId).maybeSingle();
  if(productError||!product)go(productId,"erro=produto");
  if(activate){
    if(!product.sales_product_id)go(productId,"erro=vinculo");
    const {data:live,error:liveError}=await db.from("products")
      .select("code").eq("id",product.sales_product_id).maybeSingle();
    if(liveError||live?.code!==product.code)go(productId,"erro=codigo");
    const {count,error:countError}=await db.from("commerce_v2_product_materials")
      .select("material_id",{head:true,count:"exact"}).eq("product_id",productId);
    if(countError||!count)go(productId,"erro=material");
  }
  const {error}=await db.from("commerce_v2_products")
    .update({student_delivery_active:activate}).eq("id",productId);
  if(error){console.error("[commerce-v2-enable]",error.code);go(productId,"erro=salvar");}
  revalidatePath(base);
  go(productId,activate?"ativado=1":"desativado=1");
}
