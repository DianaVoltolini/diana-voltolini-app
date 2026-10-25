// app/torre/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logout } from "./actions";
import styles from "./painel.module.css";

export const metadata: Metadata = {title:"Torre de Controle | Administração"};
export const dynamic="force-dynamic";
const money=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
export default async function TorrePage() {
  const {profile}=await requireAdmin();
  const admin=getSupabaseAdmin();
  const [diagnosticsResult,ordersResult,productsResult,subscriptionsResult]=await Promise.all([
    admin.from("diagnostics").select("id,status", {count:"exact",head:false}).limit(1000),
    admin.from("orders").select("id,product_id,status,amount_cents,created_at").order("created_at",{ascending:false}).limit(1000),
    admin.from("products").select("id,code,name"),
    admin.from("fiscal_subscriptions").select("id,status,renewal_enabled").limit(1000),
  ]);
  const hasError=Boolean(diagnosticsResult.error||ordersResult.error||productsResult.error||subscriptionsResult.error);
  const diagnostics=diagnosticsResult.data??[];
  const orders=ordersResult.data??[];
  const products=productsResult.data??[];
  const ebookIds=new Set(products.filter(p=>p.code==="EBOOK-IBSCBS-001").map(p=>p.id));
  const pendingStatuses=new Set(["awaiting_questionnaire","awaiting_documents","client_action_required","documents_received","under_review","awaiting_approval"]);
  const needsAttention=diagnostics.filter(x=>pendingStatuses.has(x.status)).length;
  const paidOrders=orders.filter(x=>x.status==="paid");
  const totalPaid=paidOrders.reduce((sum,x)=>sum+x.amount_cents,0);
  const ebookSold=paidOrders.filter(x=>ebookIds.has(x.product_id)).length;

  const activeSubscriptions=(subscriptionsResult.data??[]).filter(x=>x.status==="active"&&x.renewal_enabled===true).length;
  const navCards=[
    {title:"Vendas",description:"Acompanhe produtos vendidos, e-books e assinaturas.",url:"/torre/vendas",button:"Ver vendas →"},
    {title:"Assinatura Recorrente",description:"Consulte assinantes ativos, vigência e renovações habilitadas.",url:"/torre/assinaturas",button:"Ver assinaturas →"},
    {title:"Diagnósticos",description:"Gerencie questionários, arquivos XML, andamento das análises e entregas.",url:"/torre/diagnosticos",button:"Gerenciar diagnósticos →"},
  ];
  return <main className={styles.page}>
    <section className={styles.content}><div className="container">
      <header className={styles.pageHeader}><div><p className={styles.eyebrow}>GESTÃO ADMINISTRATIVA</p><h1>Visão geral do negócio</h1>
        <p>Acompanhe suas vendas, produtos e atendimentos. Acesse abaixo a área que deseja gerenciar.</p></div></header>
      {hasError && <p className={styles.errorMessage}>Alguns indicadores não puderam ser carregados. Tente atualizar a página.</p>}
      {!hasError && <>
        <section className={styles.summaryGrid} aria-label="Indicadores gerais">
          <article><span>Diagnósticos</span><strong>{diagnostics.length}</strong><small>Atendimentos registrados</small></article>
          <article><span>E-books vendidos</span><strong>{ebookSold}</strong><small>Pedidos pagos do e-book</small></article>
          <article><span>Pendências operacionais</span><strong>{needsAttention}</strong><small>Diagnósticos em aberto</small></article>
          <article><span>Assinaturas ativas</span><strong>{activeSubscriptions}</strong><small>Renovação habilitada</small></article>
        </section>
        <section className={styles.diagnosticsSection} aria-label="Resultado financeiro resumido">
          <header className={styles.sectionHeader}><div><p className={styles.eyebrow}>RESUMO DE VENDAS</p><h2>Recebimentos registrados</h2></div><Link className={styles.openLink} href="/torre/financeiro">Abrir financeiro →</Link></header>
          <strong style={{fontSize:30,color:"#177245"}}>{money(totalPaid)}</strong>
          <p style={{color:"#647381",marginTop:9}}>Consulte vendas, pagamentos, clientes e valores com filtros por período, serviço e status.</p>
        </section>
      </>}
      {!hasError && <section className={styles.diagnosticsSection} aria-label="Indicadores por produto">
        <header className={styles.sectionHeader}><div><p className={styles.eyebrow}>INDICADORES</p><h2>Vendas confirmadas por produto</h2></div></header>
        {products.filter(p=>paidOrders.some(o=>o.product_id===p.id)).map(p=>{
          const count=paidOrders.filter(o=>o.product_id===p.id).length;
          const width=paidOrders.length ? count/paidOrders.length*100 : 0;
          return <div key={p.id} style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:12,color:"#354553",fontSize:14,marginBottom:5}}><span>{p.name}</span><strong>{count}</strong></div>
            <div style={{height:10,background:"#e8edf2",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:`${width}%`,background:"#c9a227"}} /></div>
          </div>;
        })}
        {paidOrders.length===0&&<p style={{color:"#647381"}}>Nenhuma venda paga registrada.</p>}
        <p style={{fontSize:12,color:"#647381"}}>Distribuição dos pedidos pagos consultados, não dos recebimentos bancários.</p>
      </section>}
      <section aria-label="Áreas de gestão" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:18}}>
        {navCards.map(card=><article key={card.url} style={{background:"#fff",border:"1px solid #d6e0e8",borderTop:"4px solid #c9a227",borderRadius:12,padding:27}}>
          <h2 style={{color:"#0d1b2a",fontSize:24,margin:"0 0 12px"}}>{card.title}</h2>
          <p style={{color:"#536372",lineHeight:1.6,margin:"0 0 20px"}}>{card.description}</p>
          <Link href={card.url} className={styles.openLink}>{card.button}</Link>
        </article>)}
      </section>
      <p style={{marginTop:23}}><Link href="/torre/pendencias" className={styles.openLink}>Ver todas as pendências →</Link></p>
      <p style={{color:"#647381",fontSize:12,marginTop:24}}>Os indicadores exibem os registros recentes consultados. A gestão detalhada permanece nas páginas específicas.</p>
    </div></section>
  </main>;
}
