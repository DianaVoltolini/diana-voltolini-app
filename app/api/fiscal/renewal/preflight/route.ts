// app/api/fiscal/renewal/preflight/route.ts
// Consulta autenticada e somente leitura: não reserva pedido nem gera cobrança.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };
function localDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (name: string) => parts.find(p => p.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function shiftDate(value: string, days: number): string {
  const d = new Date(value + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export async function GET() {
  // Endpoint técnico: não oferecer ação operacional enquanto a integração Bling não estiver homologada.
  if (process.env.FISCAL_RENEWAL_PREFLIGHT_ENABLED !== "1")
    return NextResponse.json({ error: "Verificação indisponível." }, { status: 503, headers });
  const auth = await createClient();
  const { data, error } = await auth.auth.getClaims();
  const uid = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (error || !uid)
    return NextResponse.json({ error: "Autenticação necessária." }, { status: 401, headers });
  const db = getSupabaseAdmin();
  const { data: subscriptions, error: subError } = await db.from("fiscal_subscriptions")
    .select("id,status,paid_until,renewal_enabled,cancellation_requested_at")
    .eq("user_id", uid).in("status", ["active", "past_due"])
    .order("created_at", { ascending: false }).limit(20);
  if (subError)
    return NextResponse.json({ error: "Falha ao conferir assinatura." }, { status: 503, headers });
  const sub = (subscriptions ?? []).find(s => s.renewal_enabled === true
    && !s.cancellation_requested_at && !!s.paid_until);
  if (!sub)
    return NextResponse.json({ eligible: false, reason: "no_active_renewable_subscription" }, { headers });
  const due = localDate(new Date(sub.paid_until));
  const today = localDate(new Date());
  const earliest = shiftDate(due, -10);
  const latest = shiftDate(due, 3);
  if (today < earliest || today > latest)
    return NextResponse.json({ eligible: false, reason: "outside_renewal_window", earliest, latest }, { headers });
  const referenceMonth = due.slice(0, 7) + "-01";
  const { data: invoice, error: invoiceError } = await db.from("fiscal_subscription_invoices")
    .select("id,order_id,status,due_date,reference_month")
    .eq("subscription_id", sub.id).eq("reference_month", referenceMonth)
    .maybeSingle();
  if (invoiceError)
    return NextResponse.json({ error: "Falha ao conferir mensalidade." }, { status: 503, headers });
  if (invoice?.status === "paid")
    return NextResponse.json({ eligible: false, reason: "invoice_already_paid" }, { headers });
  if (invoice) {
    if (!invoice.order_id)
      return NextResponse.json({ eligible: false, reason: "invoice_requires_review" }, { headers });
    const { data: order, error: orderError } = await db.from("orders")
      .select("id,status,metadata").eq("id", invoice.order_id).eq("user_id", uid).maybeSingle();
    if (orderError || !order)
      return NextResponse.json({ eligible: false, reason: "order_requires_review" }, { headers });
    if (order.status !== "pending")
      return NextResponse.json({ eligible: false, reason: "order_not_pending" }, { headers });
    const { data: payments, error: paymentError } = await db.from("payments")
      .select("status,payment_url").eq("order_id", order.id).eq("provider", "bling").limit(5);
    if (paymentError)
      return NextResponse.json({ error: "Falha ao conferir pagamento." }, { status: 503, headers });
    // Sem confiar em URLs nem afirmar disponibilidade de pagamento: decisão apenas informativa.
    const valid = (payments ?? []).filter(p => ["pending", "processing"].includes(p.status)
      && typeof p.payment_url === "string" && p.payment_url.startsWith("https://"));
    return NextResponse.json({
      eligible: false, reason: valid.length === 1 ? "existing_payment_requires_review" : "pending_order_requires_reconciliation",
      hasExistingPayment: valid.length === 1,
    }, { headers });
  }
  return NextResponse.json({ eligible: true, reason: "eligible_for_future_reservation", earliest, latest }, { headers });
}
