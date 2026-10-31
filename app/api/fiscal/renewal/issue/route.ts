// app/api/fiscal/renewal/issue/route.ts
// Ponte autenticada do painel para o emissor interno do site.
// Nunca expõe o segredo do Bling ao navegador; desativada por padrão.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const reply = (x: Record<string, unknown>, status=200) =>
  NextResponse.json(x,{status,headers:noStore});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  if (process.env.FISCAL_RENEWAL_PANEL_ISSUANCE_ENABLED !== "1")
    return reply({error:"Emissão de renovação indisponível."},503);
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin)
    return reply({error:"Origem inválida."},403);
  const auth = await createClient();
  const {data,error} = await auth.auth.getClaims();
  const userId=typeof data?.claims?.sub==="string" ? data.claims.sub : null;
  if (error || !userId) return reply({error:"Autenticação necessária."},401);
  let input: unknown;
  try {input=await request.json();}catch{return reply({error:"Dados inválidos."},400);}
  const invoiceId=input&&typeof input==="object"&&"invoiceId" in input
    ? (input as {invoiceId?:unknown}).invoiceId:null;
  if(typeof invoiceId!=="string"||!UUID.test(invoiceId))
    return reply({error:"Mensalidade inválida."},400);

  const db=getSupabaseAdmin();
  const {data:invoice,error:invoiceError}=await db.from("fiscal_subscription_invoices")
    .select("id,subscription_id,order_id,status").eq("id",invoiceId).maybeSingle();
  if(invoiceError||!invoice||invoice.status!=="pending"||!invoice.order_id)
    return reply({error:"Mensalidade indisponível."},409);
  const {data:sub,error:subError}=await db.from("fiscal_subscriptions")
    .select("user_id,renewal_enabled,cancellation_requested_at,status")
    .eq("id",invoice.subscription_id).maybeSingle();
  if(subError||!sub||sub.user_id!==userId||sub.renewal_enabled!==true||
    sub.cancellation_requested_at!==null||!["active","past_due"].includes(sub.status))
    return reply({error:"Assinatura não elegível."},403);
  const {data:order,error:orderError}=await db.from("orders")
    .select("user_id,metadata,status").eq("id",invoice.order_id).maybeSingle();
  if(orderError||!order||order.user_id!==userId||order.status!=="pending"||
    order.metadata?.fiscal_renewal!==true)
    return reply({error:"Pedido de renovação inválido."},409);

  const base=process.env.FISCAL_RENEWAL_INTERNAL_SITE_URL?.trim() ?? "";
  const secret=process.env.FISCAL_RENEWAL_LOOKUP_SECRET?.trim() ?? "";
  let endpoint: URL;
  try {
    endpoint=new URL("/api/fiscal/renewal/issue-sales-order",base);
    if(endpoint.protocol!=="https:"||!["dianavoltolini.com.br","www.dianavoltolini.com.br"].includes(endpoint.hostname))
      return reply({error:"Integração não configurada."},503);
  }catch{return reply({error:"Integração não configurada."},503);}
  if(secret.length<32)return reply({error:"Integração não configurada."},503);

  // Esta etapa faz apenas a emissão do PEDIDO de venda no Bling.
  // O lançamento financeiro e a recuperação do Pix/boleto exigem etapas
  // próprias, portanto jamais exibir "cobrança gerada" aqui.
  try{
    const response=await fetch(endpoint.toString(),{
      method:"POST",cache:"no-store",
      headers:{"Authorization":`Bearer ${secret}`,"Content-Type":"application/json"},
      body:JSON.stringify({invoiceId}),
      signal:AbortSignal.timeout(25000),
    });
    if(!response.ok)
      return reply({state:"manual_review",error:"A emissão precisa ser conferida antes de continuar. Não tente gerar outra cobrança."},409);
    const result:unknown=await response.json();
    const state=result&&typeof result==="object"&&"state" in result
      ? (result as {state?:unknown}).state:null;
    if(state!=="bling_sales_order_created")
      return reply({state:"manual_review",error:"O pedido exige conferência."},409);
    return reply({state:"bling_sales_order_created",paymentCreated:false,
      message:"Pedido preparado. O Pix ou boleto ainda não foi emitido."});
  }catch{
    return reply({state:"manual_review",
      error:"Não foi possível confirmar o pedido no Bling. Nenhuma segunda tentativa deve ser realizada automaticamente."},503);
  }
}
