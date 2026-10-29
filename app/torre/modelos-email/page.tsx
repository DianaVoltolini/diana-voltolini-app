import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import styles from "../painel.module.css";
import css from "./models-list.module.css";
export const dynamic="force-dynamic";
export default async function EmailTemplates({searchParams}:{searchParams:Promise<{salvo?:string;erro?:string}>}){
 await requireAdmin();const params=await searchParams;
 const {data:models,error}=await getSupabaseAdmin().from("marketing_email_templates").select("id,name,description,subject,active,created_at").order("created_at",{ascending:false}).limit(200);
 return <main className={styles.page}><section className={styles.content}><div className="container">
 <header className={styles.pageHeader}><div><p className={styles.eyebrow}>MARKETING</p><h1>Modelos de E-mail</h1><p>Organize os modelos utilizados nas campanhas e comunicações.</p></div><Link className={css.add} href="/torre/modelos-email/editor">+ Novo modelo</Link></header>
 {params.salvo&&<p role="status" style={{color:"#177246"}}>Modelo salvo com sucesso.</p>}
 {params.erro&&<p role="alert" style={{color:"#b42318"}}>Não foi possível salvar o modelo.</p>}
 <section className={styles.diagnosticsSection}><h2>Modelos cadastrados</h2>
 {error?<p role="alert">Não foi possível consultar os modelos.</p>:<div className={css.scroll}><table className={css.table}><thead><tr><th>Data</th><th>Nome da Campanha</th><th>Descrição</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
 {(models??[]).map(x=><tr key={x.id}><td className={css.date}>{new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(x.created_at))}</td><td><strong>{x.name}</strong><small>{x.subject}</small></td><td>{x.description||"—"}</td><td>{x.active?"Disponível":"Rascunho"}</td><td><Link href={"/torre/modelos-email/editor?editar="+encodeURIComponent(x.id)} className={css.edit} title={"Editar "+x.name} aria-label={"Editar "+x.name}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 20h9M4 17l-1 4 4-1L19 8l-3-3L4 17ZM14 7l3 3"/></svg></Link></td></tr>)}
 {!models?.length&&<tr><td colSpan={5}>Nenhum modelo cadastrado.</td></tr>}</tbody></table></div>}
 </section></div></section></main>;
}