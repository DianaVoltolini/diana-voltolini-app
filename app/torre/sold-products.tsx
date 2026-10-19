// app/torre/sold-products.tsx
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import styles from "./painel.module.css";

export default async function SoldProducts() {
  const db = getSupabaseAdmin();
  const { data: orders, error } = await db.from("orders")
    .select("id,product_id,customer_name,status,created_at")
    .order("created_at",{ascending:false}).limit(200);
  if (error) return <p className={styles.errorMessage}>Não foi possível consultar as vendas dos demais produtos.</p>;
  const rows = orders ?? [];
  const ids = [...new Set(rows.map(x=>x.product_id))];
  const {data:products,error:productsError} = ids.length
    ? await db.from("products").select("id,name,code").in("id",ids)
    : {data:[],error:null};
  if(productsError)return <p className={styles.errorMessage}>Não foi possível consultar os nomes dos produtos.</p>;
  const names = new Map((products??[]).map(x=>[x.id,x.name]));
  const grouped = new Map<string,{name:string,sold:number,paid:number,pending:number}>();
  for(const order of rows) {
    const entry=grouped.get(order.product_id)??{name:names.get(order.product_id)??"Produto não identificado",sold:0,paid:0,pending:0};
    entry.sold++;if(order.status==="paid")entry.paid++;if(order.status==="pending")entry.pending++;
    grouped.set(order.product_id,entry);
  }
  return <section className={styles.diagnosticsSection} aria-label="Todos os produtos vendidos">
    <header className={styles.sectionHeader}><div><p className={styles.eyebrow}>PORTFÓLIO</p><h2>Todos os serviços e produtos vendidos</h2></div></header>
    <div className={styles.tableWrapper}><table className={styles.table}>
      <thead><tr><th>Serviço / Produto</th><th>Pedidos</th><th>Pagos</th><th>Pendentes</th><th></th></tr></thead>
      <tbody>{[...grouped.entries()].map(([id,x])=><tr key={id}><td><strong>{x.name}</strong></td><td>{x.sold}</td><td>{x.paid}</td><td>{x.pending}</td><td><Link href="/torre/financeiro" className={styles.openLink}>Financeiro</Link></td></tr>)}
      {grouped.size===0&&<tr><td colSpan={5}>Nenhuma venda localizada.</td></tr>}</tbody>
    </table></div>
    <p style={{color:"#637280",fontSize:12,marginTop:12}}>Resumo dos últimos 200 pedidos. Abaixo permanece a gestão individual dos Diagnósticos.</p>
  </section>;
}
