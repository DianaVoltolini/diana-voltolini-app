// app/torre/comercio-v2/produtos/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { saveCommerceV2Product } from "./actions";
import css from "../commercial.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Produtos | Área Comercial" };
type Query = { edit?: string; salvo?: string; erro?: string };
type Product = {
  id: string; code: string; name: string; short_name: string | null;
  product_type: string; summary: string | null; description: string | null;
  delivery_description: string | null; sales_page_url: string | null;
  status: string; created_at: string;
};
const errorText: Record<string, string> = {
  validacao: "Confira os campos obrigatórios e seus limites.",
  url: "Informe uma URL HTTPS válida.",
  duplicado: "Este código já está cadastrado.",
  codigo: "O código não pode ser alterado após o cadastro.",
  salvar: "Não foi possível salvar. Confira a migração e tente novamente.",
  indisponivel: "Produto não encontrado ou cadastro V2 indisponível.",
};
const types: Record<string, string> = {
  ebook: "E-book", online_event: "Encontro online", course: "Curso",
  service: "Serviço", other: "Outro",
};
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "12px", borderRadius: 8,
  border: "1px solid #cbd5e1", background: "#fff", color: "#142137",
  marginTop: 6, boxSizing: "border-box",
};
const fieldStyle: React.CSSProperties = { display: "block", fontSize: 14, fontWeight: 600, marginBottom: 14 };
function humanDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
export default async function ProductsV2({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("commerce_v2_products")
    .select("id,code,name,short_name,product_type,summary,description,delivery_description,sales_page_url,status,created_at")
    .order("created_at", { ascending: false }).limit(100);
  const products = (data ?? []) as Product[];
  const edit = query.edit ? products.find(p => p.id === query.edit) : null;

  return <main className={css.page}>
    <header className={css.header}>
      <div>
        <p className={css.eyebrow}>TORRE · ÁREA COMERCIAL</p>
        <h1 className={css.title}>Produtos</h1>
        <p className={css.subtitle}>Cadastre seus produtos e organize os materiais relacionados. Os registros desta área ainda não geram vendas.</p>
      </div>
      <Link className={css.secondary} href="/torre/comercio-v2/materiais">Biblioteca de Materiais</Link>
    </header>
    <div className={css.banner}><strong>Produtos em rascunho</strong>Nenhum cadastro desta área está conectado ao checkout ou às entregas atuais.</div>
    {query.salvo === "1" && <p role="status" className={css.message}>Produto salvo em rascunho.</p>}
    {query.erro && <p role="alert" className={css.error}>{errorText[query.erro] ?? "Não foi possível concluir a operação."}</p>}
    {error ? <section role="alert" className={css.error}>O catálogo V2 não está disponível. Verifique a migração SQL; os produtos antigos permanecem inalterados.</section> : <>
      <section className={css.section}>
        <h2>Produtos cadastrados ({products.length})</h2>
        <div className={css.tableScroll}>
          <table className={css.table}>
            <thead><tr><th>Data</th><th>Código</th><th>Produto</th><th>Tipo</th><th>Situação</th><th>Ações</th></tr></thead>
            <tbody>
              {products.map(product => <tr key={product.id}>
                <td>{humanDate(product.created_at)}</td>
                <td>{product.code}</td>
                <td><strong>{product.name}</strong><small>{product.short_name ?? ""}</small></td>
                <td>{types[product.product_type] ?? product.product_type}</td>
                <td>Rascunho</td>
                <td><div className={css.actions}>
                  <Link className={css.actionIcon} href={"/torre/comercio-v2/produtos?edit=" + encodeURIComponent(product.id)} title={"Editar " + product.name} aria-label={"Editar " + product.name}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 5 3 3M4 20l4.2-.8L20 7.4 16.6 4 4.8 15.8 4 20Z"/></svg>
                  </Link>
                  <Link className={css.secondary} href={"/torre/comercio-v2/produtos/materiais?produto=" + encodeURIComponent(product.id)}>Materiais para entrega</Link>
                </div></td>
              </tr>)}
              {products.length === 0 && <tr><td colSpan={6}>Nenhum produto cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className={css.section} id="cadastro">
        <h2>{edit ? "Editar produto" : "Novo produto"}</h2>
        {edit && <p><Link className={css.link} href="/torre/comercio-v2/produtos#cadastro">+ Cadastrar outro</Link></p>}
        <form action={saveCommerceV2Product} className={`${css.form} ${css.formWide}`}>
          <input type="hidden" name="id" value={edit?.id ?? ""}/>
          <div className={css.formRow}>
            <label>Código interno
              <input name="code" required maxLength={60} minLength={3} pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,59}"
                defaultValue={edit?.code ?? "TESTE-FLUXO-001"} readOnly={Boolean(edit)}/>
            </label>
            <label>Nome do produto
              <input name="name" required minLength={3} maxLength={180} defaultValue={edit?.name ?? "Produto piloto — Validação da Torre V2"}/>
            </label>
          </div>
          <div className={css.formRowBalanced}>
            <label>Nome resumido
              <input name="short_name" maxLength={120} defaultValue={edit?.short_name ?? ""}/>
            </label>
            <label>Tipo de produto
              <select name="product_type" defaultValue={edit?.product_type ?? "online_event"}>
                {Object.entries(types).map(([key,label])=><option key={key} value={key}>{label}</option>)}
              </select>
            </label>
          </div>
          <label>Descrição curta
            <textarea name="summary" rows={3} maxLength={600} defaultValue={edit?.summary ?? ""}/>
          </label>
          <label>Descrição completa
            <textarea name="description" rows={5} maxLength={8000} defaultValue={edit?.description ?? ""}/>
          </label>
          <label>O que será entregue
            <textarea name="delivery_description" rows={4} maxLength={4000} defaultValue={edit?.delivery_description ?? "Material demonstrativo, sem cobrança ou entrega real."}/>
          </label>
          <label>Link da página (referência)
            <input name="sales_page_url" type="url" maxLength={500} placeholder="https://..." defaultValue={edit?.sales_page_url ?? ""}/>
          </label>
          <p className={css.note}>Cadastro exclusivamente em rascunho. Nenhuma publicação ou cobrança será gerada.</p>
          <div><button type="submit">Salvar produto</button></div>
        </form>
      </section>
    </>}
  </main>;
}
