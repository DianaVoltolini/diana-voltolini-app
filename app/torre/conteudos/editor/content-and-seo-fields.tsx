"use client";
import {useState} from "react";
import Link from "next/link";
import SeoEditor from "./seo-editor";
import layout from "./editor-layout.module.css";
const field={display:"block",width:"100%",padding:"12px",border:"1px solid #cbd5e1",borderRadius:7,marginTop:7,background:"#fff",color:"#0d1b2a"} as const;
type Props={title:string;slug:string;summary:string;seoTitle:string;seoDescription:string;currentArticleId:string|null;existingArticles:{id:string;title:string;slug:string}[]};
export default function ContentAndSeoFields(props:Props){
 const [title,setTitle]=useState(props.title);
 const [slug,setSlug]=useState(props.slug);
 const [summary,setSummary]=useState(props.summary);
 const duplicate=props.existingArticles.find(a=>a.slug===slug.trim().toLowerCase()&&a.id!==props.currentArticleId);
 return <div className={layout.editorColumns}>
   <div className={layout.editorMain}>
    <label>Título<input style={field} name="title" required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label>Slug (letras minúsculas, números e hífens)<input style={field} name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={e=>setSlug(e.target.value)} placeholder="ibs-cbs-na-nfe" aria-describedby={duplicate?"slug-duplicado":undefined}/>
    {duplicate&&<span id="slug-duplicado" role="alert" style={{display:"block",marginTop:8,color:"#a42323",fontSize:13}}>
      Este endereço já está cadastrado: <strong>{duplicate.title}</strong>. <Link href={"/torre/conteudos/editor?editar="+encodeURIComponent(duplicate.id)} style={{textDecoration:"underline",fontWeight:700}}>Abrir conteúdo existente</Link>. Para criar outro conteúdo, altere o slug.
    </span>}</label>
    <label>Resumo<textarea style={field} name="summary" rows={4} required maxLength={600} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
   </div>
   <SeoEditor title={title} slug={slug} summary={summary} seoTitle={props.seoTitle} seoDescription={props.seoDescription}/>
 </div>;
}
