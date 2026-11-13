// app/torre/comercio-v2/ofertas/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import styles from "./offers.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ofertas e Preços | Torre" };

type Product = { id: string; code: string; name: string };
type Offer = {
  id: string; product_id: string; name: string; description: string | null;
  regular_price_cents: number; promotional_price_cents: number | null;
  promo_starts_on: string | null; promo_ends_on: string | null;
  status: string; version: number; created_at: string;
};
const brl = (cents: number) => new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL",
}).format(cents / 100);
const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short", timeZone: "America/Sao_Paulo",
});
type Params = { salvo?: string; erro?: string };
const errorMessage: Record<string, string> = {
  validacao: "Confira os preços, datas e informações obrigatórias.",
  produto: "O produto selecionado não está disponível na V2.",
  salvar: "Não foi possível salvar a oferta. Confira a migração SQL.",
  conflito: "A oferta foi alterada em outra sessão. Reabra o cadastro antes de editar.",
};
export default async function OffersPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin();
  const query = await searchParams;
  const db = getSupabaseAdmin();
  const [offersResult, productsResult] = await Promise.all([
    db.from("commerce_v2_offers").select(
      "id,product_id,name,description,regular_price_cents,promotional_price_cents,promo_starts_on,promo_ends_on,status,version,created_at",
    ).order("created_at", { ascending: false }).limit(500),
    db.from("commerce_v2_products").select("id,code,name").order("name").limit(500),
  ]);
  const offers = (offersResult.data ?? []) as Offer[];
  const products = (productsResult.data ?? []) as Product[];
  const names = new Map(products.map(p => [p.id, p]));
  return <main className={styles.page}>
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>TORRE · ÁREA COMERCIAL</p>
        <h1>Ofertas e Preços</h1>
        <p>Cadastre condições comerciais para produtos V2. Nenhuma oferta gera vendas nesta fase.</p>
      </div>
      <Link className={styles.add} href="/torre/comercio-v2/ofertas/novo">+ Nova oferta</Link>
    </header>
    {query.salvo === "1" && <p role="status" className={styles.message}>Oferta salva em rascunho.</p>}
    {query.erro && <p role="alert" className={styles.error}>{errorMessage[query.erro] ?? "Falha na operação."}</p>}
    <section className={styles.section}>
      <h2>Ofertas cadastradas</h2>
      {(offersResult.error || productsResult.error)
        ? <p role="alert" className={styles.error}>Ofertas indisponíveis. Confirme a migração do F2 no Supabase.</p>
        : <div className={styles.scroll}><table className={styles.table}>
          <thead><tr><th>Data</th><th>Oferta</th><th>Produto</th><th>Preço normal</th><th>Promocional</th><th>Vigência</th><th>Situação</th><th>Ações</th></tr></thead>
          <tbody>{offers.map(o => <tr key={o.id}>
            <td>{date.format(new Date(o.created_at))}</td>
            <td><strong>{o.name}</strong><small>Versão {o.version}</small></td>
            <td>{names.get(o.product_id)?.name ?? "Produto não encontrado"}<small>{names.get(o.product_id)?.code}</small></td>
            <td>{brl(o.regular_price_cents)}</td>
            <td>{o.promotional_price_cents === null ? "—" : brl(o.promotional_price_cents)}</td>
            <td>{o.promo_starts_on && o.promo_ends_on ? o.promo_starts_on.split("-").reverse().join("/") + " a " + o.promo_ends_on.split("-").reverse().join("/") : "—"}</td>
            <td>Rascunho</td>
            <td>
              <div className={styles.actions}>
                <Link
                  className={styles.actionIcon}
                  href={"/torre/comercio-v2/ofertas/novo?editar=" + encodeURIComponent(o.id)}
                  title={"Editar oferta: " + o.name}
                  aria-label={"Editar oferta: " + o.name}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m16 5 3 3M4 20l4.2-.8L20 7.4 16.6 4 4.8 15.8 4 20Z"/>
                  </svg>
                </Link>
                <Link
                  className={styles.actionIcon}
                  href={"/torre/comercio-v2/ofertas/novo?editar=" + encodeURIComponent(o.id) + "#historico"}
                  title={"Ver histórico: " + o.name}
                  aria-label={"Ver histórico de preços: " + o.name}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>
                  </svg>
                </Link>
              </div>
            </td>
          </tr>)}
          {offers.length === 0 && <tr><td colSpan={8}>Nenhuma oferta cadastrada.</td></tr>}
          </tbody>
        </table></div>}
      {offers.length === 500 && <p className={styles.note}>Mostrando os últimos 500 registros. Paginação será adicionada antes de uso em escala.</p>}
    </section>
  </main>;
}
