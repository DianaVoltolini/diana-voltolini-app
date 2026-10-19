// app/torre/finance-overview.tsx
import type { CSSProperties } from "react";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import styles from "./painel.module.css";

type Sale = { id: string; created_at: string; customer_name: string; customer_email: string; product_id: string; amount_cents: number; status: string };
type Product = { id: string; name: string; code: string };
type Filters = { de?: string; ate?: string; cliente?: string; servico?: string; status?: string };
const currency = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const dateLabel = (value: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(value));
const localDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const validDate = (s: string | undefined) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s ? s : undefined;
const field: CSSProperties = { width: "100%", minWidth: 0, padding: "10px", borderRadius: 7, border: "1px solid #cbd5e1", background: "#fff", color: "#0d1b2a" };

export default async function FinanceOverview({ filters }: { filters: Filters }) {
  const admin = getSupabaseAdmin();
  const today = localDate(new Date());
  const start = validDate(filters.de) ?? today.slice(0, 7) + "-01";
  const end = validDate(filters.ate) ?? today;
  const customer = (filters.cliente ?? "").trim().slice(0, 120);
  const service = (filters.servico ?? "").trim();
  const status = ["paid", "pending", "other"].includes(filters.status ?? "") ? filters.status! : "";
  const { data: catalog, error: catalogError } = await admin.from("products").select("id, name, code").order("name");
  if (catalogError) return <section className={styles.diagnosticsSection}><p className={styles.errorMessage}>Não foi possível consultar o catálogo de produtos.</p></section>;
  const products = (catalog ?? []) as Product[];
  const productMap = new Map(products.map((p) => [p.id, p]));
  let query = admin.from("orders")
    .select("id, created_at, customer_name, customer_email, product_id, amount_cents, status")
    .gte("created_at", start + "T00:00:00-03:00")
    .lt("created_at", new Date(new Date(end + "T00:00:00-03:00").getTime() + 86400000).toISOString())
    .order("created_at", { ascending: false }).limit(1000);
  if (service && products.some((p) => p.id === service)) query = query.eq("product_id", service);
  if (status === "paid" || status === "pending") query = query.eq("status", status);
  else if (status === "other") query = query.not("status", "in", '("paid","pending")');
  if (customer) {
    const safeCustomer = customer.replace(/[%_,().\\]/g, "");
    if (safeCustomer) query = query.or(`customer_name.ilike.%${safeCustomer}%,customer_email.ilike.%${safeCustomer}%`);
  }
  const { data, error } = start <= end ? await query : { data: [], error: null };
  if (error) return <section className={styles.diagnosticsSection}><p className={styles.errorMessage}>Não foi possível consultar o financeiro geral.</p></section>;
  const sales = (data ?? []) as Sale[];
  const paid = sales.filter((x) => x.status === "paid");
  const pending = sales.filter((x) => x.status === "pending");
  const total = (rows: Sale[]) => rows.reduce((sum, x) => sum + x.amount_cents, 0);
  return <section className={styles.diagnosticsSection} id="financeiro">
    <header className={styles.sectionHeader}><div><p className={styles.eyebrow}>VENDAS E RECEBIMENTOS</p><h2>Financeiro geral</h2>
      <p style={{ color: "#637280" }}>Consulte as vendas por período, cliente, produto e situação do pagamento.</p></div></header>
    <form method="get" action="/torre/financeiro" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 12, marginBottom: 24, alignItems: "end" }}>
      <label style={{ fontSize: 13, fontWeight: 700 }}>De<input name="de" type="date" defaultValue={start} style={field}/></label>
      <label style={{ fontSize: 13, fontWeight: 700 }}>Até<input name="ate" type="date" defaultValue={end} style={field}/></label>
      <label style={{ fontSize: 13, fontWeight: 700 }}>Cliente<input name="cliente" defaultValue={customer} placeholder="Nome ou e-mail" style={field}/></label>
      <label style={{ fontSize: 13, fontWeight: 700 }}>Serviço<select name="servico" defaultValue={service} style={field}>
        <option value="">Todos</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label style={{ fontSize: 13, fontWeight: 700 }}>Status<select name="status" defaultValue={status} style={field}>
        <option value="">Todos</option><option value="paid">Pago</option><option value="pending">Pendente</option><option value="other">Outros</option></select></label>
      <button type="submit" className={styles.openLink} style={{ cursor: "pointer" }}>Filtrar</button>
      <a href="/torre/financeiro#financeiro" style={{ color: "#856511", fontWeight: 700, fontSize: 13 }}>Limpar filtros</a>
    </form>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 22 }}>
      <article style={{ padding: 18, border: "1px solid #dce4eb", borderRadius: 9 }}><span>Recebido</span><strong style={{ display: "block", fontSize: 26, color: "#177245" }}>{currency(total(paid))}</strong><small>{paid.length} pedido(s) pago(s)</small></article>
      <article style={{ padding: 18, border: "1px solid #dce4eb", borderRadius: 9 }}><span>Pendente</span><strong style={{ display: "block", fontSize: 26, color: "#906600" }}>{currency(total(pending))}</strong><small>{pending.length} pedido(s) pendente(s)</small></article>
    </div>
    <div className={styles.tableWrapper}><table className={styles.table}>
      <thead><tr><th>Data</th><th>Pessoa</th><th>Serviço</th><th>Valor</th><th>Status</th></tr></thead>
      <tbody>{sales.map((x) => <tr key={x.id}><td>{dateLabel(x.created_at)}</td><td><strong>{x.customer_name}</strong><small>{x.customer_email}</small></td>
        <td>{productMap.get(x.product_id)?.name ?? "Produto não identificado"}</td><td>{currency(x.amount_cents)}</td>
        <td><span className={styles.status} style={{ color: x.status === "paid" ? "#177245" : x.status === "pending" ? "#755000" : "#536271" }}>{x.status === "paid" ? "Pago" : x.status === "pending" ? "Pendente" : x.status === "cancelled" || x.status === "canceled" ? "Cancelado" : x.status === "refunded" ? "Reembolsado" : "Outro"}</span></td></tr>)}
        {!sales.length && <tr><td colSpan={5}>Nenhum pedido encontrado neste período.</td></tr>}</tbody></table></div>
    <p style={{ marginTop: 12, color: "#637280", fontSize: 12 }}>Data = criação do pedido. Indicadores acompanham os filtros selecionados. Exibição limitada a 1.000 registros; não corresponde à conciliação bancária.</p>
  </section>;
}
