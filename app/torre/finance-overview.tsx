// app/torre/finance-overview.tsx
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import styles from "./painel.module.css";

type Sale = {
  id: string;
  created_at: string;
  paid_at: string | null;
  customer_name: string;
  customer_email: string;
  product_id: string;
  amount_cents: number;
  status: string;
};
type Product = { id: string; name: string; code: string };

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const date = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(value));

export default async function FinanceOverview() {
  const admin = getSupabaseAdmin();
  // Uma linha por pedido, evitando duplicar valores quando houver múltiplas tentativas de pagamento.
  const { data: orders, error: orderError } = await admin.from("orders")
    .select("id, created_at, paid_at, customer_name, customer_email, product_id, amount_cents, status")
    .order("created_at", { ascending: false }).limit(500);
  if (orderError) {
    return <section className={styles.diagnosticsSection}><h2>Financeiro geral</h2>
      <p className={styles.errorMessage}>Não foi possível consultar os pedidos.</p></section>;
  }
  const sales = (orders ?? []) as Sale[];
  const productIds = [...new Set(sales.map((order) => order.product_id))];
  let products: Product[] = [];
  if (productIds.length) {
    const { data, error } = await admin.from("products")
      .select("id, name, code").in("id", productIds);
    if (error) return <section className={styles.diagnosticsSection}><h2>Financeiro geral</h2>
      <p className={styles.errorMessage}>Não foi possível consultar os produtos das vendas.</p></section>;
    products = (data ?? []) as Product[];
  }
  const productById = new Map(products.map((product) => [product.id, product]));
  const received = sales.filter((sale) => sale.status === "paid");
  const pending = sales.filter((sale) => sale.status === "pending");
  const paidTotal = received.reduce((sum, sale) => sum + sale.amount_cents, 0);
  const pendingTotal = pending.reduce((sum, sale) => sum + sale.amount_cents, 0);

  return (
    <section className={styles.diagnosticsSection} id="financeiro">
      <header className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>VENDAS E RECEBIMENTOS</p>
          <h2>Financeiro geral</h2>
          <p style={{ color: "#637280", margin: "10px 0 0" }}>
            Pedidos de todos os produtos. Situação financeira conforme o registro do site e a sincronização com o Bling.
          </p>
        </div>
        <span>Últimos {sales.length} pedidos{sales.length === 500 ? " (limite de visualização)" : ""}</span>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 22 }}>
        <article style={{ padding: 18, border: "1px solid #dce4eb", borderRadius: 9 }}>
          <span style={{ color: "#647381" }}>Recebido</span>
          <strong style={{ display: "block", fontSize: 24, color: "#167044" }}>{money(paidTotal)}</strong>
          <small>{received.length} pedido(s) pago(s)</small>
        </article>
        <article style={{ padding: 18, border: "1px solid #dce4eb", borderRadius: 9 }}>
          <span style={{ color: "#647381" }}>Pendente</span>
          <strong style={{ display: "block", fontSize: 24, color: "#936600" }}>{money(pendingTotal)}</strong>
          <small>{pending.length} pedido(s) aguardando pagamento</small>
        </article>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead><tr><th>Data</th><th>Pessoa</th><th>Serviço</th><th>Valor</th><th>Status</th></tr></thead>
          <tbody>
            {sales.map((sale) => {
              const product = productById.get(sale.product_id);
              const label = sale.status === "paid" ? "Pago" : sale.status === "pending" ? "Pendente" :
                sale.status === "cancelled" || sale.status === "canceled" ? "Cancelado" :
                sale.status === "refunded" ? "Reembolsado" : "Em processamento";
              return <tr key={sale.id}>
                <td>{date(sale.created_at)}</td>
                <td><strong>{sale.customer_name}</strong><small>{sale.customer_email}</small></td>
                <td><strong>{product?.name ?? "Produto não identificado"}</strong><small>{product?.code ?? ""}</small></td>
                <td><strong>{money(sale.amount_cents)}</strong></td>
                <td><span className={styles.status} style={{ color: sale.status === "paid" ? "#177245" : sale.status === "pending" ? "#846611" : "#536271", background: sale.status === "paid" ? "#edf9f2" : sale.status === "pending" ? "#fff7e5" : "#edf1f4" }}>{label}</span></td>
              </tr>;
            })}
            {sales.length === 0 && <tr><td colSpan={5}>Nenhuma venda registrada.</td></tr>}
          </tbody>
        </table>
      </div>
      <p style={{ margin: "12px 0 0", color: "#637280", fontSize: 12 }}>
        Valores baseados nos pedidos do site; não representam a conciliação bancária ou a DRE.
        Data corresponde à criação do pedido.
      </p>
    </section>
  );
}
