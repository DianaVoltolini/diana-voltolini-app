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
type Article={id:string;slug:string;title:string;summary:string|null;category:string|null;published_at:string|null;visibility:string};
const requiresAction=(status:string)=>["awaiting_questionnaire","awaiting_documents","client_action_required"].includes(status);
const dateBR=(v:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(v));
export default async function PainelPage(){
 const auth=await createClient();
 const {data,error}=await auth.auth.getClaims();
 const uid=typeof data?.claims?.sub==="string"?data.claims.sub:null;
 if(error||!uid)redirect("/login");
 const db=getSupabaseAdmin();
 const [{data:profile},{data:diagnosticRows},{data:orders},{data:ebook},access,{data:articles,error:articlesError}]=await Promise.all([
 db.from("profiles").select("full_name").eq("id",uid).maybeSingle(),
 db.from("diagnostics").select("id,code,status").eq("user_id",uid).order("created_at",{ascending:false}).limit(30),
 db.from("orders").select("product_id").eq("user_id",uid).eq("status","paid").limit(200),
 db.from("products").select("id").eq("code","EBOOK-IBSCBS-001").maybeSingle(),
 getFiscalAccess(uid),
 db.from("fiscal_articles").select("id,slug,title,summary,category,published_at,visibility").eq("status","published").order("published_at",{ascending:false}).limit(100)
 ]);
 const diagnostics=(diagnosticRows??[]) as Diagnostic[];
 const ebookBought=Boolean(ebook&&orders?.some(x=>x.product_id===ebook.id));
 const latest=diagnostics[0],pending=diagnostics.filter(x=>requiresAction(x.status)).length;
 const visible=((articles??[]) as Article[]).filter(a=>a.visibility==="public"||access.allowed);
 const accessible=visible.slice(0,3);
 const display=(profile?.full_name?.trim().split(/\s+/)[0]||"Cliente");
 const hasPurchases=diagnostics.length>0||ebookBought||access.allowed;
 return <main className={styles.page}><div className={styles.container}>
  <div className={styles.overline}>ÁREA DO CLIENTE <span> / SEU PORTAL</span></div>
  <section className={styles.hero}>
   <div><p className={styles.heroEyebrow}>BEM-VINDO AO SEU ESPAÇO</p><h1>Olá, {display}.</h1><p>Que bom ter você por aqui! Este é o seu espaço para acompanhar seus diagnósticos, acessar os materiais que adquiriu e consultar as novidades da sua assinatura. Tudo organizado para você continuar de onde parou.</p></div>
  </section>
  <section className={styles.section} id="meus-acessos"><div className={styles.sectionTop}><div><p className={styles.kicker}>CONTINUE DE ONDE PAROU</p><h2>Seu espaço, suas próximas ações</h2></div></div>
   {pending>0&&<div className={styles.attention}><div><strong>Você tem {pending} diagnóstico(s) aguardando informações</strong><p>Confira as solicitações para dar continuidade à análise.</p></div><Link href="/painel/diagnosticos">Ver pendências →</Link></div>}
   <div className={styles.cards}>
    {latest&&<article className={styles.card}><div className={styles.cardTop}><span className={styles.symbol}>DX</span><span className={styles.chip}>{latest.status==="completed"?"Concluído":requiresAction(latest.status)?"Precisa de atenção":"Em acompanhamento"}</span></div><h3>Diagnóstico Expresso IBS/CBS</h3><p>{latest.status==="completed"?"Seu resultado está disponível para consulta.":requiresAction(latest.status)?"Confira as informações ou documentos necessários para continuar.":"Acompanhe o andamento, os documentos e as etapas da análise."}</p><div className={styles.cardMeta}>Protocolo {latest.code}</div><Link href={`/painel/diagnosticos/${latest.id}`}>Acompanhar diagnóstico <span>→</span></Link></article>}
    {ebookBought&&<article className={styles.card}><div className={styles.cardTop}><span className={styles.symbol}>PDF</span><span className={styles.chip}>Disponível</span></div><h3>IBS e CBS na Prática</h3><p>Seu e-book adquirido está disponível para consulta e download.</p><div className={styles.cardMeta}>Material digital</div><Link href="/painel/ebooks">Acessar e-book <span>→</span></Link></article>}
    {access.allowed&&<article className={styles.card}><div className={styles.cardTop}><span className={styles.symbol}>FP</span><span className={styles.chip}>{access.grace?"Carência":"Assinatura ativa"}</span></div><h3>Fiscal na Prática</h3><p>Leia as atualizações e análises exclusivas da biblioteca.</p><div className={styles.cardMeta}>{access.paidUntil?"Período pago até "+dateBR(access.paidUntil):"Acesso disponível"}</div><Link href="/painel/assinatura">Acessar assinatura <span>→</span></Link></article>}
    {!hasPurchases&&<div className={styles.empty}><h3>Seu portal está pronto</h3><p>Comece explorando os materiais fiscais gratuitos ou conheça os produtos e serviços disponíveis.</p><Link href="/painel/assinatura">Explorar biblioteca fiscal →</Link></div>}
   </div>
  </section>
  <section className={styles.section} id="atualizacoes"><div className={styles.sectionTop}><div><p className={styles.kicker}>CONHECIMENTO EM DIA</p><h2>Atualizações fiscais</h2><p>Informações e análises para acompanhar o faturamento com mais segurança.</p></div><Link className={styles.sectionLink} href="/painel/assinatura">Ver biblioteca →</Link></div>
   {articlesError?<p className={styles.notice}>Não foi possível carregar as publicações.</p>:accessible.length?<div className={styles.articleGrid}>{accessible.map(article=><article key={article.id} className={styles.article}><span>{article.category||"Atualização fiscal"} · {article.visibility==="public"?"Gratuito":"Exclusivo"}</span><h3>{article.title}</h3><p>{article.summary||"Confira o conteúdo completo desta publicação."}</p><div className={styles.articleBottom}><small>{article.published_at?dateBR(article.published_at):"Disponível"}</small><Link href={`/painel/assinatura/${article.slug}`}>Ler artigo →</Link></div></article>)}</div>:<div className={styles.empty}><h3>Biblioteca em atualização</h3><p>As publicações gratuitas e os conteúdos exclusivos da sua assinatura aparecerão aqui.</p><Link href="/painel/assinatura">Abrir biblioteca →</Link></div>}
  </section>
  <section className={styles.section}><div className={styles.sectionTop}><div><p className={styles.kicker}>DESCUBRA MAIS</p><h2>Continue aprendendo</h2><p>Soluções práticas para aprimorar a rotina fiscal.</p></div></div>
   <div className={styles.offers}>
    {!ebookBought&&<Link href="/painel/ebooks" className={styles.offer}><span className={styles.offerIcon}>PDF</span><div><strong>E-book IBS e CBS na Prática</strong><p>21 páginas com exemplos, checklist e glossário.</p><b>R$ 29,90</b></div><small>Conhecer →</small></Link>}
    {!access.allowed&&<Link href="/painel/assinatura" className={styles.offer}><span className={styles.offerIcon}>FP</span><div><strong>Fiscal na Prática</strong><p>Biblioteca exclusiva e análises fiscais aplicadas.</p><b>R$ 39,90/mês</b></div><small>Conhecer →</small></Link>}
    {!diagnostics.length&&<Link href="/painel/diagnosticos" className={styles.offer}><span className={styles.offerIcon}>DX</span><div><strong>Diagnóstico Expresso IBS/CBS</strong><p>Análise de documentos fiscais com direcionamento prático.</p><b>Conheça o serviço</b></div><small>Conhecer →</small></Link>}
    {ebookBought&&access.allowed&&diagnostics.length>0&&<div className={styles.empty}><h3>Seus materiais estão organizados</h3><p>Acompanhe seus produtos contratados e as publicações recentes nos espaços acima.</p></div>}
   </div>
  </section>
 </div></main>;
}