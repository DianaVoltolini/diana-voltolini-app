// app/api/marketing/welcome/run/route.ts
import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {runWelcomeAutomation} from "@/lib/marketing/automatic-send";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const secret=process.env.MARKETING_CRON_SECRET;
 const supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";
 if(!secret||!supplied||Buffer.byteLength(secret)!==Buffer.byteLength(supplied)||!timingSafeEqual(Buffer.from(secret),Buffer.from(supplied)))return NextResponse.json({error:"Não autorizado"},{status:401});
 try{return NextResponse.json(await runWelcomeAutomation(),{headers:{"Cache-Control":"no-store"}})}
 catch(error){console.error("marketing welcome worker failed",error);return NextResponse.json({error:"Falha na execução"},{status:500})}
}
