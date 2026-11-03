import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import styles from "../../painel.module.css";

export const dynamic="force-dynamic";
const when=(value:string|null)=>value?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}).format(new Date(value)):"—";
const labels:Record<string,string>={accepted:"Aceito pelo SMTP",failed:"Falhou",sending:"Em processamento",pending:"Pendente",skipped:"Ignorado"};
const card={border:"1px solid #e1e7ed",borderRadius:11,padding:17,background:"#fff"};
type Entry={key:string;label:string;type:"manual"|"automatic";id:string;templateId:string;planned:number|null;status:string|null};
type Recipient={email:string;lead_name:string|null;status:string;created_at:string;accepted_at:string|null;error_message:string|null};

export default async function NewsletterResults({searchParams}:{searchParams:Promise<{campanha?:string;modelo?:string}>}){
 await requireAdmin();
 const params=await searchParams;
 const db=getSupabaseAdmin();
 const [{data:models,error:modelsError},{data:manual,error:manualError},{data:automaticRefs,error:automaticRefsError}]=await Promise.all([
  db.from("marketing_email_templates").select("id,name").order("created_at",{ascending:false}).limit(300),
  db.from("marketing_manual_sends").select("id,template_id,description,created_at,recipient_count,status").order("created_at",{ascending:false}).limit(300),
  db.from("marketing_email_deliveries").select("template_id").order("created_at",{ascending:false}).limit(2000)
 ]);
 const modelNames=new Map((models??[]).map(m=>[m.id,m.name]));
 const entries:Entry[]=[
  ...(manual??[]).map(s=>({key:"manual:"+s.id,label:s.description+" · "+when(s.created_at),type:"manual" as const,id:s.id,templateId:s.template_id,planned:s.recipient_count,status:s.status})),
  ...Array.from(new Set((automaticRefs??[]).map(d=>d.template_id))).filter(id=>modelNames.has(id)).map(id=>({key:"automatic:"+id,label:modelNames.get(id)??"Campanha",type:"automatic" as const,id,templateId:id,planned:null,status:null}))
 ];
 const selected=entries.find(e=>e.key===params.campanha)
   ??entries.find(e=>e.type==="manual"&&e.templateId===params.modelo)
   ??entries.find(e=>e.templateId===params.modelo)
   ??entries[0]??null;
 const {data:records,error:recordsError}=selected?
  selected.type==="manual"
   ?await db.from("marketing_manual_send_recipients").select("email,lead_name,status,created_at,accepted_at,error_message").eq("send_id",selected.id).order("created_at",{ascending:false}).limit(1000)
   :await db.from("marketing_email_deliveries").select("email,lead_name,status,created_at,accepted_at,error_message").eq("template_id",selected.id).order("created_at",{ascending:false}).limit(1000)
  :{data:[] as Recipient[],error:null};
 const {data:unsubscribes,error:unsubError}=selected?
  await db.from("marketing_email_unsubscribes").select("email").limit(3000)
  :{data:[] as {email:string}[],error:null};
 const rows=(records??[]) as Recipient[];
 const unsubEmails=new Set((unsubscribes??[]).map(v=>v.email.trim().toLowerCase()));
 const counts={
  accepted:rows.filter(r=>r.status==="accepted").length,
  failed:rows.filter(r=>r.status==="failed").length,
  pending:rows.filter(r=>r.status==="pending"||r.status==="sending").length,
  unsubscribed:rows.filter(r=>unsubEmails.has(r.email.trim().toLowerCase())).length
 };
 const error=modelsError||manualError||automaticRefsError||recordsError||unsubError;
 return <main className={styles.page}><section className={styles.content}><div className="container" style={{maxWidth:1180}}>
  <header className={styles.pageHeader}><div><p className={styles.eyebrow}>MARKETING · NEWSLETTER</p><h1>Resultados das campanhas</h1><p>Selecione uma campanha para consultar os resultados e o histórico dos destinatários.</p></div></header>
  <p><Link href="/torre/modelos-email" style={{color:"#86650c",fontWeight:700}}>← Voltar aos modelos de e-mail</Link></p>
  {error&&<p role="alert" style={{color:"#b42318"}}>Não foi possível consultar todos os registros. Confira a conexão com o Supabase antes de interpretar os totais.</p>}
  <form method="get" style={{...card,display:"grid",gap:9,maxWidth:650}}>
   <label htmlFor="campanha" style={{fontWeight:700}}>Campanha</label>
   <select id="campanha" name="campanha" defaultValue={selected?.key??""} style={{padding:12,border:"1px solid #cad4e0",borderRadius:7}}>
    {entries.map(e=><option key={e.key} value={e.key}>{e.label}</option>)}
   </select>
   <button type="submit" disabled={!selected} style={{justifySelf:"start",padding:"10px 16px",border:0,borderRadius:7,background:"#c9a227",fontWeight:750}}>Consultar</button>
  </form>
  {!selected?<p style={{marginTop:20,color:"#607184"}}>Nenhuma campanha com envio registrado.</p>:<>
   <p style={{color:"#607184",fontSize:13,marginTop:16}}>
    {selected.planned!==null?<>Destinatários previstos: <strong>{selected.planned}</strong> · </>:null}
    Os números indicam registros do sistema, não confirmação de entrega ou leitura.
   </p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12}}>
    {([["Aceitos pelo SMTP",counts.accepted],["Falhas",counts.failed],["Pendentes",counts.pending],["Descadastrados entre destinatários",counts.unsubscribed]] as const).map(([label,value])=><div key={label} style={card}><div style={{fontSize:13,color:"#607184"}}>{label}</div><strong style={{fontSize:30,color:"#102033"}}>{error?"—":value}</strong></div>)}
   </div>
   <p style={{fontSize:13,color:"#607184"}}>Aceito pelo SMTP não significa entregue ou lido. O histórico apresenta até 1.000 registros mais recentes. Não repita um disparo caso haja pendências sem conferir o processamento.</p>
   <section style={{...card,marginTop:16,overflowX:"auto"}}>
    <h2 style={{fontSize:20,marginTop:0}}>Histórico dos destinatários</h2>
    <table style={{width:"100%",minWidth:650,borderCollapse:"collapse",fontSize:13}}>
     <thead><tr>{["Destinatário","Status","Registro","Aceito em","Observação"].map(h=><th key={h} style={{textAlign:"left",padding:10,borderBottom:"2px solid #d9e1ea"}}>{h}</th>)}</tr></thead>
     <tbody>{rows.map((r,i)=><tr key={r.email+"-"+r.created_at+"-"+i}>
      <td style={{padding:10,borderBottom:"1px solid #e7ebf0"}}>{r.lead_name?r.lead_name+" · ":""}{r.email}</td>
      <td style={{padding:10,borderBottom:"1px solid #e7ebf0"}}>{labels[r.status]??r.status}{unsubEmails.has(r.email.trim().toLowerCase())?" · Descadastrado":""}</td>
      <td style={{padding:10,borderBottom:"1px solid #e7ebf0",whiteSpace:"nowrap"}}>{when(r.created_at)}</td>
      <td style={{padding:10,borderBottom:"1px solid #e7ebf0",whiteSpace:"nowrap"}}>{when(r.accepted_at)}</td>
      <td style={{padding:10,borderBottom:"1px solid #e7ebf0"}}>{r.error_message??"—"}</td>
     </tr>)}</tbody>
    </table>
    {!rows.length&&!error&&<p style={{color:"#607184"}}>Nenhum destinatário registrado nesta campanha.</p>}
   </section>
  </>}
 </div></section></main>;
}
