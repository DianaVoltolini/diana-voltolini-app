// app/torre/comercio-v2/paginas/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import css from "../commercial.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Páginas de Vendas | Área Comercial" };

type Page = {
 id: string; slug: string; title: string; template: string; product_id: string;
 offer_id: string; status: string; version: number; created_at: string;
};
type Product = { id: string; name: string; code: string };
type Query = { salvo?: string; erro?: string };
const errors: Record<string,string> = {
 validacao: "Confira os campos obrigatórios e os limites de texto.",
 vinculo: "O produto e a oferta devem pertencer ao mesmo cadastro V2.",
 slug: "O endereço da página não pode ser alterado depois de cadastrado.",
 duplicado: "Este endereço já foi utilizado.",
 salvar: "Não foi possível salvar. Confirme a migração de páginas.",
 conflito: "Este cadastro foi alterado em outra sessão. Abra-o novamente.",
 nao_encontrada: "Página não encontrada.",
};
export default async function CommercialPages({ searchParams }: { searchParams: Promise<Query> }) {
 await requireAdmin();
 const q = await searchParams;
 const db = getSupabaseAdmin();
 const [pagesResult, productsResult] = await Promise.all([
  db.from("commerce_v2_pages").select("id,slug,title,template,product_id,offer_id,status,version,created_at")
    .order("created_at",{ascending:false}).limit(500),
  db.from("commerce_v2_products").select("id,name,code").order("name").limit(500),
 ]);
 const pages = (pagesResult.data ?? []) as Page[];
 const products = (productsResult.data ?? []) as Product[];
 const pmap = new Map(products.map(p => [p.id,p]));
 return <main className={css.page}>
  <header className={css.header}>
   <div>
    <p className={css.eyebrow}>TORRE · ÁREA COMERCIAL</p>
    <h1 className={css.title}>Páginas de Vendas</h1>
    <p className={css.subtitle}>Crie páginas de apresentação para produtos e ofertas. Nesta etapa, somente rascunhos administrativos.</p>
   </div>
   <Link className={css.button} href="/torre/comercio-v2/paginas/novo">+ Nova página</Link>
  </header>
  <div className={css.banner}><strong>Publicação e checkout desabilitados</strong>A prévia é acessível somente para administradores. Nenhum link de venda será ativado por este cadastro.</div>
  {q.salvo === "1" && <p className={css.message} role="status">Página salva em rascunho.</p>}
  {q.erro && <p className={css.error} role="alert">{errors[q.erro] ?? "Não foi possível salvar."}</p>}
  <section className={css.section}>
   <h2>Páginas cadastradas</h2>
   {pagesResult.error || productsResult.error ? <p className={css.error} role="alert">Não foi possível consultar as páginas V2. Confira a migração F3A.</p> :
   <div className={css.tableScroll}><table className={css.table}>
    <thead><tr><th>Data</th><th>Página</th><th>Produto</th><th>Modelo</th><th>Situação</th><th>Ações</th></tr></thead>
    <tbody>{pages.map(page => <tr key={page.id}>
     <td>{new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(page.created_at))}</td>
     <td><strong>{page.title}</strong><small>{page.slug} · versão {page.version}</small></td>
     <td>{pmap.get(page.product_id)?.name ?? "—"}<small>{pmap.get(page.product_id)?.code}</small></td>
     <td>{page.template === "online_event" ? "Encontro online" : page.template === "ebook" ? "E-book" : page.template === "service" ? "Serviço" : "Curso"}</td>
     <td>Rascunho</td>
     <td><div className={css.actions}>
      <Link className={css.actionIcon} href={"/torre/comercio-v2/paginas/novo?editar="+encodeURIComponent(page.id)} title="Editar página" aria-label={"Editar "+page.title}>
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 5 3 3M4 20l4.2-.8L20 7.4 16.6 4 4.8 15.8 4 20Z"/></svg>
      </Link>
      <Link className={css.actionIcon} href={"/torre/comercio-v2/paginas/previa/"+encodeURIComponent(page.id)} title="Pré-visualizar página" aria-label={"Pré-visualizar "+page.title}>
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7-3.5 7-10 7-10 7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
      </Link>
     </div></td>
    </tr>)}
    {pages.length===0 && <tr><td colSpan={6}>Nenhuma página cadastrada.</td></tr>}
    </tbody>
   </table></div>}
  </section>
 </main>;
}
