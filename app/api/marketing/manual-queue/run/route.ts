import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {processManualCampaignQueue} from "@/lib/marketing/manual-queue";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const secret=process.env.MARKETING_CRON_SECRET??"";
 const value=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";
 if(!secret||!value||Buffer.byteLength(secret)!==Buffer.byteLength(value)||
    !timingSafeEqual(Buffer.from(secret),Buffer.from(value)))
  return NextResponse.json({error:"Não autorizado"},{status:401});
 try{
  const result=await processManualCampaignQueue();
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("[marketing manual queue] Erro na rotina",error);
  return NextResponse.json({error:"Falha no processamento da fila"},{status:500});
 }
}
