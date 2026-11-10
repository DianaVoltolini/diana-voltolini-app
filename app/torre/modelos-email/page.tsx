import Link from "next/link";
import EmailModelsTable from "./email-models-table";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import styles from "../painel.module.css";
export const dynamic="force-dynamic";
export default async function EmailTemplates({searchParams}:{searchParams:Promise<{salvo?:string;erro?:string;excluido?:string}>}){
 await requireAdmin();const params=await searchParams;
 const {data:models,error}=await getSupabaseAdmin().from("marketing_email_templates").select("id,name,description,subject,active,kind,auto_enabled,created_at").order("created_at",{ascending:false}).limit(200);
 return <main className={styles.page}><section className={styles.content}><div className="container">
 <header className={styles.pageHeader} style={{display:"flex",alignItems:"end",justifyContent:"space-between",gap:24,flexWrap:"wrap"}}><div><p className={styles.eyebrow}>MARKETING</p><h1>Modelos de E-mail</h1><p>Organize os modelos utilizados nas campanhas e comunicações.</p></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link className={styles.openLink} href="/torre/modelos-email/resultados" style={{background:"#fff",border:"1px solid #d7e0e9",color:"#102033"}}>Resultados dos envios</Link><Link className={styles.openLink} href="/torre/modelos-email/editor?tipo=produto" style={{background:"#fff",border:"1px solid #d7e0e9",color:"#102033"}}>+ E-mail de produto</Link><Link className={styles.openLink} href="/torre/modelos-email/editor">+ Novo modelo</Link></div></header>
 {params.salvo&&<p role="status" style={{color:"#177246"}}>Modelo salvo com sucesso.</p>}
 {params.excluido&&<p role="status" style={{color:"#177246"}}>Modelo excluído com sucesso.</p>}
 {params.erro&&<p role="alert" style={{color:"#b42318"}}>{params.erro==="vinculado"?"Este modelo possui campanhas ou envios vinculados. Para preservar o histórico, desative-o em vez de excluir.":params.erro==="automatico"?"Desative o envio automático deste modelo antes de excluí-lo.":params.erro==="protegido"?"Este modelo é utilizado pela automação de avisos do Blog e não pode ser excluído.":"Não foi possível excluir o modelo. Verifique as referências existentes."}</p>}
 <section className={styles.diagnosticsSection}><h2>Modelos cadastrados</h2>
 {error?<p role="alert">Não foi possível consultar os modelos.</p>:<EmailModelsTable models={models??[]}/>}
 </section></div></section></main>;
}