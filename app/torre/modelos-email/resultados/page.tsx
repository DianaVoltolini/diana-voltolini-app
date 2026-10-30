// app/torre/modelos-email/resultados/page.tsx
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import styles from "../../painel.module.css";
export const dynamic="force-dynamic";
const when=(v:string|null)=>v?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}).format(new Date(v)):"—";
const labels:Record<string,string>={accepted:"Aceito pelo SMTP",failed:"Falhou",sending:"Em processamento",pending:"Pendente",skipped:"Ignorado"};
export default async function NewsletterResults({searchParams}:{searchParams:Promise<{modelo?:string}>}){
 await requireAdmin();
 const params=await searchParams;
 const db=getSupabaseAdmin();
 const {data:models,error:modelError}=await db.from("marketing_email_templates").select("id,name,subject,landing_id,interest,auto_enabled").eq("active",true).order("created_at",{ascending:false}).limit(200);
 const chosen=(models??[]).find(m=>m.id===params.modelo)??models?.[0]??null;
 const [{data:deliveries,error:deliveryError},{data:unsubscribes,error:unsubError},{data:landings}]=await Promise.all([
   chosen?db.from("marketing_email_deliveries").select("email,lead_name,status,created_at,accepted_at,error_message").eq("template_id",chosen.id).order("created_at",{ascending:false}).limit(1000):Promise.resolve({data:[],error:null}),
   db.from("marketing_email_unsubscribes").select("email,created_at").order("created_at",{ascending:false}).limit(1000),
   db.from("marketing_landings").select("id,title").limit(200)
 ]);
 const [{count:totalLeads},{count:optedIn}]=await Promise.all([
   chosen?.landing_id?db.from("marketing_leads").select("*",{count:"exact",head:true}).eq("landing_id",chosen.landing_id):Promise.resolve({count:null}),
   chosen?.landing_id?db.from("marketing_leads").select("*",{count:"exact",head:true}).eq("landing_id",chosen.landing_id).eq("newsletter_opt_in",true):Promise.resolve({count:null})
 ]);
 const filtered=(deliveries??[]);
 const counts={accepted:filtered.filter(d=>d.status==="accepted").length,failed:filtered.filter(d=>d.status==="failed").length,pending:filtered.filter(d=>d.status==="pending").length,sending:filtered.filter(d=>d.status==="sending").length};
 const unsubEmails=new Set((unsubscribes??[]).map(v=>v.email.toLowerCase()));
 const unsubCampaign=filtered.filter(v=>unsubEmails.has(v.email.toLowerCase())).length;
 const chosenLanding=landings?.find(l=>l.id===chosen?.landing_id)?.title??"—";
 const card={border:"1px solid #e1e7ed",borderRadius:11,padding:17,background:"#fff"};
 return <main className={styles.page}><section className={styles.content}><div className="container" style={{maxWidth:1180}}>
 <header className={styles.pageHeader}><div><p className={styles.eyebrow}>MARKETING · NEWSLETTER</p><h1>Resultados das campanhas</h1><p>Acompanhe os envios, falhas e descadastros registrados pelo sistema.</p></div></header>
 <p><Link href="/torre/modelos-email" style={{color:"#86650c",fontWeight:700}}>← Voltar aos modelos de e-mail</Link></p>
 {modelError||deliveryError||unsubError?<p role="alert" style={{color:"#b42318"}}>Não foi possível consultar todos os resultados. Verifique as tabelas do Supabase.</p>:null}
 <form method="get" style={{...card,display:"grid",gap:9,maxWidth:580}}><label htmlFor="modelo" style={{fontWeight:700}}>Campanha</label><select id="modelo" name="modelo" defaultValue={chosen?.id??""} style={{padding:12,border:"1px solid #cad4e0",borderRadius:7}}>{(models??[]).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select><button type="submit" style={{justifySelf:"start",padding:"10px 16px",border:0,borderRadius:7,background:"#c9a227",fontWeight:750}}>Consultar</button></form>
 {chosen?<><p style={{color:"#607184",fontSize:13}}>Landing: <strong>{chosenLanding}</strong> · Envio automático: <strong>{chosen.auto_enabled?"Ativo":"Desativado"}</strong></p>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12}}>
 {([["Leads da landing",totalLeads],["Inscritos atualmente",optedIn],["Aceitos pelo SMTP",counts.accepted],["Falhas",counts.failed],["Pendentes",counts.pending+counts.sending],["Descadastros entre destinatários",unsubCampaign]] as const).map(([label,value])=><div key={label} style={card}><div style={{fontSize:13,color:"#607184"}}>{label}</div><strong style={{fontSize:30,color:"#102033"}}>{value??"—"}</strong></div>)}
 </div>
 <p style={{fontSize:13,color:"#607184"}}>Aceito pelo SMTP não significa entregue ou lido. O sistema ainda não mede aberturas, cliques nem respostas na caixa de e-mail. Contagens de envios e descadastros abaixo limitadas aos 1.000 registros mais recentes por campanha.</p>
 <section style={{...card,marginTop:16,overflowX:"auto"}}><h2 style={{fontSize:20,marginTop:0}}>Histórico dos destinatários</h2>
 <table style={{width:"100%",minWidth:650,borderCollapse:"collapse",fontSize:13}}><thead><tr>{["Destinatário","Status","Registro","Aceito em","Observação"].map(h=><th key={h} style={{textAlign:"left",padding:10,borderBottom:"2px solid #d9e1ea"}}>{h}</th>)}</tr></thead><tbody>{filtered.map((d,i)=><tr key={i}><td style={{padding:10,borderBottom:"1px solid #e7ebf0"}}>{d.lead_name?d.lead_name+" · ":""}{d.email}</td><td style={{padding:10,borderBottom:"1px solid #e7ebf0"}}>{labels[d.status]??d.status}{unsubEmails.has(d.email.toLowerCase())?" · Descadastrado":""}</td><td style={{padding:10,borderBottom:"1px solid #e7ebf0",whiteSpace:"nowrap"}}>{when(d.created_at)}</td><td style={{padding:10,borderBottom:"1px solid #e7ebf0",whiteSpace:"nowrap"}}>{when(d.accepted_at)}</td><td style={{padding:10,borderBottom:"1px solid #e7ebf0"}}>{d.error_message??"—"}</td></tr>)}</tbody></table>
 {!filtered.length&&<p style={{color:"#607184"}}>Nenhum envio registrado para esta campanha.</p>}
 </section></>:<p>Nenhum modelo disponível.</p>}
 </div></section></main>;
}
