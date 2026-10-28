import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {saveEmailTemplate} from "./actions";
import styles from "../painel.module.css";
export const dynamic="force-dynamic";
const welcome="Olá, {{nome}}!\n\nQue bom ter você por aqui!\n\nMeu objetivo é ajudar profissionais e empresas a compreender as mudanças fiscais e aplicá-las com mais segurança na rotina.\n\nVocê poderá receber conteúdos sobre Reforma Tributária, IBS/CBS, NF-e, impostos e os cuidados que fazem diferença no faturamento.\n\nConheça o Blog Fiscal: https://dianavoltolini.com.br/blog\n\nObrigada pelo interesse!\nDiana Voltolini";
export default async function EmailTemplates({searchParams}:{searchParams:Promise<{editar?:string;salvo?:string;erro?:string}>}){
 await requireAdmin();const params=await searchParams;const db=getSupabaseAdmin();
 const {data:models,error}=await db.from("marketing_email_templates").select("id,name,subject,body,kind,active,created_at").order("created_at",{ascending:false}).limit(100);
 const selected=(models??[]).find(x=>x.id===params.editar);
 return <main className={styles.page}><section className={styles.content}><div className="container">
 <header className={styles.pageHeader}><div><p className={styles.eyebrow}>MARKETING</p><h1>Modelos de E-mail</h1><p>Crie mensagens reutilizáveis. Nenhum e-mail é enviado nesta tela.</p></div></header>
 {params.salvo&&<p role="status" style={{color:"#177246"}}>Modelo salvo.</p>}{params.erro&&<p role="alert" style={{color:"#b42318"}}>Não foi possível salvar. Verifique os campos e a migração SQL.</p>}
 <section className={styles.diagnosticsSection}><h2>{selected?"Editar modelo":"Novo modelo"}</h2>
 <form action={saveEmailTemplate} style={{display:"grid",gap:14,maxWidth:880,marginTop:20}}>
 <input type="hidden" name="id" value={selected?.id??""}/>
 <label style={{display:"grid",gap:5}}>Nome interno<input required name="name" maxLength={120} defaultValue={selected?.name??"Boas-vindas ao Conhecimento Fiscal"} style={{padding:12,border:"1px solid #d6e0eb",borderRadius:7}}/></label>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
 <label style={{display:"grid",gap:5}}>Utilização<select name="kind" defaultValue={selected?.kind??"welcome"} style={{padding:12,border:"1px solid #d6e0eb",borderRadius:7}}><option value="welcome">Boas-vindas</option><option value="manual">Campanha manual</option></select></label>
 <label style={{display:"grid",gap:5}}>Situação<select name="active" defaultValue={selected?.active?"yes":"no"} style={{padding:12,border:"1px solid #d6e0eb",borderRadius:7}}><option value="no">Rascunho</option><option value="yes">Ativo para seleção</option></select></label>
 </div>
 <label style={{display:"grid",gap:5}}>Assunto<input required name="subject" maxLength={180} defaultValue={selected?.subject??"Boas-vindas ao Conhecimento Fiscal, {{nome}}!"} style={{padding:12,border:"1px solid #d6e0eb",borderRadius:7}}/></label>
 <label style={{display:"grid",gap:5}}>Mensagem<textarea required name="body" rows={15} maxLength={14000} defaultValue={selected?.body??welcome} style={{padding:13,border:"1px solid #d6e0eb",borderRadius:7,font:"inherit",lineHeight:1.6}}/></label>
 <small>Use {"{{nome}}"} para personalizar a saudação. A automação e o descadastro serão configurados antes de liberar envios.</small>
 <div><button type="submit" style={{padding:"13px 20px",background:"#c9a227",color:"#102033",border:0,borderRadius:7,fontWeight:800}}>Salvar modelo</button></div>
 </form></section>
 <section className={styles.diagnosticsSection}><h2>Modelos cadastrados</h2>
 {error?<p role="alert">Não foi possível consultar os modelos. Execute a migração SQL antes de utilizar este módulo.</p>:<div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Modelo</th><th>Tipo</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{(models??[]).map(x=><tr key={x.id}><td>{x.name}<small>{x.subject}</small></td><td>{x.kind==="welcome"?"Boas-vindas":"Campanha"}</td><td>{x.active?"Ativo":"Rascunho"}</td><td><Link href={"/torre/modelos-email?editar="+x.id}>Editar</Link></td></tr>)}{!models?.length&&<tr><td colSpan={4}>Nenhum modelo salvo.</td></tr>}</tbody></table></div>}
 </section></div></section></main>
}
