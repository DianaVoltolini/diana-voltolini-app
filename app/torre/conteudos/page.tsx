import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import FiscalArticleTable from "./article-table";
import styles from "../painel.module.css";
export const metadata:Metadata={title:"Blog | Torre de Controle"};
export const dynamic="force-dynamic";
export default async function ConteudosPage({searchParams}:{searchParams:Promise<{salvo?:string;excluido?:string;erro?:string}>}){
 await requireAdmin();
 const params=await searchParams;
 const {data,error}=await getSupabaseAdmin().from("fiscal_articles")
  .select("id,title,slug,category,visibility,status,published_at")
  .order("updated_at",{ascending:false}).limit(200);
 return <main className={styles.page}><section className={styles.content}><div className="container">
  <header className={styles.pageHeader} style={{display:"flex",alignItems:"end",justifyContent:"space-between",gap:24,flexWrap:"wrap"}}>
   <div><p className={styles.eyebrow}>MARKETING</p><h1>Blog</h1><p>Consulte, filtre e gerencie os conteúdos gratuitos e exclusivos dos assinantes.</p></div>
   <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}><Link href="/torre/categorias" className={styles.openLink} style={{background:"#fff",border:"1px solid #d7e0e9",color:"#102033"}}>Categorias</Link><Link href="/torre/conteudos/editor" className={styles.openLink}>+ Novo conteúdo</Link></div>
  </header>
  {params.excluido&&<p style={{color:"#167143",fontWeight:750}}>Conteúdo excluído definitivamente do Supabase.</p>}
  {params.salvo&&<p style={{color:"#167143",fontWeight:750}}>Conteúdo salvo com sucesso.</p>}
  {params.erro&&<p className={styles.errorMessage} role="alert">{
   params.erro==="duplicado"?"Já existe um conteúdo com este endereço (slug). Abra o conteúdo existente ou escolha outro slug.":
   params.erro==="categoria"?"A categoria selecionada não está cadastrada. Verifique o cadastro de categorias.":
   params.erro==="restricao"?"O banco recusou um dos dados informados. Revise o tipo de entrega e os campos do conteúdo.":
   params.erro==="estrutura"?"O cadastro do banco está desatualizado. Consulte os registros do servidor antes de tentar novamente.":
   params.erro==="referencia"?"O conteúdo faz referência a um registro que não está disponível.":
   params.erro==="dados"?"Revise título, resumo, endereço (slug), categoria, tipo de entrega e texto do conteúdo.":
   "Não foi possível salvar o conteúdo. O motivo técnico foi registrado no servidor para verificação."
  }</p>}
  {error?<p className={styles.errorMessage}>Não foi possível carregar os conteúdos.</p>:<section className={styles.diagnosticsSection}><h2>Conteúdos cadastrados</h2><FiscalArticleTable articles={data??[]}/></section>}
 </div></section></main>;
}