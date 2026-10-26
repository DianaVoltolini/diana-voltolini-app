import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import FiscalArticleTable from "./article-table";
import styles from "../painel.module.css";
export const metadata:Metadata={title:"Conteúdos | Torre de Controle"};
export const dynamic="force-dynamic";
export default async function ConteudosPage({searchParams}:{searchParams:Promise<{salvo?:string;excluido?:string;erro?:string}>}){
 await requireAdmin();
 const params=await searchParams;
 const {data,error}=await getSupabaseAdmin().from("fiscal_articles")
  .select("id,title,slug,category,visibility,status,published_at")
  .order("updated_at",{ascending:false}).limit(200);
 return <main className={styles.page}><section className={styles.content}><div className="container">
  <header className={styles.pageHeader} style={{display:"flex",alignItems:"end",justifyContent:"space-between",gap:24,flexWrap:"wrap"}}>
   <div><p className={styles.eyebrow}>GESTÃO DE CONTEÚDOS</p><h1>Gestão de conteúdos</h1><p>Consulte, filtre e gerencie os conteúdos gratuitos e exclusivos dos assinantes.</p></div>
   <Link href="/torre/conteudos/editor" className={styles.openLink}>+ Novo conteúdo</Link>
  </header>
  {params.excluido&&<p style={{color:"#167143",fontWeight:750}}>Conteúdo excluído definitivamente do Supabase.</p>}
  {params.salvo&&<p style={{color:"#167143",fontWeight:750}}>Conteúdo salvo com sucesso.</p>}
  {params.erro&&<p className={styles.errorMessage}>Não foi possível concluir a operação. Confira os dados ou tente novamente.</p>}
  {error?<p className={styles.errorMessage}>Não foi possível carregar os conteúdos.</p>:<section className={styles.diagnosticsSection}><h2>Conteúdos cadastrados</h2><FiscalArticleTable articles={data??[]}/></section>}
 </div></section></main>;
}