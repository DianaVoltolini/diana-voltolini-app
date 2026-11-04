import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {enqueueNewBlogNotifications} from "@/lib/marketing/blog-notifications";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const secret=process.env.MARKETING_CRON_SECRET??"";
 const supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";
 if(!secret||!supplied||Buffer.byteLength(secret)!==Buffer.byteLength(supplied)||
  !timingSafeEqual(Buffer.from(secret),Buffer.from(supplied)))
  return NextResponse.json({error:"Não autorizado"},{status:401});
 try{return NextResponse.json(await enqueueNewBlogNotifications(),{headers:{"Cache-Control":"no-store"}})}
 catch(error){console.error("[marketing blog] Falha no agendamento",error);
  return NextResponse.json({error:"Falha ao enfileirar aviso do Blog"},{status:500})}
}
