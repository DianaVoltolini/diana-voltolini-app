// app/torre/ebooks/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import styles from "../painel.module.css";

export const metadata: Metadata = { title: "Gestão de E-books" };
export const dynamic = "force-dynamic";

export default async function EbooksAdminPage() {
  await requireAdmin();
  const db = getSupabaseAdmin();
  const { data: product, error: productError } = await db.from("products")
    .select("id,name,code").eq("code","EBOOK-IBSCBS-001").maybeSingle();
  if (productError) throw new Error("Falha ao verificar o produto.");
  const { data, error } = product
    ? await db.from("orders").select("id,customer_name,customer_email,created_at,status,amount_cents")
      .eq("product_id",product.id).order("created_at",{ascending:false}).limit(200)
    : {data:[],error:null};
  const orders = data??[];
  const paid = orders.filter(x=>x.status==="paid").length;
  const pending = orders.filter(x=>x.status==="pending").length;
  return <main className={styles.page}><section className={styles.content}><div className="container">
    
    <header className={styles.pageHeader}><div><p className={styles.eyebrow}>GESTÃO DE PRODUTOS</p><h1>E-books</h1>
      <p>Pedidos do e-book IBS e CBS na Prática, com situação do pagamento.</p></div></header>
    <section className={styles.summaryGrid}>
      <article><span>Pedidos pagos</span><strong>{paid}</strong><small>Compras confirmadas</small></article>
      <article><span>Pedidos pendentes</span><strong>{pending}</strong><small>Aguardando confirmação</small></article>
    </section>
    <section className={styles.diagnosticsSection}><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>VENDAS</p><h2>Pedidos do e-book</h2></div></header>
      {error ? <p className={styles.errorMessage}>Não foi possível carregar os pedidos do e-book.</p>
        : <div className={styles.tableWrapper}><table className={styles.table}>
        <thead><tr><th>Data</th><th>Cliente</th><th>Valor</th><th>Status</th></tr></thead>
        <tbody>{orders.map(x=><tr key={x.id}><td>{new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(x.created_at))}</td>
          <td><strong>{x.customer_name}</strong><small>{x.customer_email}</small></td>
          <td>{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(x.amount_cents/100)}</td>
          <td><span className={styles.status}>{x.status==="paid"?"Pago":x.status==="pending"?"Pendente":x.status==="cancelled"?"Cancelado":"Outro"}</span></td></tr>)}
          {!orders.length&&<tr><td colSpan={4}>Nenhuma venda encontrada.</td></tr>}</tbody>
        </table></div>}
      <p style={{fontSize:12,color:"#647381",marginTop:12}}>Até 200 pedidos recentes. Para filtros completos, utilize o <Link href="/torre/financeiro">Financeiro Geral</Link>.</p>
    </section>
  </div></section></main>;
}
