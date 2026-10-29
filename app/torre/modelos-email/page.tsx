import Link from "next/link";
import TemplateEditor from "./template-editor";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import styles from "../painel.module.css";
export const dynamic="force-dynamic";
export default async function EmailTemplates({searchParams}:{searchParams:Promise<{editar?:string;salvo?:string;erro?:string}>}){
 await requireAdmin();const params=await searchParams;const db=getSupabaseAdmin();
 const [{data:models,error},{data:landings},{data:interestRows}]=await Promise.all([
  db.from("marketing_email_templates").select("id,name,description,subject,body,kind,active,created_at,interest,landing_id,cta_label,cta_url").order("created_at",{ascending:false}).limit(100),
  db.from("marketing_landings").select("id,title").order("created_at",{ascending:false}).limit(100),
  db.from("marketing_leads").select("interest").not("interest","is",null).limit(2000)
 ]);
 const selected=(models??[]).find(x=>x.id===params.editar)??null;
 const interests=Array.from(new Set((interestRows??[]).map(x=>x.interest).filter((v):v is string=>typeof v==="string"&&v.length>0))).sort((a,b)=>a.localeCompare(b,"pt-BR"));
 return <main className={styles.page}><section className={styles.content}><div className="container">
 <header className={styles.pageHeader}><div><p className={styles.eyebrow}>MARKETING</p><h1>Modelos de E-mail</h1><p>Preencha a campanha e confira o resultado automaticamente. Nenhum e-mail é enviado nesta tela.</p></div></header>
 {params.salvo&&<p role="status" style={{color:"#177246"}}>Modelo salvo com sucesso.</p>}
 {params.erro&&<p role="alert" style={{color:"#b42318"}}>Não foi possível salvar. Confirme os campos e a migração SQL.</p>}
 <section className={styles.diagnosticsSection}>
 {error?<p role="alert">Não foi possível carregar os modelos. Execute o SQL da atualização antes de utilizar o editor.</p>:<TemplateEditor key={selected?.id??"novo"} selected={selected} interests={interests} landings={landings??[]}/>}
 </section>
 <section className={styles.diagnosticsSection}><h2>Modelos cadastrados</h2>
 {!error&&<div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Campanha</th><th>Descrição</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
 {(models??[]).map(x=><tr key={x.id}><td>{x.name}<small>{x.subject}</small></td><td>{x.description||"—"}</td><td>{x.active?"Disponível":"Rascunho"}</td><td><Link href={"/torre/modelos-email?editar="+x.id+"#editar"} aria-label={"Editar "+x.name}>Editar</Link></td></tr>)}
 {!models?.length&&<tr><td colSpan={4}>Nenhum modelo cadastrado.</td></tr>}
 </tbody></table></div>}
 </section></div></section></main>;
}