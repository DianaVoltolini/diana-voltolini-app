// lib/ebooks/access.ts
// Acesso ao e-book: 90 dias exatos a partir da confirmação do pagamento.
// A expiração limita apenas visualizar e baixar o PDF. Não bloqueia a Área do Cliente.

export const EBOOK_ACCESS_DAYS = 90;
export type PaidEbookOrder = { paid_at: string | null; created_at: string };

export function ebookAccessUntil(orders: PaidEbookOrder[]): Date | null {
  // Nunca iniciar o prazo na criação do pedido, mesmo que status esteja 'paid'.
  const timestamps = orders
    .map((order) => order.paid_at ? new Date(order.paid_at).getTime() : NaN)
    .filter(Number.isFinite);
  if (timestamps.length === 0) return null;

  // Em compras posteriores confirmadas, aplica-se o prazo da compra mais recente.
  const mostRecentPayment = Math.max(...timestamps);
  return new Date(mostRecentPayment + EBOOK_ACCESS_DAYS * 86400000);
}

export function ebookAccessActive(until: Date | null, now = new Date()): boolean {
  return Boolean(until && until.getTime() > now.getTime());
}

export function ebookAccessDateLabel(until: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
  }).format(until);
}
