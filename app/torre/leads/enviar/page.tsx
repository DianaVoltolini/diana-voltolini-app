import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {saveEmailDraft} from "../../modelos-email/actions";
import styles from "../../painel.module.css";
export const dynamic="force-dynamic";
export default async function EmailCampaign({searchParams}:{searchParams:Promise<{modelo?:string;erro?:string;salvo?:string}>}){
 await requireAdmin();const query=await searchParams;
 const db=getSupabaseAdmin();
 const [{data:models,error:modelError},{data:interests},{data:landings},{data:drafts}]=await Promise.all([
  db.from("marketing_email_templates").select("id,name,subject,body,active").eq("active",true).order("created_at",{ascending:false}).limit(100),
  db.from("marketing_leads").select("interest").not("interest","is",null).limit(2000),
  db.from("marketing_landings").select("id,title").order("created_at",{ascending:false}).limit(100),
  db.from("marketing_email_campaigns").select("id,subject,created_at").order("created_at",{ascending:false}).limit(20)
 ]);
 const selected=(models??[]).find(x=>x.id===query.modelo);
 const unique=Array.from(new Set((interests??[]).map(x=>x.interest).filter((x):x is string=>typeof x==="string"&&x.length>0))).sort((a,b)=>a.localeCompare(b,"pt-BR"));
 return <main className={styles.page}><section className={styles.content}><div className="container">
 <header className={styles.pageHeader}><div><p className={styles.eyebrow}>MARKETING · LEADS</p><h1>Preparar envio de e-mail</h1><p>Selecione um modelo, personalize a mensagem e defina o público. Os disparos ainda estão desativados.</p></div></header>
 {query.salvo&&<p role="status" style={{color:"#177246"}}>Campanha salva como rascunho. Nenhum e-mail foi enviado.</p>}
 {query.erro&&<p role="alert" style={{color:"#b42318"}}>Não foi possível salvar o rascunho. Confira a migração SQL.</p>}
 <section className={styles.diagnosticsSection}>
 {modelError?<p role="alert">Não foi possível consultar modelos de e-mail.</p>:<form action={saveEmailDraft} style={{display:"grid",gap:15,maxWidth:880}}>
 <div style={{display:"grid",gap:8}}><strong>Escolher modelo</strong>
 <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
 <Link href="/torre/leads/enviar" style={{padding:"9px 12px",border:"1px solid #d7e0e9",borderRadius:7}}>Mensagem personalizada</Link>
 {(models??[]).map(x=><Link key={x.id} href={"/torre/leads/enviar?modelo="+x.id} style={{padding:"9px 12px",border:"1px solid #d7e0e9",borderRadius:7,background:selected?.id===x.id?"#fff1d0":"#fff"}}>{x.name}</Link>)}
 </div><input type="hidden" name="template_id" value={selected?.id??""}/>
 </div>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>
 <label style={{display:"grid",gap:6}}>Interesse
 <select name="interest" style={{padding:12,border:"1px solid #d7e0e9",borderRadius:7}}><option value="">Todos os interesses</option>{unique.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
 <label style={{display:"grid",gap:6}}>Landing de origem
 <select name="landing_id" style={{padding:12,border:"1px solid #d7e0e9",borderRadius:7}}><option value="">Todas as landings</option>{(landings??[]).map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
 </div>
 <p style={{fontSize:13,color:"#647381",margin:0}}>Destinatários elegíveis: somente leads que autorizaram a newsletter. A contagem final e a exclusão de descadastros serão implementadas antes de liberar os disparos.</p>
 <label style={{display:"grid",gap:6}}>Assunto<input key={selected?.id??"custom"} required name="subject" defaultValue={selected?.subject??""} maxLength={180} style={{padding:12,border:"1px solid #d7e0e9",borderRadius:7}}/></label>
 <label style={{display:"grid",gap:6}}>Mensagem<textarea key={selected?.id??"custom"} required name="body" defaultValue={selected?.body??""} rows={15} maxLength={14000} style={{padding:12,border:"1px solid #d7e0e9",borderRadius:7,font:"inherit",lineHeight:1.6}}/></label>
 <div><button type="submit" style={{background:"#c9a227",border:0,borderRadius:7,padding:"13px 18px",fontWeight:800,color:"#102033"}}>Salvar rascunho</button></div>
 </form>}</section>
 <section className={styles.diagnosticsSection}><h2>Rascunhos recentes</h2>{(drafts??[]).map(x=><p key={x.id} style={{padding:"8px 0",borderBottom:"1px solid #e4eaf0"}}>{x.subject} · Rascunho</p>)}{!drafts?.length&&<p>Nenhum rascunho cadastrado.</p>}</section>
 </div></section></main>;
}
