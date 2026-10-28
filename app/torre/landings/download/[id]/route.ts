import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 await requireAdmin();
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Identificador inválido"},{status:400});
 const db=getSupabaseAdmin();
 const {data,error}=await db.from("marketing_landings").select("file_path").eq("id",id).maybeSingle();
 if(error||!data?.file_path)return NextResponse.json({error:"Material indisponível"},{status:404});
 const {data:link,error:linkError}=await db.storage.from("marketing-deliveries").createSignedUrl(data.file_path,60,{download:true});
 if(linkError||!link?.signedUrl)return NextResponse.json({error:"Não foi possível gerar download"},{status:502});
 return NextResponse.redirect(link.signedUrl,{status:302,headers:{"Cache-Control":"no-store"}});
}
