// app/torre/comercio-v2/ofertas/novo/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { saveCommerceV2Offer } from "../actions";
import styles from "../offers.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Editar oferta V2 | Torre" };

type Query = { editar?: string; produto?: string };
type Product = { id: string; code: string; name: string };
type Offer = {
  id: string; product_id: string; name: string; description: string | null;
  regular_price_cents: number; promotional_price_cents: number | null;
  promo_starts_on: string | null; promo_ends_on: string | null; version: number;
};
type Revision = {
  id: number; version: number; name: string; regular_price_cents: number;
  promotional_price_cents: number | null; saved_at: string;
};
const displayValue = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? "" : (cents / 100).toFixed(2).replace(".", ",");
const money = (cents: number) => new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL",
}).format(cents / 100);
export default async function OfferEditor({ searchParams }: { searchParams: Promise<Query> }) {
  await requireAdmin();
  const query = await searchParams;
  const db = getSupabaseAdmin();
  const [productsResult, offerResult] = await Promise.all([
    db.from("commerce_v2_products").select("id,code,name").order("name").limit(500),
    query.editar
      ? db.from("commerce_v2_offers")
          .select("id,product_id,name,description,regular_price_cents,promotional_price_cents,promo_starts_on,promo_ends_on,version")
          .eq("id", query.editar).eq("status", "draft").maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const offer = offerResult.data as Offer | null;
  const products = (productsResult.data ?? []) as Product[];
  const selected = offer?.product_id ?? (products.some(p => p.id === query.produto) ? query.produto : "");
  const missing = Boolean(query.editar && !offer);
  const historyResult = offer
    ? await db.from("commerce_v2_offer_revisions")
        .select("id,version,name,regular_price_cents,promotional_price_cents,saved_at")
        .eq("offer_id", offer.id).order("version", { ascending: false }).limit(50)
    : { data: [], error: null };
  const revisions = (historyResult.data ?? []) as Revision[];
  return <main className={styles.page}>
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>COMÉRCIO V2 · OFERTAS E PREÇOS</p>
        <h1>{offer ? "Editar oferta" : "Nova oferta"}</h1>
        <p>Valores de teste vinculados aos produtos V2. Nenhuma cobrança será gerada.</p>
      </div>
      <Link href="/torre/comercio-v2/ofertas">Voltar à lista</Link>
    </header>
    {(productsResult.error || offerResult.error || missing || historyResult.error)
      ? <p className={styles.error} role="alert">Não foi possível carregar a oferta. Confira a migração F2.</p>
      : <form action={saveCommerceV2Offer} className={styles.form}>
        <input type="hidden" name="id" value={offer?.id ?? ""}/>
        <input type="hidden" name="version" value={offer?.version ?? 1}/>
        <label>Produto V2
          <select name="product_id" required defaultValue={selected} key={selected}>
            <option value="" disabled>Selecione um produto</option>
            {products.map(p => <option value={p.id} key={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </label>
        <label>Nome da oferta
          <input name="name" minLength={3} maxLength={160} required defaultValue={offer?.name ?? ""} placeholder="Ex.: Black November — Encontro Online"/>
        </label>
        <label>Descrição da oferta
          <textarea name="description" rows={3} maxLength={2000} defaultValue={offer?.description ?? ""} placeholder="Descreva a campanha e suas condições."/>
        </label>
        <div className={styles.formGrid}>
          <label>Preço normal (R$)
            <input name="regular_price" inputMode="decimal" required placeholder="297,00" defaultValue={displayValue(offer?.regular_price_cents)}/>
          </label>
          <label>Preço promocional (R$) — opcional
            <input name="promotional_price" inputMode="decimal" placeholder="97,00" defaultValue={displayValue(offer?.promotional_price_cents)}/>
          </label>
        </div>
        <div className={styles.formGrid}>
          <label>Início da promoção
            <input type="date" name="promo_starts_on" defaultValue={offer?.promo_starts_on ?? ""}/>
          </label>
          <label>Fim da promoção
            <input type="date" name="promo_ends_on" defaultValue={offer?.promo_ends_on ?? ""}/>
          </label>
        </div>
        <p className={styles.note}>Para cadastrar promoção, informe o preço com desconto e as duas datas. O desconto deve ser inferior ao preço normal. As datas não ativam vendas automaticamente.</p>
        <p className={styles.note}><strong>Situação: rascunho.</strong> Publicação, checkout e alteração de cobranças permanecem indisponíveis.</p>
        <footer><button type="submit" disabled={products.length === 0}>Salvar oferta</button><Link href="/torre/comercio-v2/ofertas">Cancelar</Link></footer>
      </form>}
    {offer && !historyResult.error && <section className={styles.history}>
      <h2>Histórico de preços e alterações</h2>
      <p className={styles.note}>Cada salvamento gera uma versão para conferência. O histórico não é editável pela Torre.</p>
      <ol>{revisions.map(r => <li key={r.id}>
        <strong>Versão {r.version}</strong> · {new Date(r.saved_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        {" — "}{money(r.regular_price_cents)}
        {r.promotional_price_cents !== null ? " · promocional " + money(r.promotional_price_cents) : ""}
      </li>)}</ol>
    </section>}
  </main>;
}
