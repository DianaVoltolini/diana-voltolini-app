import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import SoldProducts from "../sold-products";
import styles from "../painel.module.css";
export const metadata:Metadata={title:"Vendas | Torre de Controle"};
export const dynamic="force-dynamic";
export default async function VendasPage(){
 await requireAdmin();
 const db=getSupabaseAdmin();
 const [subscriptions,product,orders]=await Promise.all([
 db.from("fiscal_subscriptions").select("id,status,renewal_enabled").limit(1000),
 db.from("products").select("id").eq("code","EBOOK-IBSCBS-001").maybeSingle(),
 db.from("orders").select("id,customer_name,customer_email,created_at,status,amount_cents,product_id").order("created_at",{ascending:false}).limit(1000)
 ]);
 const subs=subscriptions.data??[],sales=(orders.data??[]).filter(x=>x.product_id===product.data?.id);
 const paid=sales.filter(x=>x.status==="paid").length,pending=sales.filter(x=>x.status==="pending").length;
 const money=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
 const day=(v:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(v));
 return <main className={styles.page}><section className={styles.content}><div className="container">
 <header className={styles.pageHeader}><div><p className={styles.eyebrow}>ADMINISTRAÇÃO</p><h1>Vendas</h1><p>Resumo de produtos e serviços comercializados, e-books e assinaturas.</p></div></header>
 <SoldProducts/>
 <section className={styles.diagnosticsSection}><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>ACOMPANHAMENTO OPERACIONAL</p><h2>Diagnósticos contratados</h2></div><Link href="/torre/diagnosticos" className={styles.openLink}>Gerenciar diagnósticos →</Link></header><p>Consulte questionários, XMLs, análises e entregas em Diagnósticos.</p></section>
 <section className={styles.diagnosticsSection}><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>ASSINATURAS</p><h2>Assinaturas ativas</h2></div><Link href="/torre/assinaturas" className={styles.openLink}>Gerenciar assinaturas →</Link></header>
 {subscriptions.error?<p className={styles.errorMessage}>Não foi possível consultar as assinaturas.</p>:<><strong style={{fontSize:32,color:"#102033"}}>{subs.filter(s=>s.status==="active"&&s.renewal_enabled===true).length}</strong><p style={{color:"#647381"}}>Assinaturas ativas com renovação habilitada. Total cadastrado: {subs.length}.</p></>}</section>
 <section className={styles.diagnosticsSection}><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>E-BOOKS</p><h2>Pedidos do e-book</h2></div><Link href="/torre/financeiro" className={styles.openLink}>Financeiro →</Link></header>
 {product.error||orders.error?<p className={styles.errorMessage}>Não foi possível consultar as vendas do e-book.</p>:<>
 <p style={{color:"#647381",fontSize:13}}>{paid} pedidos pagos · {pending} pendentes</p>
 <div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Data</th><th>Cliente</th><th>Valor</th><th>Status</th></tr></thead><tbody>
 {sales.slice(0,200).map(x=><tr key={x.id}><td>{day(x.created_at)}</td><td><strong>{x.customer_name}</strong><small>{x.customer_email}</small></td><td>{money(x.amount_cents)}</td><td>{x.status==="paid"?"Pago":x.status==="pending"?"Pendente":x.status}</td></tr>)}
 {!sales.length&&<tr><td colSpan={4}>Nenhuma venda de e-book encontrada.</td></tr>}</tbody></table></div><p style={{fontSize:12,color:"#647381"}}>Exibidos até 200 pedidos dos últimos 1.000 consultados. Utilize o Financeiro para filtrar.</p></>}</section>
 </div></section></main>;
}