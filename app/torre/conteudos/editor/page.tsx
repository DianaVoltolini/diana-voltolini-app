import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { saveFiscalArticle } from "../actions";
import ArticleBodyEditor from "./article-body-editor";
import SeoEditor from "./seo-editor";
import styles from "../../painel.module.css";
import layout from "./editor-layout.module.css";
export const metadata:Metadata={title:"Editar conteúdo | Torre de Controle"};
export const dynamic="force-dynamic";
export default async function EditorialPage({searchParams}:{searchParams:Promise<{editar?:string;erro?:string}>}){
 await requireAdmin();
 const params=await searchParams;
 const db=getSupabaseAdmin();
 const {data:selected,error}=params.editar?await db.from("fiscal_articles").select("id,title,slug,summary,body,category,visibility,status,source_links,seo_title,seo_description").eq("id",params.editar).maybeSingle():{data:null,error:null};
 if(params.editar&&(error||!selected))notFound();
 const {data:categoryRows,error:categoriesError}=await db.from("fiscal_categories").select("name").order("name",{ascending:true});
 const categoryNames=(categoryRows??[]).map(c=>c.name);
 const choices=selected?.category&&!categoryNames.includes(selected.category)?[selected.category,...categoryNames]:categoryNames;
 const field:CSSProperties={display:"block",width:"100%",padding:"12px",border:"1px solid #cbd5e1",borderRadius:7,marginTop:7,background:"#fff",color:"#0d1b2a"};
 return <main className={styles.page}><section className={styles.content}><div className="container">
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
 <label>Visibilidade<select name="visibility" style={field} defaultValue={selected?.visibility??"public"}><option value="public">Público</option><option value="subscriber">Exclusivo para assinantes</option></select></label>
 <label>Status<select name="status" style={field} defaultValue={selected?.status??"draft"}><option value="draft">Rascunho</option><option value="published">Aprovado para publicação</option></select></label>
 </div>
 <label>Título<input style={field} name="title" required maxLength={180} defaultValue={selected?.title??""}/></label>
 <label>Slug (letras minúsculas, números e hífens)<input style={field} name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={selected?.slug??""} placeholder="ibs-cbs-na-nfe"/></label>
 <label>Resumo<textarea style={field} name="summary" rows={3} required maxLength={600} defaultValue={selected?.summary??""}/></label>
 <SeoEditor title={selected?.title??""} summary={selected?.summary??""} slug={selected?.slug??""} seoTitle={selected?.seo_title??""} seoDescription={selected?.seo_description??""}/>
 <ArticleBodyEditor initial={selected?.body??""}/>
 <label>Fontes oficiais / URLs<textarea style={field} name="source_links" rows={3} defaultValue={selected?.source_links??""} placeholder="Uma URL por linha"/></label>
 <button className={styles.openLink} style={{cursor:"pointer",justifySelf:"start"}} type="submit">Salvar conteúdo</button>
 </form>
  </section>
 </div></section></main>;
}