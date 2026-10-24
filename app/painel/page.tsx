import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getFiscalAccess } from "@/lib/fiscal/subscription-access";
import styles from "./dashboard.module.css";

export const metadata:Metadata={title:"Minha Área | Diana Voltolini"};
export const dynamic="force-dynamic";
type Diagnostic={id:string;code:string;status:string};
const needsAction=(status:string)=>["awaiting_questionnaire","awaiting_documents","client_action_required"].includes(status);
const diagnosticStatus=(status:string)=>status==="completed"?"Concluído":needsAction(status)?"Aguardando informações":status==="cancelled"?"Cancelado":"Em andamento";
export default async function PainelPage(){
 const auth=await createClient();
 const {data,error}=await auth.auth.getClaims();
 const userId=typeof data?.claims?.sub==="string"?data.claims.sub:null;
 if(error||!userId)redirect("/login");
 const db=getSupabaseAdmin();
 const [{data:profile},{data:diagnosticsData},{data:ordersData},{data:product},fiscal]=await Promise.all([
  db.from("profiles").select("full_name").eq("id",userId).maybeSingle(),
  db.from("diagnostics").select("id,code,status").eq("user_id",userId).order("created_at",{ascending:false}).limit(10),
  db.from("orders").select("id,product_id").eq("user_id",userId).eq("status","paid").limit(200),
  db.from("products").select("id").eq("code","EBOOK-IBSCBS-001").maybeSingle(),
  getFiscalAccess(userId)
 ]);
 const diagnostics=(diagnosticsData??[]) as Diagnostic[];
 const ebookBought=Boolean(product&&ordersData?.some(o=>o.product_id===product.id));
 const pending=diagnostics.filter(d=>needsAction(d.status)).length;
 const ownedCount=(diagnostics.length>0?1:0)+(ebookBought?1:0)+(fiscal.allowed?1:0);
 const firstName=profile?.full_name?.trim().split(/\s+/)[0]||"Cliente";
 return <main className={styles.page}>
   <div className={styles.container}>
    <div className={styles.overline}>ÁREA DO CLIENTE <span> / VISÃO GERAL</span></div>
    <section className={styles.hero}>
     <div><p className={styles.heroEyebrow}>SEU ESPAÇO DIGITAL</p><h1>Olá, {firstName}.</h1><p>Seus serviços contratados, conteúdos e informações importantes reunidos em um só lugar.</p></div>
     <Link className={styles.heroButton} href="#minhas-compras">Ver minhas compras <span aria-hidden="true">↗</span></Link>
    </section>
    <section className={styles.stats} aria-label="Resumo da sua conta">
      <div className={styles.stat}><span>Minhas compras</span><strong>{ownedCount}</strong><small>Categorias disponíveis na conta</small></div>
      <div className={styles.stat}><span>Diagnósticos</span><strong>{diagnostics.length}</strong><small>Serviços registrados</small></div>
      <div className={styles.stat}><span>Pendências</span><strong>{pending}</strong><small>{pending?"Aguardando sua atenção":"Nenhuma ação necessária"}</small></div>
    </section>
    {pending>0&&<section className={styles.attention}><div><strong>Você possui informações pendentes</strong><p>Confira os diagnósticos que aguardam documentos ou informações.</p></div><Link href="/painel/diagnosticos">Ver pendências →</Link></section>}
    <div className={styles.sectionTitle} id="minhas-compras"><div><p>MEUS ACESSOS</p><h2>Minhas Compras</h2><span>Acesse apenas o que foi adquirido e está disponível na sua conta.</span></div></div>
    <section className={styles.cards} aria-label="Produtos e serviços adquiridos">
      {diagnostics.length>0&&<article className={styles.card}><div className={styles.cardTop}><span className={styles.symbol}>01</span><span className={styles.chip}>Contratado</span></div><h3>Diagnóstico IBS/CBS</h3><p>Acompanhe o andamento das análises, envie documentos e consulte os resultados.</p><div className={styles.cardMeta}>{diagnostics.length} diagnóstico(s) · {diagnosticStatus(diagnostics[0].status)}</div><Link href="/painel/diagnosticos">Acessar diagnósticos <span>→</span></Link></article>}
      {ebookBought&&<article className={styles.card}><div className={styles.cardTop}><span className={styles.symbol}>02</span><span className={styles.chip}>Disponível</span></div><h3>Meus E-books</h3><p>Consulte e baixe os materiais digitais adquiridos.</p><div className={styles.cardMeta}>Material liberado após pagamento</div><Link href="/painel/ebooks">Acessar biblioteca <span>→</span></Link></article>}
      {fiscal.allowed&&<article className={styles.card}><div className={styles.cardTop}><span className={styles.symbol}>03</span><span className={styles.chip}>Assinatura vigente</span></div><h3>Fiscal na Prática</h3><p>Conteúdos exclusivos, análises, roteiros e checklists para sua rotina fiscal.</p><div className={styles.cardMeta}>{fiscal.paidUntil?"Acesso pago até "+new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(fiscal.paidUntil)):"Acesso disponível"}</div><Link href="/painel/assinatura">Acessar conteúdos <span>→</span></Link></article>}
      {ownedCount===0&&<div className={styles.empty}><h3>Nenhuma compra disponível no momento</h3><p>Quando um pagamento for confirmado, seu produto ou serviço aparecerá aqui. Use o mesmo e-mail da compra.</p><a href="https://dianavoltolini.com.br/produtos">Conhecer produtos e serviços →</a></div>}
    </section>
    <section className={styles.discover}><div><p>CONHEÇA MAIS</p><h2>Outros Produtos</h2><span>Encontre soluções fiscais para sua rotina e seus negócios.</span></div><a href="https://dianavoltolini.com.br/produtos" target="_blank" rel="noopener noreferrer">Explorar soluções ↗</a></section>
   </div>
 </main>;
}
