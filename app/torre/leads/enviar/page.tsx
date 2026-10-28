import EmailLinkMenu from "../../modelos-email/email-link-menu";
import EmailPreview from "../../modelos-email/email-preview";
import Link from "next/link";
import DeleteDraftButton from "./delete-draft-button";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {saveEmailDraft} from "../../modelos-email/actions";
import styles from "../../painel.module.css";
export const dynamic="force-dynamic";
export default async function EmailCampaign({searchParams}:{searchParams:Promise<{modelo?:string;editar?:string;erro?:string;salvo?:string;excluido?:string}>}){
 await requireAdmin();const query=await searchParams;
 const db=getSupabaseAdmin();
 const [{data:models,error:modelError},{data:interests},{data:landings},{data:drafts}]=await Promise.all([
  db.from("marketing_email_templates").select("id,name,subject,body,active").eq("active",true).order("created_at",{ascending:false}).limit(100),
  db.from("marketing_leads").select("interest").not("interest","is",null).limit(2000),
  db.from("marketing_landings").select("id,title").order("created_at",{ascending:false}).limit(100),
  db.from("marketing_email_campaigns").select("id,subject,body,template_id,interest,landing_id,created_at").order("created_at",{ascending:false}).limit(20)
 ]);
 const draft=(drafts??[]).find(x=>x.id===query.editar);
 const selected=draft?null:(models??[]).find(x=>x.id===query.modelo);
 const unique=Array.from(new Set((interests??[]).map(x=>x.interest).filter((x):x is string=>typeof x==="string"&&x.length>0))).sort((a,b)=>a.localeCompare(b,"pt-BR"));
 return <main className={styles.page}><section className={styles.content}><div className="container">
 <header className={styles.pageHeader}><div><p className={styles.eyebrow}>MARKETING · LEADS</p><h1>Preparar envio de e-mail</h1><p>Selecione um modelo, personalize a mensagem e defina o público. Os disparos ainda estão desativados.</p></div></header>
 {query.excluido&&<p role="status" style={{color:"#177246"}}>Rascunho excluído.</p>}
 {query.salvo&&<p role="status" style={{color:"#177246"}}>Campanha salva como rascunho. Nenhum e-mail foi enviado.</p>}
 {query.erro&&<p role="alert" style={{color:"#b42318"}}>Não foi possível salvar o rascunho. Confira a migração SQL.</p>}
 <section id="editar" className={styles.diagnosticsSection}>
 <h2 style={{marginTop:0}}>{draft?"Editar rascunho":"Novo rascunho"}</h2>
 {modelError?<p role="alert">Não foi possível consultar modelos de e-mail.</p>:<form action={saveEmailDraft} style={{display:"grid",gap:15,maxWidth:880}}>
 <input type="hidden" name="id" value={draft?.id??""}/>
 <div style={{display:"grid",gap:8}}><strong>Escolher modelo</strong>
 <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
 <Link href="/torre/leads/enviar" style={{padding:"9px 12px",border:"1px solid #d7e0e9",borderRadius:7}}>Mensagem personalizada</Link>
 {(models??[]).map(x=><Link key={x.id} href={"/torre/leads/enviar?modelo="+x.id} style={{padding:"9px 12px",border:"1px solid #d7e0e9",borderRadius:7,background:selected?.id===x.id?"#fff1d0":"#fff"}}>{x.name}</Link>)}
 </div><input type="hidden" name="template_id" value={draft?.template_id??selected?.id??""}/>
 </div>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>
 <label style={{display:"grid",gap:6}}>Interesse
 <select key={draft?.id??"new-interest"} defaultValue={draft?.interest??""} name="interest" style={{padding:12,border:"1px solid #d7e0e9",borderRadius:7}}><option value="">Todos os interesses</option>{unique.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
 <label style={{display:"grid",gap:6}}>Landing de origem
 <select key={draft?.id??"new-landing"} defaultValue={draft?.landing_id??""} name="landing_id" style={{padding:12,border:"1px solid #d7e0e9",borderRadius:7}}><option value="">Todas as landings</option>{(landings??[]).map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
 </div>
 <p style={{fontSize:13,color:"#647381",margin:0}}>Destinatários elegíveis: somente leads que autorizaram a newsletter. A contagem final e a exclusão de descadastros serão implementadas antes de liberar os disparos.</p>
 <label style={{display:"grid",gap:6}}>Assunto<input key={draft?.id??selected?.id??"custom"} id="email-preview-subject" required name="subject" defaultValue={draft?.subject??selected?.subject??""} maxLength={180} style={{padding:12,border:"1px solid #d7e0e9",borderRadius:7}}/></label>
 <label style={{display:"grid",gap:6}}>Mensagem<textarea key={draft?.id??selected?.id??"custom"} id="email-preview-body" required name="body" defaultValue={draft?.body??selected?.body??""} rows={15} maxLength={14000} style={{padding:12,border:"1px solid #d7e0e9",borderRadius:7,font:"inherit",lineHeight:1.6}}/></label>
 <EmailLinkMenu bodyId="email-preview-body"/>
 <EmailPreview subjectId="email-preview-subject" bodyId="email-preview-body"/>
 <div><button type="submit" style={{background:"#c9a227",border:0,borderRadius:7,padding:"13px 18px",fontWeight:800,color:"#102033"}}>{draft?"Salvar alterações":"Salvar rascunho"}</button>{draft&&<Link href="/torre/leads/enviar" style={{marginLeft:14}}>Cancelar edição</Link>}</div>
 </form>}</section>
 <section className={styles.diagnosticsSection}><h2>Rascunhos recentes</h2>{(drafts??[]).map(x=><div key={x.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,padding:"12px 0",borderBottom:"1px solid #e4eaf0"}}><span style={{overflowWrap:"anywhere"}}>{x.subject} · Rascunho</span><div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}><Link href={"/torre/leads/enviar?editar="+x.id+"#editar"} aria-label="Editar rascunho" title="Editar rascunho" style={{display:"inline-flex",padding:8,border:"1px solid #d7e0e9",borderRadius:7,background:"#fff",color:"#102033"}}><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 20h9M4 17l-1 4 4-1L19 8l-3-3L4 17ZM14 7l3 3"/></svg></Link><DeleteDraftButton id={x.id}/></div></div>)}{!drafts?.length&&<p>Nenhum rascunho cadastrado.</p>}</section>
 </div></section></main>;
}
