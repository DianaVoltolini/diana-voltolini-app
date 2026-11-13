// app/api/commerce-v2/materials/[id]/download/route.ts
import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {getStudentMaterialsForOrder} from "@/lib/commerce-v2/student-delivery";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(code:number,message:string)=>NextResponse.json({error:message},
  {status:code,headers:{"Cache-Control":"private,no-store"}});

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const client=await createClient();
  const {data:identity,error:authError}=await client.auth.getUser();
  if(authError||!identity.user?.id)return fail(401,"Entre na Área do Cliente para acessar o material.");
  const {id}=await params;
  const orderId=request.nextUrl.searchParams.get("pedido")??"";
  if(!uuid.test(id)||!uuid.test(orderId))return fail(404,"Material não encontrado.");
  try{
    const db=getSupabaseAdmin();
    const {data:order,error:orderError}=await db.from("orders")
      .select("id,product_id,paid_at,created_at").eq("id",orderId)
      .eq("user_id",identity.user.id).eq("status","paid")
      .not("paid_at","is",null).maybeSingle();
    if(orderError)throw orderError;
    if(!order)return fail(403,"Compra não autorizada.");
    const available=await getStudentMaterialsForOrder(order);
    const allowed=available.find(item=>item.id===id && item.isReleased);
    if(!allowed)return fail(403,"Material não liberado ou prazo de acesso encerrado.");
    const {data:file,error:fileError}=await db.from("commerce_v2_materials")
      .select("storage_path,file_mime,original_filename")
      .eq("id",id).eq("is_archived",false).eq("available_to_student",true)
      .maybeSingle();
    if(fileError)throw fileError;
    if(!file?.storage_path)return fail(404,"Arquivo indisponível.");
    const name=(file.original_filename??allowed.title)
      .replace(/[^a-zA-Z0-9À-ÿ _.-]/g,"").trim().slice(0,130)||"material";
    // Bucket privado configurado na biblioteca V2; jamais aceitar bucket da URL.
    const {data:signed,error:signError}=await db.storage
      .from("commerce-v2-materials").createSignedUrl(file.storage_path,60,{download:name});
    if(signError||!signed?.signedUrl)throw signError??new Error("Falha no arquivo");
    return NextResponse.redirect(signed.signedUrl,{status:303,headers:{
      "Cache-Control":"private,no-store","Referrer-Policy":"no-referrer"
    }});
  }catch(err){
    console.error("[student-delivery] Download indisponível",err);
    return fail(503,"Não foi possível disponibilizar o arquivo neste momento.");
  }
}
