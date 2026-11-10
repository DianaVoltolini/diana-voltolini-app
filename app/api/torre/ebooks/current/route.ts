import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const db = getSupabaseAdmin();
  const {data:product,error:productError}=await db.from("products").select("id")
    .eq("code","EBOOK-IBSCBS-001").maybeSingle();
  if(productError || !product) return NextResponse.json({error:"Produto não encontrado."},{status:404});
  const {data:delivery,error}=await db.from("product_deliveries")
    .select("storage_bucket,storage_path,material_name,version").eq("product_id",product.id).maybeSingle();
  if(error || !delivery?.storage_bucket || !delivery.storage_path || delivery.version<1)
    return NextResponse.json({error:"Nenhuma versão foi publicada na Torre."},{status:404});
  const download=request.nextUrl.searchParams.get("mode")!=="view";
  const fileName=((delivery.material_name||"ebook-ibs-cbs").replace(/[^a-zA-Z0-9À-ÿ _.-]/g,"").trim().slice(0,100)||"ebook-ibs-cbs")+".pdf";
  const {data:signed,error:signedError}=await db.storage.from(delivery.storage_bucket)
    .createSignedUrl(delivery.storage_path,60,{download:download?fileName:undefined});
  if(signedError || !signed?.signedUrl) return NextResponse.json({error:"Arquivo indisponível."},{status:503});
  return NextResponse.redirect(signed.signedUrl,{status:303,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
}
