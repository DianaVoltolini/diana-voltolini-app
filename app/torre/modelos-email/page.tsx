import Link from "next/link";
import DeleteEmailTemplateButton from "./delete-email-template-button";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import styles from "../painel.module.css";
import css from "./models-list.module.css";
export const dynamic="force-dynamic";
export default async function EmailTemplates({searchParams}:{searchParams:Promise<{salvo?:string;erro?:string;excluido?:string}>}){
 await requireAdmin();const params=await searchParams;
 const {data:models,error}=await getSupabaseAdmin().from("marketing_email_templates").select("id,name,description,subject,active,kind,auto_enabled,created_at").order("created_at",{ascending:false}).limit(200);
 return <main className={styles.page}><section className={styles.content}><div className="container">
 <header className={styles.pageHeader} style={{display:"flex",alignItems:"end",justifyContent:"space-between",gap:24,flexWrap:"wrap"}}><div><p className={styles.eyebrow}>MARKETING</p><h1>Modelos de E-mail</h1><p>Organize os modelos utilizados nas campanhas e comunicações.</p></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link className={styles.openLink} href="/torre/modelos-email/resultados" style={{background:"#fff",border:"1px solid #d7e0e9",color:"#102033"}}>Resultados dos envios</Link><Link className={styles.openLink} href="/torre/modelos-email/editor">+ Novo modelo</Link></div></header>
 {params.salvo&&<p role="status" style={{color:"#177246"}}>Modelo salvo com sucesso.</p>}
 {params.excluido&&<p role="status" style={{color:"#177246"}}>Modelo excluído com sucesso.</p>}
 {params.erro&&<p role="alert" style={{color:"#b42318"}}>{params.erro==="vinculado"?"Este modelo possui campanhas ou envios vinculados. Para preservar o histórico, desative-o em vez de excluir.":params.erro==="automatico"?"Desative o envio automático deste modelo antes de excluí-lo.":params.erro==="protegido"?"Este modelo é utilizado pela automação de avisos do Blog e não pode ser excluído.":"Não foi possível excluir o modelo. Verifique as referências existentes."}</p>}
 <section className={styles.diagnosticsSection}><h2>Modelos cadastrados</h2>
 {error?<p role="alert">Não foi possível consultar os modelos.</p>:<div className={css.scroll}><table className={css.table}><thead><tr><th>Data</th><th>Nome da Campanha</th><th>Descrição</th><th>Tipo de envio</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
 {(models??[]).map(x=><tr key={x.id}><td className={css.date}>{new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(x.created_at))}</td><td><strong>{x.name}</strong><small>{x.subject}</small></td><td>{x.description||"—"}</td><td>{x.id.toLowerCase()==="b10b0000-0000-4000-8000-000000000001"||x.auto_enabled||x.kind==="welcome"?"Automático":"Manual"}</td><td>{x.active?"Disponível":"Desativado"}</td><td><div className={css.actions}><Link href={"/torre/modelos-email/editor?editar="+encodeURIComponent(x.id)} className={css.edit} title={"Editar "+x.name} aria-label={"Editar "+x.name}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 20h9M4 17l-1 4 4-1L19 8l-3-3L4 17ZM14 7l3 3"/></svg></Link><DeleteEmailTemplateButton id={x.id} name={x.name} locked={x.id.toLowerCase()==="b10b0000-0000-4000-8000-000000000001"}/></div></td></tr>)}
 {!models?.length&&<tr><td colSpan={6}>Nenhum modelo cadastrado.</td></tr>}</tbody></table></div>}
 </section></div></section></main>;
}