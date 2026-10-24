import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { saveFiscalArticle } from "./actions";
import FiscalArticleTable from "./article-table";
import styles from "../painel.module.css";
export const metadata: Metadata={title:"Gestão de Conteúdos | Torre"};
export const dynamic="force-dynamic";
type Article={id:string;title:string;slug:string;summary:string;body:string;category:string;visibility:string;status:string;source_links:string;updated_at:string;published_at:string|null};
export default async function ConteudosPage({searchParams}:{searchParams:Promise<{editar?:string;salvo?:string;erro?:string}>}){
 await requireAdmin();
 const params=await searchParams;
 const db=getSupabaseAdmin();
 const {data,error}=await db.from("fiscal_articles").select("id,title,slug,summary,body,category,visibility,status,source_links,updated_at,published_at").order("updated_at",{ascending:false}).limit(100);
 const articles=(data??[]) as Article[];
 const selected=articles.find(x=>x.id===params.editar);
 const field:CSSProperties={display:"block",width:"100%",padding:"12px",border:"1px solid #cbd5e1",borderRadius:7,marginTop:7,background:"#fff",color:"#0d1b2a"};
 return <main className={styles.page}><section className={styles.content}><div className="container">
 <Link href="/torre" style={{color:"#846611",fontWeight:700}}>← Torre de Controle</Link>
 <header className={styles.pageHeader} style={{marginTop:25}}><div><p className={styles.eyebrow}>FISCAL NA PRÁTICA</p><h1>Gestão de conteúdos</h1><p>Prepare artigos gratuitos e materiais exclusivos da assinatura. Revise os materiais antes de publicar. Escolha "Exclusivo para assinantes" e "Rascunho" enquanto estiver em elaboração.</p></div></header>
 {error&&<p className={styles.errorMessage}>Tabela de conteúdos ainda não disponível. Aplique primeiro a migração SQL, sem alterar as tabelas atuais.</p>}
 {params.salvo&&<p style={{color:"#177245",fontWeight:700}}>Conteúdo salvo com sucesso.</p>}
 {params.erro&&<p className={styles.errorMessage}>Não foi possível salvar. Confira os campos, o slug e a conexão com o banco.</p>}
 {!error&&<section className={styles.diagnosticsSection}>
 <h2>{selected?"Editar conteúdo":"Novo conteúdo"}</h2>
 <form action={saveFiscalArticle} style={{display:"grid",gap:14,maxWidth:850}}>
 <input name="id" type="hidden" value={selected?.id??""}/>
 <label>Título<input style={field} name="title" required maxLength={180} defaultValue={selected?.title??""}/></label>
 <label>Slug (letras minúsculas, números e hífens)<input style={field} name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={selected?.slug??""} placeholder="ibs-cbs-na-nfe"/></label>
 <label>Resumo<textarea style={field} name="summary" rows={3} required maxLength={600} defaultValue={selected?.summary??""}/></label>
 <label>Categoria<select name="category" style={field} defaultValue={selected?.category??"Reforma Tributária"}>
 {["Reforma Tributária","NF-e e Faturamento","Tributos na Prática","Sistemas e Parametrização","Obrigações e Prazos","Atualizações fiscais","NF-e e XML","IBS e CBS","ICMS e DIFAL","Checklists e guias","Agenda fiscal"].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Visibilidade<select name="visibility" style={field} defaultValue={selected?.visibility??"public"}><option value="public">Público</option><option value="subscriber">Exclusivo para assinantes</option></select></label>
 <label>Status<select name="status" style={field} defaultValue={selected?.status??"draft"}><option value="draft">Rascunho</option><option value="published">Aprovado para publicação</option></select></label>
 <label>Conteúdo<textarea style={field} name="body" rows={14} required defaultValue={selected?.body??""} placeholder="Escreva a análise e seus pontos práticos..."/></label>
 <label>Fontes oficiais / URLs<textarea style={field} name="source_links" rows={3} defaultValue={selected?.source_links??""} placeholder="Uma URL por linha"/></label>
 <button className={styles.openLink} style={{cursor:"pointer",justifySelf:"start"}} type="submit">Salvar conteúdo</button>
 </form></section>}
 {!error&&<section className={styles.diagnosticsSection}><h2>Conteúdos cadastrados</h2><FiscalArticleTable articles={articles}/></section>}
 </div></section></main>;
}
