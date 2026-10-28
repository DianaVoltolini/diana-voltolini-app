import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import styles from "../painel.module.css";
export const metadata:Metadata={title:"Assinatura Recorrente | Torre"};
export const dynamic="force-dynamic";
const date=(v:string|null)=>v?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(v)):"—";
export default async function AssinaturasPage(){
 await requireAdmin();
 const db=getSupabaseAdmin();
 const [{data:rows,error},{data:profiles},{data:invoices,error:invoiceError}]=await Promise.all([
 db.from("fiscal_subscriptions").select("id,user_id,status,paid_until,renewal_enabled,cancellation_requested_at,billing_day,created_at").order("created_at",{ascending:false}).limit(300),
 db.from("profiles").select("id,full_name,email").limit(1000),
 db.from("fiscal_subscription_invoices").select("*").order("due_date",{ascending:false}).limit(2000)
 ]);
 const items=rows??[],users=new Map((profiles??[]).map(u=>[u.id,u]));
 const invoicesBySubscription=new Map<string,typeof invoices>();
 for(const invoice of invoices??[]){
  const id=String(invoice.subscription_id??"");
  const group=invoicesBySubscription.get(id)??[];
  group.push(invoice);
  invoicesBySubscription.set(id,group);
 }
 const nextPending=(id:string)=>(invoicesBySubscription.get(id)??[])
  .filter(i=>i.status==="pending"&&Boolean(i.due_date))
  .sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)))[0]??null;
 const nextDue=(x:(typeof items)[number])=>{
  const invoice=nextPending(x.id);
  return invoice?.due_date?date(String(invoice.due_date)):date(x.paid_until);
 };
 const charge=(x:(typeof items)[number])=>{
  if(nextPending(x.id))return "Emitida · pendente";
  return x.renewal_enabled===false?"Renovação desativada":"Não emitida";
 };
 const active=items.filter(x=>x.status==="active"&&x.renewal_enabled===true);
 const canceled=items.filter(x=>x.renewal_enabled===false);
 return <main className={styles.page}><section className={styles.content}><div className="container">
 <header className={styles.pageHeader}><div><p className={styles.eyebrow}>SERVIÇOS</p><h1>Assinatura Recorrente</h1><p>Acompanhe assinantes, vigência, renovação e cancelamentos do Fiscal na Prática.</p></div></header>
 {invoiceError&&<p className={styles.errorMessage}>Não foi possível consultar as cobranças. Verifique os dados antes de interpretar os vencimentos.</p>}
 {error?<p className={styles.errorMessage}>Não foi possível consultar assinaturas.</p>:<>
 <section className={styles.summaryGrid}><article><span>Assinaturas</span><strong>{items.length}</strong><small>Registros consultados</small></article><article><span>Ativas com renovação</span><strong>{active.length}</strong><small>Renovação habilitada</small></article><article><span>Renovação desativada</span><strong>{canceled.length}</strong><small>Não gerar novas cobranças</small></article><article><span>Valor mensal por assinatura</span><strong style={{fontSize:28}}>R$ 39,90</strong><small>Preço atual do produto</small></article></section>
 <section className={styles.diagnosticsSection}><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>ACOMPANHAMENTO</p><h2>Assinaturas cadastradas</h2></div></header><div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Cliente</th><th>Cliente desde</th><th>Status</th><th>Próximo vencimento</th><th>Cobrança</th><th>Dia de cobrança</th><th>Renovação</th></tr></thead><tbody>
 {items.map(x=><tr key={x.id}><td><strong>{users.get(x.user_id)?.full_name||"Cliente"}</strong><small>{users.get(x.user_id)?.email||"E-mail não localizado"}</small></td><td>{date(x.created_at)}</td><td>{x.status==="active"?"Ativa":x.status==="canceled"?"Cancelada":x.status==="pending"?"Pendente":x.status}</td><td>{nextDue(x)}<small>{nextPending(x.id)?"Vencimento da cobrança":"Previsão pelo período pago"}</small></td><td>{charge(x)}</td><td>{x.billing_day??"—"}</td><td>{x.renewal_enabled?"Habilitada":"Desabilitada"}</td></tr>)}
 {!items.length&&<tr><td colSpan={7}>Nenhuma assinatura cadastrada.</td></tr>}</tbody></table></div><p style={{fontSize:12,color:"#657386"}}>Cliente desde corresponde à criação do registro da assinatura, não ao primeiro pagamento. Próximo vencimento usa a cobrança pendente mais próxima quando existe; caso contrário, mostra a previsão pelo fim do período pago. O módulo não gera renovações.</p></section></>}
 </div></section></main>;
}