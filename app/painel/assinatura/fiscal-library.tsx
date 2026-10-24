"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./library.module.css";

export type FiscalLibraryArticle = {
 id: string; slug: string; title: string; summary: string | null;
 category: string | null; published_at: string | null;
};
type Props = { articles: FiscalLibraryArticle[] };
const categories = ["Todos","Atualizações fiscais","NF-e e XML","IBS e CBS","ICMS e DIFAL","Checklists e guias","Agenda fiscal"];
const date=(v:string|null)=>v?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(v)):"Material disponível";
export default function FiscalLibrary({articles}:Props){
 const [category,setCategory]=useState("Todos");
 const [search,setSearch]=useState("");
 const available=useMemo(()=>Array.from(new Set(articles.map(a=>a.category?.trim()).filter((x):x is string=>Boolean(x)))),[articles]);
 const filters=categories.filter(c=>c==="Todos"||available.some(a=>a.toLowerCase()===c.toLowerCase()));
 for(const cat of available){if(!filters.some(x=>x.toLowerCase()===cat.toLowerCase()))filters.push(cat);}
 const shown=articles.filter(a=>(category==="Todos"||a.category?.toLowerCase()===category.toLowerCase())&&
  [a.title,a.summary??"",a.category??""].join(" ").toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")));
 const featured=articles[0];
 return <div className={styles.library}>
   {featured&&<section className={styles.feature}>
    <div><p className={styles.kicker}>EM DESTAQUE · {featured.category||"Fiscal na Prática"}</p>
    <h2>{featured.title}</h2><p>{featured.summary||"Confira o conteúdo e as orientações práticas desta edição."}</p>
    <span className={styles.date}>Publicado em {date(featured.published_at)}</span></div>
    <Link className={styles.featureLink} href={`/painel/assinatura/${featured.slug}`}>Ler análise <span aria-hidden="true">→</span></Link>
   </section>}
   <section className={styles.heading}><div><p className={styles.kicker}>BIBLIOTECA DO ASSINANTE</p><h2>Explore os conteúdos</h2><p>Artigos, atualizações e materiais organizados por assunto.</p></div><span className={styles.count}>{articles.length} {articles.length===1?"publicação":"publicações"}</span></section>
   <div className={styles.controls}>
     <label className={styles.searchLabel} htmlFor="fiscal-search">Pesquisar publicações
      <input id="fiscal-search" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquise por assunto, imposto ou palavra-chave..." />
     </label>
   </div>
   <div className={styles.filters} aria-label="Filtrar por categoria">
    {filters.map(c=><button type="button" key={c} className={category===c?styles.selected:styles.filter} onClick={()=>setCategory(c)} aria-pressed={category===c}>{c}</button>)}
   </div>
   {shown.length>0?<div className={styles.grid}>{shown.map(a=><article key={a.id} className={styles.card}>
    <span className={styles.category}>{a.category||"Atualização fiscal"}</span>
    <h3>{a.title}</h3><p>{a.summary||"Acesse esta publicação para consultar as informações completas."}</p>
    <div className={styles.cardFoot}><time>{date(a.published_at)}</time><Link href={`/painel/assinatura/${a.slug}`}>Ler conteúdo →</Link></div>
   </article>)}</div>:<div className={styles.empty}><h3>{articles.length?"Nenhuma publicação encontrada":"A biblioteca está sendo preparada"}</h3><p>{articles.length?"Experimente outro termo de pesquisa ou categoria.":"Os primeiros conteúdos exclusivos serão publicados aqui, após revisão das fontes e informações fiscais."}</p></div>}
 </div>;
}