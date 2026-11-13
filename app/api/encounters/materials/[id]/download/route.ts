// app/api/encounters/materials/[id]/download/route.ts
import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {ebookAccessUntil,ebookAccessActive} from "@/lib/ebooks/access";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const invalid=(status:number,message:string)=>NextResponse.json({error:message},
  {status,headers:{"Cache-Control":"no-store"}});

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const auth=await createClient();
  const {data:verified,error:authError}=await auth.auth.getUser();
  if(authError||!verified.user?.id)return invalid(401,"Acesse sua conta para baixar o material.");
  const {id}=await params;
  const orderId=request.nextUrl.searchParams.get("pedido")??"";
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!uuid.test(id)||!uuid.test(orderId))return invalid(404,"Material não encontrado.");
  try{
    const db=getSupabaseAdmin();
    const {data:order,error:orderError}=await db.from("orders")
      .select("id,product_id,paid_at,created_at").eq("id",orderId)
      .eq("user_id",verified.user.id).eq("status","paid")
      .not("paid_at","is",null).maybeSingle();
    if(orderError)throw orderError;
    if(!order)return invalid(403,"Compra não autorizada.");
    const until=ebookAccessUntil([order]);
    if(!ebookAccessActive(until))return invalid(403,"O prazo de acesso aos materiais deste encontro terminou.");
    const {data:product,error:productError}=await db.from("products")
      .select("code").eq("id",order.product_id).maybeSingle();
    if(productError)throw productError;
    if(!product?.code?.startsWith("ENC-"))return invalid(403,"Produto não autorizado.");
    const {data:material,error:materialError}=await db.from("encounter_materials")
      .select("title,storage_bucket,storage_path,published_at")
      .eq("id",id).eq("product_id",order.product_id)
      .eq("active",true).lte("published_at",new Date().toISOString()).maybeSingle();
    if(materialError)throw materialError;
    if(!material?.storage_bucket||!material.storage_path)return invalid(404,"Material ainda não disponível.");
    const filename=(material.title||"material-do-encontro")
      .replace(/[^a-zA-Z0-9À-ÿ _.-]/g,"").trim().slice(0,95)||"material";
    const extension=material.storage_path.split(".").pop()?.toLowerCase();
    const safeExtension=extension&&/^(pdf|xlsx|xls|csv|docx|pptx|zip)$/.test(extension)?extension:"pdf";
    const safeName=filename.toLowerCase().endsWith("."+safeExtension)?filename:filename+"."+safeExtension;
    const {data:signed,error:storageError}=await db.storage.from(material.storage_bucket)
      .createSignedUrl(material.storage_path,60,{download:safeName});
    if(storageError||!signed?.signedUrl)throw storageError??new Error("Arquivo indisponível.");
    return NextResponse.redirect(signed.signedUrl,{status:303,headers:{
      "Cache-Control":"no-store, private","Referrer-Policy":"no-referrer"
    }});
  }catch(error){
    console.error("Falha no download do material do encontro:",error);
    return invalid(503,"O material está temporariamente indisponível.");
  }
}
