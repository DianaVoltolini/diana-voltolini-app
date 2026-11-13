// app/api/encounters/reminders/run/route.ts
import {timingSafeEqual} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {sendEncounterReminders} from "@/lib/encounters/reminder-worker";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  const secret=process.env.MARKETING_CRON_SECRET??"";
  const provided=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";
  if(!secret||!provided||Buffer.byteLength(secret)!==Buffer.byteLength(provided)||
    !timingSafeEqual(Buffer.from(secret),Buffer.from(provided)))
    return NextResponse.json({error:"Não autorizado"},{status:401});
  try{return NextResponse.json(await sendEncounterReminders(),{headers:{"Cache-Control":"no-store"}})}
  catch(error){
    console.error("[encounter-reminder] Falha na rotina",error);
    return NextResponse.json({error:"Falha no processamento do lembrete"},{status:500});
  }
}
