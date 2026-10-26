import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { saveFiscalArticle } from "../actions";
import ArticleBodyEditor from "./article-body-editor";
import styles from "../../painel.module.css";
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
  <section className={styles.diagnosticsSection}>
  <p style={{marginBottom:24}}><Link href="/torre/conteudos" style={{color:"#86650c",fontWeight:750}}>← Ver conteúdos cadastrados</Link></p>
  {categoriesError||!categoryNames.length?<p role="alert" style={{color:"#b42318"}}>Cadastre as categorias do Blog antes de criar conteúdos. <Link href="/torre/categorias">Gerenciar categorias</Link>.</p>:null}
  <form action={saveFiscalArticle} style={{display:"grid",gap:14,maxWidth:850}}>
 <input name="id" type="hidden" value={selected?.id??""}/>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14}}>
 <label>Categoria<select name="category" style={field} required defaultValue={selected?.category??categoryNames[0]??""}>
 {choices.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
 <label>Visibilidade<select name="visibility" style={field} defaultValue={selected?.visibility??"public"}><option value="public">Público</option><option value="subscriber">Exclusivo para assinantes</option></select></label>
 <label>Status<select name="status" style={field} defaultValue={selected?.status??"draft"}><option value="draft">Rascunho</option><option value="published">Aprovado para publicação</option></select></label>
 </div>
 <label>Título<input style={field} name="title" required maxLength={180} defaultValue={selected?.title??""}/></label>
 <label>Slug (letras minúsculas, números e hífens)<input style={field} name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={selected?.slug??""} placeholder="ibs-cbs-na-nfe"/></label>
 <label>Resumo<textarea style={field} name="summary" rows={3} required maxLength={600} defaultValue={selected?.summary??""}/></label>
 <section style={{border:"1px solid #dbe2ea",borderRadius:10,padding:20,background:"#f8fafc",display:"grid",gap:12}}><div><h2 style={{fontSize:20,margin:"0 0 6px"}}>Otimização para o Google (SEO)</h2><p style={{fontSize:13,color:"#536372",margin:0}}>Campos opcionais. Se ficarem vazios, o site utilizará automaticamente o título e o resumo do conteúdo.</p></div><label>Título SEO<input style={field} name="seo_title" maxLength={180} defaultValue={selected?.seo_title??""} placeholder="Título apresentado nos mecanismos de pesquisa"/></label><label>Descrição SEO<textarea style={field} name="seo_description" maxLength={320} rows={3} defaultValue={selected?.seo_description??""} placeholder="Descrição curta e objetiva para resultados de pesquisa"/></label><p style={{fontSize:12,color:"#607080",margin:0}}>Prévia aproximada: o Google pode modificar títulos e descrições nos resultados.</p><div style={{background:"#fff",border:"1px solid #e3e7ec",borderRadius:9,padding:15}}><small style={{color:"#286b42"}}>dianavoltolini.com.br/blog/{selected?.slug??"endereco-do-conteudo"}</small><p style={{color:"#1a0dab",fontSize:18,margin:"7px 0"}}>{selected?.seo_title||selected?.title||"Título do conteúdo"}</p><p style={{color:"#4b5563",fontSize:13,margin:0}}>{selected?.seo_description||selected?.summary||"Resumo do conteúdo"}</p></div></section>
 <ArticleBodyEditor initial={selected?.body??""}/>
 <label>Fontes oficiais / URLs<textarea style={field} name="source_links" rows={3} defaultValue={selected?.source_links??""} placeholder="Uma URL por linha"/></label>
 <button className={styles.openLink} style={{cursor:"pointer",justifySelf:"start"}} type="submit">Salvar conteúdo</button>
 </form>
  </section>
 </div></section></main>;
}