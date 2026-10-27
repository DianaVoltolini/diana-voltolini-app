import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {getFiscalAccess} from "@/lib/fiscal/subscription-access";
import styles from "./dashboard.module.css";

export const metadata:Metadata={title:"Minha Área | Diana Voltolini"};
export const dynamic="force-dynamic";
type Diagnostic={id:string;code:string;status:string};
const requiresAction=(status:string)=>["awaiting_questionnaire","awaiting_documents","client_action_required"].includes(status);
const dateBR=(v:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(v));
export default async function PainelPage(){
 const auth=await createClient();
 const {data,error}=await auth.auth.getClaims();
 const uid=typeof data?.claims?.sub==="string"?data.claims.sub:null;
 if(error||!uid)redirect("/login");
 const db=getSupabaseAdmin();
 const [{data:profile},{data:diagnosticRows},{data:orders},{data:ebook},access]=await Promise.all([
 db.from("profiles").select("full_name").eq("id",uid).maybeSingle(),
 db.from("diagnostics").select("id,code,status").eq("user_id",uid).order("created_at",{ascending:false}).limit(30),
 db.from("orders").select("product_id").eq("user_id",uid).eq("status","paid").limit(200),
 db.from("products").select("id").eq("code","EBOOK-IBSCBS-001").maybeSingle(),
 getFiscalAccess(uid)
 ]);
 const diagnostics=(diagnosticRows??[]) as Diagnostic[];
 const ebookBought=Boolean(ebook&&orders?.some(x=>x.product_id===ebook.id));
 const latest=diagnostics[0],pending=diagnostics.filter(x=>requiresAction(x.status)).length;
 const display=(profile?.full_name?.trim().split(/\s+/)[0]||"Cliente");
 const hasPurchases=diagnostics.length>0||ebookBought||access.allowed;
 return <main className={styles.page}><div className={styles.container}>
  <section className={styles.hero}>
   <div><p className={styles.heroEyebrow}>BEM-VINDO AO SEU ESPAÇO</p><h1>Olá, {display}.</h1><p>Que bom ter você por aqui! Este é o seu espaço para acompanhar seus diagnósticos, acessar os materiais que adquiriu e consultar as novidades da sua assinatura. Tudo organizado para você continuar de onde parou.</p></div>
  </section>
  <section className={styles.section} id="meus-acessos"><div className={styles.sectionTop}><div><p className={styles.kicker}>CONSTRUA SEU CONHECIMENTO</p><h2>Seus produtos e próximos passos</h2><p>Acesse o que você já adquiriu.</p></div></div>
   {pending>0&&<div className={styles.attention}><div><strong>Você tem {pending} diagnóstico(s) aguardando informações</strong><p>Confira as solicitações para dar continuidade à análise.</p></div><Link href="/painel/diagnosticos">Ver pendências →</Link></div>}
   <div className={styles.cards}>
    {latest&&<article className={styles.card}><div className={styles.cardTop}><span className={styles.symbol}>DX</span><span className={styles.chip}>{latest.status==="completed"?"Concluído":requiresAction(latest.status)?"Precisa de atenção":"Em acompanhamento"}</span></div><h3>Diagnóstico Expresso IBS/CBS</h3><p>{latest.status==="completed"?"Seu resultado está disponível para consulta.":requiresAction(latest.status)?"Confira as informações ou documentos necessários para continuar.":"Acompanhe o andamento, os documentos e as etapas da análise."}</p><div className={styles.cardMeta}>Protocolo {latest.code}</div><Link href={`/painel/diagnosticos/${latest.id}`}>Acompanhar diagnóstico <span>→</span></Link></article>}
    {ebookBought&&<article className={styles.card}><div className={styles.cardTop}><span className={styles.symbol}>PDF</span><span className={styles.chip}>Disponível</span></div><h3>IBS e CBS na Prática</h3><p>Seu e-book adquirido está disponível para consulta e download.</p><div className={styles.cardMeta}>Material digital</div><Link href="/painel/ebooks">Acessar e-book <span>→</span></Link></article>}
    {access.allowed&&<article className={styles.card}><div className={styles.cardTop}><span className={styles.symbol}>FP</span><span className={styles.chip}>{access.grace?"Carência":"Assinatura ativa"}</span></div><h3>Fiscal na Prática</h3><p>Leia as atualizações e análises exclusivas da biblioteca.</p><div className={styles.cardMeta}>{access.paidUntil?"Período pago até "+dateBR(access.paidUntil):"Acesso disponível"}</div><Link href="/painel/assinatura">Acessar assinatura <span>→</span></Link></article>}
    {!hasPurchases&&<div className={styles.empty}><h3>Seu portal está pronto</h3><p>Comece explorando os materiais fiscais gratuitos ou conheça os produtos e serviços disponíveis.</p><Link href="/painel/assinatura">Explorar biblioteca fiscal →</Link></div>}
   </div>
  </section>
  {(!hasPurchases||!ebookBought||!diagnostics.length||!access.allowed)&&<section className={styles.section}><div className={styles.sectionTop}><div><p className={styles.kicker}>EXPLORE OUTRAS SOLUÇÕES</p><h2>O próximo passo para sua rotina fiscal</h2><p>Conheça outras soluções para complementar seu conhecimento.</p></div></div><div className={styles.discoveryGrid}><div className={styles.discoveryCard}><span className={styles.symbol}>DV</span><h3>Conhecimento no seu ritmo</h3><p>Explore materiais e serviços que podem complementar seus estudos e suas atividades fiscais.</p><Link href="/painel/outros-produtos">Ver outros produtos →</Link></div>{!access.allowed&&<div className={styles.discoveryCard}><span className={styles.symbol}>BLOG</span><h3>Blog Fiscal</h3><p>Publicações gratuitas sobre notas fiscais, Reforma Tributária e faturamento.</p><a href="https://dianavoltolini.com.br/blog" target="_blank" rel="noopener noreferrer">Acessar Blog Fiscal ↗</a></div>}</div></section>}

 </div></main>;
}