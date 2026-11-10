import Link from "next/link";
import TemplateEditor from "../template-editor";
import ControlledNewsletterTest from "../controlled-test";
import {sendTransactionalTest} from "../transacionais/actions";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import styles from "../../painel.module.css";
export const dynamic="force-dynamic";
export default async function EmailTemplateEditor({searchParams}:{searchParams:Promise<{editar?:string;tipo?:string;erro?:string;teste?:string}>}){
 await requireAdmin();const params=await searchParams;const db=getSupabaseAdmin();
 const [{data:selected,error},{data:landings},{data:interestRows}]=await Promise.all([
 params.editar?db.from("marketing_email_templates").select("id,name,description,subject,body,kind,active,interest,landing_id,cta_label,cta_url,auto_enabled,auto_include_existing,audience_kind").eq("id",params.editar).maybeSingle():Promise.resolve({data:null,error:null}),
 db.from("marketing_landings").select("id,title").order("created_at",{ascending:false}).limit(100),
 db.from("marketing_leads").select("interest").not("interest","is",null).limit(2000)
 ]);
 const interests=Array.from(new Set((interestRows??[]).map(x=>x.interest).filter((v):v is string=>typeof v==="string"&&v.length>0))).sort((a,b)=>a.localeCompare(b,"pt-BR"));
 return <main className={styles.page}><section className={styles.content}><div className="container">
 <header className={styles.pageHeader}><div><p className={styles.eyebrow}>MARKETING · MODELOS DE E-MAIL</p><h1>{selected?"Editar modelo":"Novo modelo"}</h1><p>Preencha os dados e acompanhe a prévia automaticamente.</p></div></header>
 {params.teste&&<p role="status" style={{color:"#167143"}}>E-mail de teste enviado ao endereço informado.</p>}
 {params.erro&&<p role="alert" style={{color:"#b42318"}}>Não foi possível salvar. Verifique os campos preenchidos.</p>}
 {error||params.editar&&!selected?<p role="alert">Modelo não encontrado.</p>:<section className={styles.diagnosticsSection}><TemplateEditor key={selected?.id??"novo"} selected={selected} interests={interests} landings={landings??[]} defaultAudience={params.tipo==="clientes"?"buyers":"leads"}/></section>}
 {selected&&(selected.kind==="transactional"?<section className={styles.diagnosticsSection} style={{marginTop:20}}><h2>Enviar e-mail de teste</h2><p>Envie uma prévia somente para o endereço informado. Não altera pagamentos nem dispara mensagens para compradores.</p><form action={sendTransactionalTest} style={{display:"grid",gap:12,maxWidth:540}}><input type="hidden" name="id" value={selected.id}/><label>Seu e-mail para teste<input type="email" name="test_email" required placeholder="seuemail@dominio.com" style={{width:"100%",padding:12,border:"1px solid #cbd5e1",borderRadius:7}}/></label><label><input type="checkbox" name="confirm" value="yes" required/> Confirmo o envio de um único e-mail de teste</label><button type="submit" style={{justifySelf:"start",padding:"12px 18px",background:"#c9a227",border:0,borderRadius:7}}>Enviar teste</button></form></section>:<ControlledNewsletterTest templateId={selected.id}/>)}
 </div></section></main>;
}