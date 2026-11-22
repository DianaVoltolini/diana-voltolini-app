import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

export const FISCAL_FILES_BUCKET="fiscal-analysis-private";
export const FISCAL_MAX_FILE_BYTES=15*1024*1024;
export const FISCAL_ALLOWED_TYPES=new Map([
 ["application/pdf","pdf"],
 ["application/vnd.openxmlformats-officedocument.wordprocessingml.document","docx"],
 ["image/jpeg","jpg"],
 ["image/png","png"]
]);
export const FISCAL_ACTIVE_STATUSES=["paid","in_progress","awaiting_client"] as const;
export function fiscalUuid(value:string):boolean{
 return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export async function getFiscalClientRequest(id:string){
 if(!fiscalUuid(id))return null;
 const auth=await createClient();
 const {data,error}=await auth.auth.getClaims();
 const uid=typeof data?.claims?.sub==="string"?data.claims.sub:null;
 if(error||!uid)return null;
 const {data:request,error:requestError}=await getSupabaseAdmin()
  .from("fiscal_analysis_requests").select("id,user_id,status,paid_at,protocol,question,created_at")
  .eq("id",id).eq("user_id",uid).not("paid_at","is",null).maybeSingle();
 if(requestError||!request)return null;
 return {request,uid};
}
export function fiscalFileDownloadName(value:string):string{
 return value.replace(/[\r\n"\\/]/g,"_").slice(0,180)||"documento";
}
