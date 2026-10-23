import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Emite credencial efêmera para futura contratação autenticada.
 * Não cria pedidos, mensalidades ou cobranças e não habilita checkout.
 */
export async function POST() {
 const noStore={"Cache-Control":"no-store"};
 const disabled=()=>NextResponse.json({error:"Contratação indisponível no momento."},{status:503,headers:noStore});
 if(process.env.FISCAL_SUBSCRIPTION_CHECKOUT_ENABLED!=="1")return disabled();
 const auth=await createClient();
 const {data,error}=await auth.auth.getClaims();
 const uid=typeof data?.claims?.sub==="string"?data.claims.sub:null;
 if(error||!uid)return NextResponse.json({error:"Faça login para contratar."},{status:401,headers:noStore});
 const db=getSupabaseAdmin();
 const {data:profile,error:profileError}=await db.from("profiles").select("id,role,status").eq("id",uid).maybeSingle();
 if(profileError||!profile||profile.status!=="active"||profile.role==="admin")
  return NextResponse.json({error:"Conta não habilitada para contratação."},{status:403,headers:noStore});
 const now=new Date();
 const {count,error:countError}=await db.from("fiscal_checkout_sessions").select("id",{count:"exact",head:true})
 .eq("user_id",uid).is("consumed_at",null).gt("expires_at",now.toISOString());
 if(countError)return NextResponse.json({error:"Não foi possível validar a contratação."},{status:503,headers:noStore});
 if((count??0)>=3)return NextResponse.json({error:"Já existem solicitações recentes. Tente novamente em alguns minutos."},{status:429,headers:noStore});
 const token=randomBytes(32).toString("hex");
 const tokenHash=createHash("sha256").update(token).digest("hex");
 const expiresAt=new Date(now.getTime()+15*60*1000).toISOString();
 const {error:insertError}=await db.from("fiscal_checkout_sessions").insert({user_id:uid,token_hash:tokenHash,expires_at:expiresAt});
 if(insertError)return NextResponse.json({error:"Não foi possível preparar a contratação."},{status:503,headers:noStore});
 return NextResponse.json({checkoutToken:token,expiresAt},{headers:noStore});
}
