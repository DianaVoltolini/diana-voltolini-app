// app/torre/pendencias/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import styles from "../painel.module.css";
export const metadata: Metadata={title:"Pendências | Torre de Controle"};
export const dynamic="force-dynamic";

const diagnosticStatuses:Record<string,string>={
 awaiting_questionnaire:"Aguardando questionário",
 awaiting_documents:"Aguardando documentos",
 client_action_required:"Ação necessária do cliente",
 documents_received:"Documentos recebidos — iniciar análise",
 under_review:"Em análise",
 awaiting_approval:"Aguardando revisão final",
};
export default async function PendenciasPage(){
 await requireAdmin();
 const db=getSupabaseAdmin();
 const [d,o]=await Promise.all([
  db.from("diagnostics").select("id,code,status,created_at")
    .in("status",Object.keys(diagnosticStatuses)).order("created_at",{ascending:true}).limit(200),
  db.from("orders").select("id,customer_name,created_at,product_id")
    .eq("status","pending").order("created_at",{ascending:true}).limit(200),
 ]);
 const docs=d.data??[],orders=o.data??[];
 const {data:products}=orders.length?await db.from("products").select("id,name").in("id",[...new Set(orders.map(x=>x.product_id))]):{data:[]};
 const names=new Map((products??[]).map(x=>[x.id,x.name]));
 return <main className={styles.page}><section className={styles.content}><div className="container">
 
 <header className={styles.pageHeader}><div><p className={styles.eyebrow}>CENTRAL DE ACOMPANHAMENTO</p><h1>Pendências</h1>
 <p>Diagnósticos não finalizados e pedidos aguardando pagamento. Priorize as tarefas que dependem de uma ação.</p></div></header>
 <section className={styles.summaryGrid}>
 <article><span>Diagnósticos em aberto</span><strong>{docs.length}</strong><small>Atendimentos em acompanhamento</small></article>
 <article><span>Pedidos pendentes</span><strong>{orders.length}</strong><small>Aguardando confirmação do pagamento</small></article>
 </section>
 {d.error||o.error?<p className={styles.errorMessage}>Não foi possível carregar todas as pendências.</p>:null}
 <section className={styles.diagnosticsSection}><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>OPERAÇÃO</p><h2>Diagnósticos a acompanhar</h2></div></header>
 <div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Diagnóstico</th><th>Situação</th><th>Próxima ação</th></tr></thead><tbody>
 {docs.map(x=><tr key={x.id}><td><strong>{x.code}</strong></td><td>{diagnosticStatuses[x.status]??x.status}</td><td><Link className={styles.openLink} href={`/torre/diagnosticos/${x.id}`}>Abrir →</Link></td></tr>)}
 {!docs.length&&<tr><td colSpan={3}>Nenhum diagnóstico em aberto.</td></tr>}</tbody></table></div></section>
 <section className={styles.diagnosticsSection}><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>FINANCEIRO</p><h2>Pagamentos pendentes</h2></div><Link href="/torre/financeiro" className={styles.openLink}>Ver financeiro →</Link></header>
 <div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Data</th><th>Cliente</th><th>Serviço</th><th>Situação</th></tr></thead><tbody>
 {orders.map(x=><tr key={x.id}><td>{new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(x.created_at))}</td><td>{x.customer_name}</td><td>{names.get(x.product_id)??"Produto"}</td><td>Pendente</td></tr>)}
 {!orders.length&&<tr><td colSpan={4}>Nenhum pedido pendente.</td></tr>}</tbody></table></div>
 <p style={{fontSize:12,color:"#647381",marginTop:12}}>Pedidos pendentes não significam necessariamente cobrança vencida. A confirmação financeira depende da sincronização com o Bling.</p>
 </section>
 </div></section></main>;
}
