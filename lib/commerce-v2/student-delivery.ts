// lib/commerce-v2/student-delivery.ts
// Leitura da programação privada por produto vendido (somente no servidor).
// Nunca concede acesso apenas porque o material está na Biblioteca.
import "server-only";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {ebookAccessActive,ebookAccessUntil} from "@/lib/ebooks/access";

export type PaidOrderForMaterials={
  id:string;product_id:string;paid_at:string|null;created_at:string;
};
export type StudentMaterial={
  id:string;title:string;category:string;
  isReleased:boolean;releaseDate:string|null;expiresAt:Date|null;
};
export function brasiliaCivilDay(date=new Date()):string{
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit",
  }).formatToParts(date);
  const value=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function getStudentMaterialsForOrder(order:PaidOrderForMaterials):Promise<StudentMaterial[]>{
  if(!order.paid_at) return [];
  const db=getSupabaseAdmin();
  const {data:product,error:productError}=await db.from("commerce_v2_products")
    .select("id").eq("sales_product_id",order.product_id)
    .eq("student_delivery_active",true).maybeSingle();
  if(productError)throw productError;
  if(!product)return [];
  const {data:links,error:linksError}=await db.from("commerce_v2_product_materials")
    .select("material_id,release_mode,release_date,display_order")
    .eq("product_id",product.id).order("display_order",{ascending:true}).limit(200);
  if(linksError)throw linksError;
  const ids=(links??[]).map(item=>item.material_id);
  if(!ids.length)return [];
  const [{data:files,error:filesError},{data:allowed,error:allowedError}]=await Promise.all([
    db.from("commerce_v2_materials").select("id,title,category,storage_path")
      .in("id",ids).eq("is_archived",false).eq("available_to_student",true)
      .not("storage_path","is",null),
    db.from("commerce_v2_material_product_eligibility").select("material_id")
      .eq("product_id",product.id).in("material_id",ids),
  ]);
  if(filesError||allowedError)throw filesError??allowedError;
  const fileMap=new Map((files??[]).map(item=>[item.id,item]));
  const permitted=new Set((allowed??[]).map(item=>item.material_id));
  const today=brasiliaCivilDay();
  const paidDay=brasiliaCivilDay(new Date(order.paid_at));
  const expiresAt=ebookAccessUntil([order]);
  const active=ebookAccessActive(expiresAt);
  return (links??[]).flatMap(link=>{
    const file=fileMap.get(link.material_id);
    if(!file||!permitted.has(link.material_id))return [];
    const scheduled=link.release_mode==="scheduled";
    const date=scheduled ? link.release_date : null;
    const eligible=active && (scheduled
      ? Boolean(date&&today>=date)
      : today>=paidDay);
    return [{
      id:file.id,title:file.title,category:file.category,
      isReleased:eligible,releaseDate:date,expiresAt,
    }];
  });
}
