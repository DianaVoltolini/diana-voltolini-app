import Link from "next/link";
import TemplateEditor from "../template-editor";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import styles from "../../painel.module.css";
export const dynamic="force-dynamic";
export default async function EmailTemplateEditor({searchParams}:{searchParams:Promise<{editar?:string;erro?:string}>}){
 await requireAdmin();const params=await searchParams;const db=getSupabaseAdmin();
 const [{data:selected,error},{data:landings},{data:interestRows}]=await Promise.all([
 params.editar?db.from("marketing_email_templates").select("id,name,description,subject,body,kind,active,interest,landing_id,cta_label,cta_url").eq("id",params.editar).maybeSingle():Promise.resolve({data:null,error:null}),
 db.from("marketing_landings").select("id,title").order("created_at",{ascending:false}).limit(100),
 db.from("marketing_leads").select("interest").not("interest","is",null).limit(2000)
 ]);
 const interests=Array.from(new Set((interestRows??[]).map(x=>x.interest).filter((v):v is string=>typeof v==="string"&&v.length>0))).sort((a,b)=>a.localeCompare(b,"pt-BR"));
 return <main className={styles.page}><section className={styles.content}><div className="container">
 <header className={styles.pageHeader}><div><p className={styles.eyebrow}>MARKETING · MODELOS DE E-MAIL</p><h1>{selected?"Editar modelo":"Novo modelo"}</h1><p>Preencha os dados e acompanhe a prévia automaticamente.</p></div></header>
 {params.erro&&<p role="alert" style={{color:"#b42318"}}>Não foi possível salvar. Verifique os campos preenchidos.</p>}
 {error||params.editar&&!selected?<p role="alert">Modelo não encontrado.</p>:<section className={styles.diagnosticsSection}><TemplateEditor key={selected?.id??"novo"} selected={selected} interests={interests} landings={landings??[]}/></section>}
 </div></section></main>;
}