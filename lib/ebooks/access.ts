// lib/ebooks/access.ts
// Prazo de acesso contado por DIAS CIVIS no horário de Brasília.
// A data da confirmação do pagamento é a referência; o último dia inteiro
// permanece liberado, independentemente da hora em que o cliente pagou.
// Ex.: pagamento em 12/11/2026 -> término em 10/02/2027.
// A partir de 11/02/2027 não há download, sem bloquear a Área do Cliente.

export const EBOOK_ACCESS_DAYS = 90;
export type PaidEbookOrder = { paid_at: string | null; created_at: string };

function saoPauloCivilDate(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addCivilDays(isoDate: string, days: number): string {
  // Arithmetic on UTC calendar components, without adding hours across DST.
  const date = new Date(isoDate + "T12:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function ebookAccessUntil(orders: PaidEbookOrder[]): Date | null {
  // Só pagamentos confirmados iniciam prazo. Várias compras do mesmo produto
  // podem renová-lo usando a confirmação mais recente.
  const paidDates = orders
    .map(order => order.paid_at ? new Date(order.paid_at) : null)
    .filter((date): date is Date => Boolean(date && Number.isFinite(date.getTime())));
  if (!paidDates.length) return null;
  const latest = new Date(Math.max(...paidDates.map(date => date.getTime())));
  const lastCivilDate = addCivilDays(saoPauloCivilDate(latest), EBOOK_ACCESS_DAYS);
  // Este Date é marcador do DIA civil final, não um horário de corte.
  // Meio-dia UTC corresponde ao mesmo dia civil de Brasília.
  return new Date(lastCivilDate + "T12:00:00.000Z");
}

export function ebookAccessActive(until: Date | null, now = new Date()): boolean {
  return Boolean(until && Number.isFinite(until.getTime()) &&
    saoPauloCivilDate(now) <= saoPauloCivilDate(until));
}

export function ebookAccessDateLabel(until: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", dateStyle: "short",
  }).format(until);
}
