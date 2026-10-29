import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import ManualComposer from "./manual-composer";
import styles from "../../../painel.module.css";
export const dynamic="force-dynamic";
export default async function ManualEmailPage(){
 await requireAdmin();const db=getSupabaseAdmin();
 const [{data:models,error},{data:interestRows},{data:landings}]=await Promise.all([
  db.from("marketing_email_templates").select("id,name,subject,body,interest,landing_id,cta_url,cta_label").eq("active",true).order("name",{ascending:true}).limit(100),
  db.from("marketing_leads").select("interest").not("interest","is",null).limit(2000),
  db.from("marketing_landings").select("id,title").order("created_at",{ascending:false}).limit(100)
 ]);
 const interests=Array.from(new Set((interestRows??[]).map(x=>x.interest).filter((v):v is string=>typeof v==="string"&&v.length>0))).sort((a,b)=>a.localeCompare(b,"pt-BR"));
 return <main className={styles.page}><section className={styles.content}><div className="container">
  <header className={styles.pageHeader} style={{display:"flex",alignItems:"end",justifyContent:"space-between",gap:24,flexWrap:"wrap"}}>
   <div><p className={styles.eyebrow}>MARKETING · LEADS</p><h1>Envio manual</h1><p>Escolha um modelo, confira os filtros e faça o teste antes de liberar a campanha.</p></div>
   <Link href="/torre/leads" className={styles.openLink} style={{background:"#fff",border:"1px solid #d7e0e9",color:"#102033"}}>Voltar aos Leads</Link>
  </header>
  {error?<p role="alert">Não foi possível carregar os modelos de e-mail.</p>:<ManualComposer models={models??[]} interests={interests} landings={landings??[]}/>}
 </div></section></main>;
}