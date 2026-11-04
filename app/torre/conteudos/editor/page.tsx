import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { saveFiscalArticle } from "../actions";
import ArticleBodyEditor from "./article-body-editor";
import ContentAndSeoFields from "./content-and-seo-fields";
import styles from "../../painel.module.css";
import layout from "./editor-layout.module.css";
export const metadata:Metadata={title:"Editar conteúdo | Torre de Controle"};
export const dynamic="force-dynamic";
export default async function EditorialPage({searchParams}:{searchParams:Promise<{editar?:string;erro?:string}>}){
 await requireAdmin();
 const params=await searchParams;
 const db=getSupabaseAdmin();
 const {data:selected,error}=params.editar?await db.from("fiscal_articles").select("id,title,slug,summary,body,category,visibility,status,source_links,seo_title,seo_description,delivery_type,cta_title,cta_description,cta_button_label,cta_url,cta_id").eq("id",params.editar).maybeSingle():{data:null,error:null};
 if(params.editar&&(error||!selected))notFound();
 const {data:categoryRows,error:categoriesError}=await db.from("fiscal_categories").select("name").order("name",{ascending:true});
 const categoryNames=(categoryRows??[]).map(c=>c.name);
 const {data:ctas,error:ctaError}=await db.from("fiscal_ctas").select("id,name,active").order("name",{ascending:true}).limit(500);
 const {data:slugRows}=await db.from("fiscal_articles").select("id,title,slug").order("title",{ascending:true}).limit(1000);
 const choices=selected?.category&&!categoryNames.includes(selected.category)?[selected.category,...categoryNames]:categoryNames;
 const field:CSSProperties={display:"block",width:"100%",padding:"12px",border:"1px solid #cbd5e1",borderRadius:7,marginTop:7,background:"#fff",color:"#0d1b2a"};
 return <main className={styles.page}><section className={styles.content}><div className={layout.fullWidth}>
  <header className={styles.pageHeader}><div><p className={styles.eyebrow}>GESTÃO DE CONTEÚDOS</p><h1>{selected?"Editar conteúdo":"Novo conteúdo"}</h1><p>Defina os dados do conteúdo, revise as fontes e escolha quando publicar.</p></div></header>
  {params.erro&&<p className={styles.errorMessage}>Não foi possível salvar. Verifique os campos.</p>}
  <section className={styles.diagnosticsSection} style={{width:"100%",maxWidth:"none"}}>
  <p style={{marginBottom:24}}><Link href="/torre/conteudos" style={{color:"#86650c",fontWeight:750}}>← Ver conteúdos cadastrados</Link></p>
  {categoriesError||!categoryNames.length?<p role="alert" style={{color:"#b42318"}}>Cadastre as categorias do Blog antes de criar conteúdos. <Link href="/torre/categorias">Gerenciar categorias</Link>.</p>:null}
  <form action={saveFiscalArticle} className={layout.form}>
 <input name="id" type="hidden" value={selected?.id??""}/>
 <div className={layout.mainFields}>
 <label>Categoria<select name="category" style={field} required defaultValue={selected?.category??categoryNames[0]??""}>
 {choices.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
 <label>Tipo de entrega<select name="delivery_type" style={field} required defaultValue={selected?.delivery_type??"geral"}><option value="geral">Conteúdo geral / Blog</option><option value="radar">Radar Fiscal</option><option value="oficina">Oficina Fiscal</option><option value="biblioteca">Biblioteca exclusiva</option><option value="checklist">Checklists</option></select></label>
 <label>Status<select name="status" style={field} defaultValue={selected?.status??"draft"}><option value="draft">Rascunho</option><option value="published">Aprovado para publicação</option></select></label>
 </div>
 <p className={layout.accessHint}>Blog: acesso gratuito · Radar, Oficina, Biblioteca e Checklists: exclusivos para assinantes.</p>
 <ContentAndSeoFields existingArticles={slugRows??[]} currentArticleId={selected?.id??null} title={selected?.title??""} summary={selected?.summary??""} slug={selected?.slug??""} seoTitle={selected?.seo_title??""} seoDescription={selected?.seo_description??""}/>
 <ArticleBodyEditor initial={selected?.body??""} sources={selected?.source_links??""}/>
 <section style={{border:"1px solid #dce4ec",borderRadius:12,padding:22,background:"#fff",display:"grid",gap:12}}>
  <div><h2 style={{margin:"0 0 6px",fontSize:20}}>CTA do conteúdo (opcional)</h2><p style={{margin:0,fontSize:13,color:"#607184"}}>Escolha um CTA cadastrado para este conteúdo. Sem seleção, será exibido o convite padrão para a assinatura Fiscal na Prática.</p></div>
  {ctaError?<p role="alert" style={{color:"#b42318"}}>Não foi possível carregar os CTAs. Verifique a estrutura no Supabase.</p>:<label>Selecionar CTA<select name="cta_id" style={field} defaultValue={selected?.cta_id??""}>
   <option value="">CTA padrão da assinatura</option>
   {(ctas??[]).filter(c=>c.active||c.id===selected?.cta_id).map(c=><option key={c.id} value={c.id}>{c.name}{c.active?"":" (inativo)"}</option>)}
  </select></label>}
  <p style={{margin:0,fontSize:13}}><Link href="/torre/ctas" style={{color:"#87650d",fontWeight:750}}>Cadastrar ou editar CTAs</Link></p>
 </section>
 <button className={styles.openLink} style={{cursor:"pointer",justifySelf:"start"}} type="submit">Salvar conteúdo</button>
 </form>
  </section>
 </div></section></main>;
}