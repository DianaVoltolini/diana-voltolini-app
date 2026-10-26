import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import CategoriesManager from "./manager";
import styles from "../painel.module.css";
export const metadata:Metadata={title:"Categorias do Blog | Torre de Controle",robots:{index:false}};
export const dynamic="force-dynamic";
export default async function CategoriesPage({searchParams}:{searchParams:Promise<{erro?:string;salvo?:string;excluido?:string}>}){
 await requireAdmin();
 const params=await searchParams,db=getSupabaseAdmin();
 const [catResult,articlesResult]=await Promise.all([db.from("fiscal_categories").select("id,name").order("name",{ascending:true}),db.from("fiscal_articles").select("category").limit(1000)]);
 const counts=new Map<string,number>();for(const a of articlesResult.data??[])counts.set(a.category,(counts.get(a.category)??0)+1);
 const categories=(catResult.data??[]).map(c=>({...c,count:counts.get(c.name)??0}));
 return <main className={styles.page}><section className={styles.content}><div className="container"><header className={styles.pageHeader}>
 <p className={styles.eyebrow}>BLOG</p><h1>Categorias</h1><p>Cadastre e organize as categorias usadas nos artigos gratuitos e exclusivos. Ao renomear, os artigos vinculados também serão atualizados.</p>
 </header><section className={styles.diagnosticsSection}>
 <p><Link href="/torre/conteudos" style={{color:"#87650d",fontWeight:750}}>← Voltar aos artigos</Link></p>
 {params.salvo&&<p style={{color:"#167143",fontWeight:750}}>Categoria salva com sucesso.</p>}
 {params.excluido&&<p style={{color:"#167143",fontWeight:750}}>Categoria excluída.</p>}
 {params.erro&&<p role="alert" style={{color:"#b42318",fontWeight:750}}>{params.erro==="emuso"?"Não foi possível excluir. Se houver artigos vinculados, reclassifique-os primeiro.":"Não foi possível salvar. Verifique o nome, duplicidade e a configuração do Supabase."}</p>}
 {catResult.error||articlesResult.error?<p role="alert">Não foi possível carregar categorias. Execute o SQL de implantação da tabela fiscal_categories no Supabase e atualize a página.</p>:<CategoriesManager categories={categories}/>}
 </section></div></section></main>;
}
