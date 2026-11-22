import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {FISCAL_FILES_BUCKET,fiscalFileDownloadName,fiscalUuid,getFiscalClientRequest} from "@/lib/fiscal/analysis-service";

export const dynamic="force-dynamic";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!fiscalUuid(id))return new Response("Arquivo não encontrado",{status:404});
 const db=getSupabaseAdmin();
 const {data:attachment,error}=await db.from("fiscal_analysis_attachments")
  .select("request_id,storage_path,original_filename,media_type,visible_to_client")
  .eq("id",id).maybeSingle();
 if(error||!attachment)return new Response("Arquivo não encontrado",{status:404});
 let canRead=false;
 if(request.nextUrl.searchParams.get("admin")==="1"){
  try{await requireAdmin();canRead=true;}catch{canRead=false;}
 }else if(attachment.visible_to_client){
  canRead=Boolean(await getFiscalClientRequest(attachment.request_id));
 }
 if(!canRead)return new Response("Arquivo não encontrado",{status:404});
 const {data:file,error:downloadError}=await db.storage.from(FISCAL_FILES_BUCKET).download(attachment.storage_path);
 if(downloadError||!file)return new Response("Arquivo indisponível",{status:502});
 return new Response(await file.arrayBuffer(),{
  status:200,
  headers:{
   "Content-Type":attachment.media_type,
   "Content-Disposition":'attachment; filename="documento"; filename*=UTF-8\'\''+encodeURIComponent(fiscalFileDownloadName(attachment.original_filename)),
   "Cache-Control":"private, no-store",
   "X-Content-Type-Options":"nosniff"
  }
 });
}
