import {NextRequest,NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

export const dynamic="force-dynamic";
export const runtime="nodejs";
const FALLBACK_PATH="ebooks/ibs-cbs-na-pratica/Ebook_IBS_CBS_na_Pratica_Diana_Voltolini.pdf";
const FALLBACK_BUCKETS=["digital-products","digital-products 3."] as const;

// Only admins can view/download. Signed URL expires quickly and is never cached.
export async function GET(req:NextRequest){
 await requireAdmin();
 const productId=req.nextUrl.searchParams.get("product_id")??"";
 const mode=req.nextUrl.searchParams.get("modo")==="baixar"?"baixar":"visualizar";
 if(!/^[0-9a-f-]{36}$/i.test(productId))
   return NextResponse.json({error:"Produto inválido."},{status:400});
 const db=getSupabaseAdmin();
 const {data:product,error:productError}=await db.from("products").select("id,code").eq("id",productId).maybeSingle();
 if(productError||!product)return NextResponse.json({error:"Produto não encontrado."},{status:404});
 const {data:delivery,error}=await db.from("product_deliveries").select("material_name,storage_bucket,storage_path,version").eq("product_id",product.id).maybeSingle();
 if(error)return NextResponse.json({error:"Erro ao consultar material."},{status:500});
 const options=delivery?.version&&delivery.storage_bucket&&delivery.storage_path?
  [{bucket:delivery.storage_bucket,path:delivery.storage_path,name:delivery.material_name??"Material atualizado"}]:
  product.code==="EBOOK-IBSCBS-001"?
   FALLBACK_BUCKETS.map(bucket=>({bucket,path:FALLBACK_PATH,name:"Ebook IBS CBS na Pratica Diana Voltolini"})):[];
 for(const item of options){
  const filename=(item.name.replace(/[^a-zA-Z0-9À-ÿ _.-]/g,"").trim().slice(0,100)||"material")+".pdf";
  const {data:signed,error:signError}=await db.storage.from(item.bucket).createSignedUrl(item.path,60,
   mode==="baixar"?{download:filename}:undefined);
  if(!signError&&signed?.signedUrl)return NextResponse.redirect(signed.signedUrl,{
    status:303,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}
  });
 }
 return NextResponse.json({error:"Nenhum arquivo disponível para este produto."},{status:404,headers:{"Cache-Control":"no-store"}});
}
