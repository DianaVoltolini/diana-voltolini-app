// lib/commerce-v2/material-update-notices.ts
// Avisos de atualização consultam EXCLUSIVAMENTE materiais publicados na Biblioteca V2.
import "server-only";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {getStudentMaterialsForOrder} from "@/lib/commerce-v2/student-delivery";

type PaidOrder={id:string;product_id:string;paid_at:string|null;created_at:string};
export type V2MaterialNotice={
  product_id:string; name:string; href:string;
  latestUpdate:string; count:number;
};

function destination(code:string){
  if(code==="EBOOK-IBSCBS-001") return "/painel/ebooks";
  if(code.startsWith("ENC-")) return "/painel/encontro-online";
  return "/painel/minhas-compras";
}

export async function getV2MaterialNoticesForUser(userId:string):Promise<V2MaterialNotice[]>{
  const db=getSupabaseAdmin();
  const {data:orders,error:ordersError}=await db.from("orders")
    .select("id,product_id,paid_at,created_at")
    .eq("user_id",userId).eq("status","paid").not("paid_at","is",null)
    .order("paid_at",{ascending:false}).limit(200);
  if(ordersError)throw ordersError;
  if(!orders?.length)return [];
  const productIds=[...new Set(orders.map(o=>o.product_id))];
  const [{data:products,error:productsError},{data:seen,error:seenError}]=await Promise.all([
    db.from("products").select("id,name,code").in("id",productIds),
    db.from("product_delivery_reads").select("product_id,seen_at")
      .eq("user_id",userId).in("product_id",productIds),
  ]);
  if(productsError||seenError)throw productsError??seenError;
  const productById=new Map((products??[]).map(p=>[p.id,p]));
  const seenById=new Map((seen??[]).map(x=>[x.product_id,x.seen_at]));
  const grouped=new Map<string,V2MaterialNotice & {materialIds:Set<string>}>();
  for(const order of orders as PaidOrder[]){
    // A regra de download é a autoridade: só permite avisos de materiais
    // realmente liberados, com a compra paga e dentro do prazo de 90 dias.
    const released=(await getStudentMaterialsForOrder(order)).filter(m=>m.isReleased);
    if(!released.length)continue;
    const product=productById.get(order.product_id);
    if(!product)continue;
    const ids=released.map(m=>m.id);
    const {data:materials,error:materialsError}=await db.from("commerce_v2_materials")
      .select("id,updated_at,created_at,storage_path")
      .in("id",ids).eq("is_archived",false).eq("available_to_student",true)
      .not("storage_path","is",null);
    if(materialsError)throw materialsError;
    const seenAt=seenById.get(order.product_id);
    for(const item of materials??[]){
      const when=Date.parse(item.updated_at);
      if(!Number.isFinite(when))continue;
      // Não avisa sobre arquivo já existente antes da compra, nem
      // sobre o cadastro inicial: somente atualização posterior.
      if(when<=Date.parse(item.created_at)||when<=Date.parse(order.paid_at!))continue;
      if(seenAt&&when<=Date.parse(seenAt))continue;
      let entry=grouped.get(order.product_id);
      if(!entry){
        entry={product_id:order.product_id,name:product.name,
          href:destination(product.code),latestUpdate:item.updated_at,
          count:0,materialIds:new Set<string>()};
        grouped.set(order.product_id,entry);
      }
      entry.materialIds.add(item.id);
      if(when>Date.parse(entry.latestUpdate))entry.latestUpdate=item.updated_at;
      entry.count=entry.materialIds.size;
    }
  }
  return [...grouped.values()]
    .sort((a,b)=>Date.parse(b.latestUpdate)-Date.parse(a.latestUpdate))
    .map(({materialIds,...notice})=>notice);
}
