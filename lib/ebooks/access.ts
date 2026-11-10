// Prazo individual contado da confirmação do pagamento, sem prorrogação por atualização.
export const EBOOK_ACCESS_DAYS = 90;
export type PaidEbookOrder = { paid_at: string | null; created_at: string };
export function ebookAccessUntil(orders: PaidEbookOrder[]): Date | null {
  if (!orders.length) return null;
  const newest = orders.map(order => new Date(order.paid_at ?? order.created_at).getTime())
    .filter(Number.isFinite).sort((a, b) => b - a)[0];
  return newest === undefined ? null : new Date(newest + EBOOK_ACCESS_DAYS * 86400000);
}
export function ebookAccessActive(until: Date | null, now = new Date()): boolean {
  return Boolean(until && until.getTime() > now.getTime());
}
export function ebookAccessDateLabel(until: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short" }).format(until);
}
