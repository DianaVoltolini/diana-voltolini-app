import {notFound} from "next/navigation";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import LandingEditorForm from "./LandingEditorForm";
import styles from "./page.module.css";
export const dynamic="force-dynamic";
export default async function EditLanding({searchParams}:{searchParams:Promise<{id?:string}>}){
 await requireAdmin();const {id}=await searchParams;
 const {data,error}=id?await getSupabaseAdmin().from("marketing_landings").select("*").eq("id",id).maybeSingle():{data:null,error:null};
 if(id&&(!data||error))notFound();
 const {data:emailModels}=data?await getSupabaseAdmin().from("marketing_email_templates")
  .select("id,name,active,auto_enabled,audience_kind,kind,interest,subject,body").eq("landing_id",data.id):{data:[]};
 const readyModels=(emailModels??[]).filter(m=>m.active&&m.auto_enabled&&m.audience_kind==="leads"&&m.kind==="manual"&&!m.interest&&m.subject?.trim()&&m.body?.trim());
 return <main className={styles.main}><Link href="/torre/landings">← Voltar para Landing Pages</Link><p className={styles.kicker}>CONSTRUTOR DE LANDING</p><h1>{data?"Editar landing":"Nova landing"}</h1><p>Modelo padrão para entregar gratuitamente um PDF. A newsletter é opcional para o visitante.</p>
 {data&&<div className={styles.notice} style={{marginBlock:18}}>
 <strong>Etapas de publicação</strong>
 <p>1. Landing e PDF: {data.file_path?"Concluído":"PDF pendente"}.</p>
 <p>2. E-mail de entrega: {readyModels.length===1?"Modelo automático configurado":"Pendente — publicação bloqueada"}.</p>
 <Link href={readyModels[0]?"/torre/modelos-email/editor?editar="+readyModels[0].id:
 "/torre/modelos-email/editor?landing_id="+data.id}>{readyModels[0]?"Editar modelo de e-mail":"Gerar e configurar modelo de e-mail"}</Link>
 <p>Quando PDF e modelo estiverem concluídos, selecione “Publicada” e salve a landing.</p>
 </div>}
 <LandingEditorForm landing={data}/></main>;
}
