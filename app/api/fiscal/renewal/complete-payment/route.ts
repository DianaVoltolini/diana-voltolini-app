// app/api/fiscal/renewal/complete-payment/route.ts
// Continua uma renovação com pedido Bling JÁ CRIADO. Não cria outro pedido.
// A etapa financeira permanece desativada até homologação.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const respond = (x: Record<string, unknown>, status=200) =>
  NextResponse.json(x,{status,headers:{"Cache-Control":"no-store"}});
type Remote = {state?: string; reason?: string; paymentLinkAvailable?: boolean};
export async function POST(request: NextRequest) {
  if (process.env.FISCAL_RENEWAL_PANEL_FINANCIAL_ENABLED !== "1")
    return respond({error:"Pagamento da renovação indisponível."},503);
  const origin=request.headers.get("origin");
  if(origin && origin !== request.nextUrl.origin) return respond({error:"Origem inválida."},403);
  const auth=await createClient();
  const {data,error}=await auth.auth.getClaims();
  const uid=typeof data?.claims?.sub==="string"?data.claims.sub:null;
  if(error||!uid)return respond({error:"Autenticação necessária."},401);
  let input:unknown;
  try {input=await request.json();}catch{return respond({error:"Dados inválidos."},400);}
  const invoiceId=input&&typeof input==="object"&&"invoiceId" in input
    ?(input as {invoiceId?:unknown}).invoiceId:null;
  if(typeof invoiceId!=="string"||!UUID.test(invoiceId))
    return respond({error:"Mensalidade inválida."},400);
  const db=getSupabaseAdmin();
  const {data:invoice}=await db.from("fiscal_subscription_invoices")
    .select("id,subscription_id,order_id,status").eq("id",invoiceId).maybeSingle();
  if(!invoice||invoice.status!=="pending"||!invoice.order_id)
    return respond({error:"Mensalidade indisponível."},409);
  const {data:sub}=await db.from("fiscal_subscriptions")
    .select("user_id,status,renewal_enabled,cancellation_requested_at")
    .eq("id",invoice.subscription_id).maybeSingle();
  if(!sub||sub.user_id!==uid||!["active","past_due"].includes(sub.status)||
      sub.renewal_enabled!==true||sub.cancellation_requested_at!==null)
    return respond({error:"Assinatura não elegível."},403);
  const {data:order}=await db.from("orders")
    .select("id,user_id,status,metadata,provider_order_id")
    .eq("id",invoice.order_id).maybeSingle();
  if(!order||order.user_id!==uid||order.status!=="pending"||
      order.metadata?.fiscal_renewal!==true||
      typeof order.provider_order_id!=="string")
    return respond({error:"Pedido ainda não está pronto para cobrança."},409);
  // Se a mesma cobrança já foi vinculada, não repetir busca nem lançamento
  // financeiro. O painel consulta o pagamento existente pelo pedido.
  const {data: existingPayments,error: existingPaymentError}=await db.from("payments")
    .select("id,payment_url,status,provider_payment_id")
    .eq("order_id",order.id).eq("provider","bling").limit(2);
  if(existingPaymentError)
    return respond({error:"Falha ao consultar cobrança existente."},503);
  if(existingPayments?.length===1){
    const payment=existingPayments[0];
    if(!["pending","processing"].includes(payment.status)||
        !payment.provider_payment_id)
      return respond({state:"manual_review",error:"Pagamento existente exige conferência."},409);
    const url=payment.payment_url;
    return respond({state:"receivable_linked",
      paymentLinkAvailable:typeof url==="string"&&url.startsWith("https://"),
      message:"Cobrança já vinculada. Consulte o link no painel."});
  }
  if(existingPayments && existingPayments.length>1)
    return respond({state:"manual_review",error:"Mais de uma cobrança vinculada ao pedido."},409);

  const secret=process.env.FISCAL_RENEWAL_LOOKUP_SECRET?.trim()??"";
  const base=process.env.FISCAL_RENEWAL_INTERNAL_SITE_URL?.trim()??"";
  let url:URL;
  try{
    url=new URL(base);
    if(url.protocol!=="https:"||!["dianavoltolini.com.br","www.dianavoltolini.com.br"].includes(url.hostname))
      return respond({error:"Integração não configurada."},503);
  }catch{return respond({error:"Integração não configurada."},503);}
  if(secret.length<32)return respond({error:"Integração não configurada."},503);

  async function call(path:string):Promise<{ok:boolean;data:Remote}> {
    const target=new URL(path,url);
    const response=await fetch(target.toString(),{
      method:"POST",cache:"no-store",
      headers:{Authorization:`Bearer ${secret}`,"Content-Type":"application/json"},
      body:JSON.stringify({invoiceId}),signal:AbortSignal.timeout(25000),
    });
    const json:unknown=await response.json();
    return {ok:response.ok,data:json&&typeof json==="object"?json as Remote:{}};
  }

  try{
    // O lançamento financeiro possui trava transacional local para tentar
    // apenas uma vez. Em qualquer falha/incerteza não lançar novamente.
    if(order.metadata?.checkout_state==="bling_order_created"){
      const launch=await call("/api/fiscal/renewal/launch-financial");
      if(!launch.ok||launch.data.state!=="financial_launch_requested")
        return respond({state:"manual_review",error:"Lançamento exige conferência. Não tente outra cobrança."},409);
    } else if(!["financial_launched","financial_lookup_pending","payment_link_pending","completed"].includes(order.metadata?.checkout_state??"")){
      return respond({state:"manual_review",error:"Estado do pedido exige conferência."},409);
    }

    // O vínculo faz SOMENTE GET no Bling. Procura a conta a receber
    // existente, valida origem/valor/vencimento e salva pagamento local.
    const linked=await call("/api/fiscal/renewal/link-receivable");
    if(!linked.ok||linked.data.state!=="receivable_linked")
      return respond({state:"manual_review",error:"Cobrança ainda não localizada com segurança. Não gerar outra."},409);
    return respond({state:"receivable_linked",paymentLinkAvailable:linked.data.paymentLinkAvailable===true,
      message:"Cobrança localizada. Atualize a página para acessar o pagamento."});
  }catch{
    return respond({state:"manual_review",error:"Falha de comunicação. Conferir no Bling antes de qualquer nova tentativa."},503);
  }
}
