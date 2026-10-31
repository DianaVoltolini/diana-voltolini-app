// app/api/fiscal/renewal/reserve/route.ts
// Reserva LOCAL de mensalidade; não chama o Bling nem gera pagamento.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };
const reply = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, { status, headers });

export async function POST() {
  // Fail-closed: ativar SOMENTE após homologação das migrações e fluxo de pagamento.
  if (process.env.FISCAL_RENEWAL_RESERVATION_ENABLED !== "1") {
    return reply({ error: "Reserva de renovação indisponível." }, 503);
  }

  const auth = await createClient();
  const { data, error } = await auth.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (error || !userId) return reply({ error: "Autenticação necessária." }, 401);

  const db = getSupabaseAdmin();
  const { data: subscriptions, error: subsError } = await db
    .from("fiscal_subscriptions")
    .select("id,status,paid_until,renewal_enabled,cancellation_requested_at")
    .eq("user_id", userId)
    .in("status", ["active", "past_due"])
    .eq("renewal_enabled", true)
    .is("cancellation_requested_at", null)
    .not("paid_until", "is", null)
    .limit(2);

  if (subsError) return reply({ error: "Falha ao consultar assinatura." }, 503);
  if (!subscriptions || subscriptions.length !== 1)
    return reply({ error: "Assinatura não elegível ou exige conferência." }, 409);

  // O RPC faz a validação definitiva sob bloqueio transacional, inclusive
  // a janela de vencimento e a regra de uma mensalidade por competência.
  // userId vem exclusivamente dos claims autenticados, nunca do cliente.
  const { data: reserved, error: reserveError } = await db.rpc("reserve_fiscal_renewal", {
    p_subscription_id: subscriptions[0].id,
    p_user_id: userId,
  });

  if (reserveError) {
    // Não revelar estrutura do banco nem tratar falha como autorização de cobrança.
    return reply({ error: "Não foi possível reservar a mensalidade. Verifique a assinatura." }, 409);
  }
  const record = Array.isArray(reserved) ? reserved[0] : null;
  if (!record?.invoice_id || !record?.reserved_order_id)
    return reply({ error: "Reserva sem identificação válida; requer conferência." }, 503);

  // Nunca apresentar pagamento_url nem indicar que há cobrança Bling.
  return reply({
    reserved: true,
    invoiceId: record.invoice_id,
    orderId: record.reserved_order_id,
    paymentCreated: false,
  });
}
