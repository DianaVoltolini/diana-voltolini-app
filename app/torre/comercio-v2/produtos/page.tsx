// app/torre/comercio-v2/produtos/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import css from "../commercial.module.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Produtos | Área Comercial" };
type Query = { salvo?: string; erro?: string; excluido?: string };
type Product = { id:string; code:string; name:string; product_type:string; created_at:string };
type Assignment = { product_id:string; material_id:string; release_mode:string; release_date:string|null };
type Material = { id:string; title:string; available_to_student:boolean };
const types: Record<string, string> = { ebook: "E-book", online_event: "Encontro online", course: "Curso", service: "Serviço", other: "Outro" };
const errors:Record<string,string> = {
  validacao:"Confira os campos obrigatórios.", url:"Informe uma URL HTTPS válida.",
  duplicado:"Este código já está cadastrado.",codigo:"O código não pode ser alterado.",
  salvar:"Não foi possível salvar.", indisponivel:"Produto não encontrado.",
  exclusao_confirmacao:"Confirme a exclusão antes de continuar.",
  exclusao_indisponivel:"Produto não encontrado ou não é rascunho.",
  exclusao_consulta:"Não foi possível conferir os vínculos do produto. Exclusão cancelada.",
  exclusao_vinculos:"Este produto possui materiais, ofertas, páginas ou vínculos de vendas e não pode ser excluído.",
  exclusao_falhou:"Não foi possível excluir o produto.",
};
export default async function ProductsV2({ searchParams }:{ searchParams:Promise<Query> }){
  await requireAdmin();
  const q=await searchParams,db=getSupabaseAdmin();
  const [p,a,m,e]=await Promise.all([
    db.from("commerce_v2_products").select("id,code,name,product_type,created_at").order("created_at",{ascending:false}).limit(500),
    db.from("commerce_v2_product_materials").select("product_id,material_id,release_mode,release_date").limit(5000),
    db.from("commerce_v2_materials").select("id,title,available_to_student").eq("is_archived",false).limit(5000),
    db.from("commerce_v2_material_product_eligibility").select("product_id,material_id").limit(5000),
  ]);
  const products=(p.data??[]) as Product[],assignments=(a.data??[]) as Assignment[];
  const names=new Map(((m.data??[]) as Material[]).map(x=>[x.id,x]));
  return <main className={css.page}>
    <header className={css.header}>
      <div><p className={css.eyebrow}>TORRE · ÁREA COMERCIAL</p>
      <h1 className={css.title}>Produtos cadastrados</h1>
      <p className={css.subtitle}>Consulte seus produtos e o que está configurado para entrega. Cadastre primeiro o produto; depois, na Biblioteca, associe os materiais.</p></div>
      <Link className={css.button} href="/torre/comercio-v2/produtos/novo">+ Cadastrar Produto</Link>
    </header>
    {q.salvo==="1"&&<p className={css.message}>Produto salvo.</p>}
    {q.excluido==="1"&&<p role="status" className={css.message}>Produto excluído.</p>}
    {q.erro&&<p className={css.error}>{errors[q.erro]??"Não foi possível salvar."}</p>}
    {(p.error||a.error||m.error||e.error)?<p className={css.error}>Não foi possível consultar o catálogo ou as entregas. Nenhum dado foi alterado.</p>:
    <section className={css.section}><h2>Produtos ({products.length})</h2>
      <div className={css.tableScroll}><table className={css.table}>
        <thead><tr><th>Código</th><th>Produto</th><th>Tipo</th><th>Materiais para entrega</th><th>Ações</th></tr></thead>
        <tbody>{products.map(product=>{
          const included=assignments.filter(x=>x.product_id===product.id);
          const eligible=(e.data??[]).filter(x=>x.product_id===product.id&&names.get(x.material_id)?.available_to_student);
          return <tr key={product.id}>
            <td>{product.code}</td><td><strong>{product.name}</strong></td>
            <td>{types[product.product_type]??product.product_type}</td>
            <td>{included.length?<div style={{display:"grid",gap:6}}>{included.map(x=><div key={x.material_id}>
              <strong>{names.get(x.material_id)?.title??"Material indisponível"}</strong>
              <small>{x.release_mode==="after_payment"?"Após pagamento confirmado":x.release_date?"A partir de "+x.release_date.split("-").reverse().join("/"):"Data não definida"}</small>
            </div>)}</div> : "Nenhuma entrega programada ainda"}
            {eligible.length>0&&<div style={{marginTop:8}}><strong>{eligible.length} {eligible.length===1?"material disponível na Biblioteca":"materiais disponíveis na Biblioteca"}</strong>
              <small>{eligible.map(x=>names.get(x.material_id)?.title).filter(Boolean).join(" · ")}</small></div>}
            <small>Para liberar cada arquivo, clique em Configurar entregas.</small></td>
            <td><div className={css.actions}>
              <Link className={css.actionIcon} href={"/torre/comercio-v2/produtos/novo?editar="+encodeURIComponent(product.id)} title={"Editar "+product.name} aria-label={"Editar "+product.name}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 5 3 3M4 20l4.2-.8L20 7.4 16.6 4 4.8 15.8 4 20Z"/></svg>
              </Link>
              <Link className={css.secondary} href={"/torre/comercio-v2/produtos/materiais?produto="+encodeURIComponent(product.id)}>Configurar entregas</Link>
              <Link className={css.secondary} href={"/torre/comercio-v2/produtos/excluir?produto="+encodeURIComponent(product.id)}>Excluir</Link>
            </div></td>
          </tr>;
        })}{!products.length&&<tr><td colSpan={5}>Nenhum produto cadastrado.</td></tr>}</tbody>
      </table></div>
      <p className={css.note}>A lista mostra apenas materiais com liberação configurada em Produtos → Configurar entregas. Os materiais associados na Biblioteca podem ainda não estar programados para liberação.</p>
    </section>}
  </main>;
}
