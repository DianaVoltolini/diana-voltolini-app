// app/api/fiscal/renewal/reconciliation/route.ts
// Diagnóstico SOMENTE LEITURA para recuperação manual de cobranças de renovação.
// Não chama o Bling, não altera estado local nem autoriza reenvio de POST.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const respond = (value: Record<string, unknown>, status = 200) =>
  NextResponse.json(value, { status, headers });

export async function GET() {
  if (process.env.FISCAL_RENEWAL_RECONCILIATION_ENABLED !== "1")
    return respond({ error: "Conciliação não habilitada." }, 503);

  const auth = await createClient();
  const { data, error } = await auth.auth.getClaims();
  const uid = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (error || !uid) return respond({ error: "Faça login." }, 401);

  const db = getSupabaseAdmin();
  const { data: subs, error: subError } = await db.from("fiscal_subscriptions")
    .select("id,status,renewal_enabled,cancellation_requested_at")
    .eq("user_id", uid).order("created_at", { ascending: false }).limit(20);
  if (subError) return respond({ error: "Não foi possível consultar a assinatura." }, 503);
  if (!subs || subs.length !== 1)
    return respond({ state: "manual_review", reason: "subscription_selection" });

  const subscription = subs[0];
  const { data: invoices, error: invError } = await db.from("fiscal_subscription_invoices")
    .select("id,order_id,status,reference_month")
    .eq("subscription_id", subscription.id).eq("status", "pending")
    .order("reference_month", { ascending: false }).limit(2);
  if (invError) return respond({ error: "Falha ao consultar mensalidades." }, 503);
  if (!invoices || invoices.length !== 1 || !invoices[0].order_id)
    return respond({ state: "manual_review", reason: "pending_invoice_selection" });

  const invoice = invoices[0];
  const { data: order, error: orderError } = await db.from("orders")
    .select("id,status,provider_order_id")
    .eq("id", invoice.order_id).eq("user_id", uid).maybeSingle();
  if (orderError || !order)
    return respond({ state: "manual_review", reason: "order_mismatch" });

  const [{ data: claims, error: claimError }, { data: payments, error: paymentError }] =
    await Promise.all([
      db.from("fiscal_bling_issuance_claims")
        .select("id,state,provider_order_id,provider_payment_id")
        .eq("invoice_id", invoice.id).eq("order_id", order.id).limit(2),
      db.from("payments")
        .select("id,status,provider_payment_id")
        .eq("order_id", order.id).eq("provider", "bling").limit(5),
    ]);
  if (claimError || paymentError)
    return respond({ error: "Falha ao consultar vínculos da cobrança." }, 503);

  // Sempre conservador: nenhuma resposta autoriza criação ou repetição de cobrança.
  if (subscription.cancellation_requested_at || subscription.renewal_enabled !== true)
    return respond({ state: "manual_review", reason: "cancelled_subscription" });
  if (order.status !== "pending")
    return respond({ state: "manual_review", reason: "order_not_pending" });
  if ((claims?.length ?? 0) !== 1)
    return respond({ state: "manual_review", reason: "claim_missing_or_ambiguous" });
  const claim = claims![0];
  if (claim.state === "linked" &&
      !!claim.provider_order_id && !!claim.provider_payment_id &&
      claim.provider_order_id === order.provider_order_id &&
      payments?.some(p => p.provider_payment_id === claim.provider_payment_id))
    return respond({ state: "linked", reason: "local_identifiers_match" });
  return respond({
    state: "manual_review",
    reason: "external_reconciliation_required",
    hasExternalOrderId: !!(order.provider_order_id || claim.provider_order_id),
    hasExternalPaymentId: !!(claim.provider_payment_id || payments?.some(p => p.provider_payment_id)),
  });
}
