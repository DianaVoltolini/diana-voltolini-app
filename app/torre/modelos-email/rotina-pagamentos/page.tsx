// app/torre/modelos-email/rotina-pagamentos/page.tsx
// Painel de leitura da execução da conciliação Bling; não executa a rotina.
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import styles from "../../painel.module.css";
export const dynamic="force-dynamic";
type Run={id:string;started_at:string;finished_at:string|null;status:string;checked:number|null;opened:number|null;partial:number|null;paid:number|null;cancelled:number|null;ignored:number|null;errors:number|null;interrupted:boolean|null;duration_ms:number|null;error_message:string|null};
const fmt=(s:string|null)=>s?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"medium",timeZone:"America/Sao_Paulo"}).format(new Date(s)):"—";
const th={textAlign:"left" as const,padding:12,borderBottom:"1px solid #dce4ec"};
const td={padding:12,borderBottom:"1px solid #e4eaf0",verticalAlign:"top" as const,fontSize:13};
export default async function PaymentCronStatusPage(){
 await requireAdmin();
 const {data,error}=await getSupabaseAdmin().from("payment_sync_run_logs")
  .select("id,started_at,finished_at,status,checked,opened,partial,paid,cancelled,ignored,errors,interrupted,duration_ms,error_message")
  .order("started_at",{ascending:false}).limit(30);
 const rows=(data??[]) as Run[],last=rows[0];
 return <main className={styles.page}><section className={styles.content}><div className="container">
  <header className={styles.pageHeader}>
   <div><p className={styles.eyebrow}>ADMINISTRAÇÃO · CONCILIAÇÃO</p><h1>Execuções da rotina Bling</h1>
    <p>Acompanhe quando o site consultou pagamentos e verificou cobranças. Somente leitura.</p></div>
   <Link href="/torre/modelos-email/envios-compras">Consultar envios automáticos</Link>
  </header>
  <section className={styles.diagnosticsSection}>
   <h2>Última execução registrada</h2>
   {error?<p role="alert" style={{color:"#b42318"}}>Não foi possível consultar o histórico. Verifique se a tabela payment_sync_run_logs foi criada no Supabase.</p>:
   !last?<div role="status" style={{background:"#fff9eb",padding:17,border:"1px solid #eed9aa",borderRadius:8}}>Ainda não há execução registrada. Isso não comprova que a rotina esteja inativa: o histórico começa a ser preenchido após a publicação do registro no site. Confira também o agendamento externo na Hostinger.</div>:
   <div style={{padding:18,border:"1px solid #dce4ec",borderRadius:8,background:"#fff"}}>
    <strong>{fmt(last.started_at)}</strong>
    <p style={{margin:"8px 0",fontSize:13}}>Situação: <strong>{last.status==="finished"?"Concluída":last.status==="error"?"Erro":"Em andamento / sem conclusão registrada"}</strong></p>
    <p style={{margin:"8px 0",fontSize:13}}>Pagamentos verificados: {last.checked??"—"} · Cobranças abertas: {last.opened??"—"} · Pagamentos confirmados: {last.paid??"—"} · Erros por pagamento: {last.errors??"—"}</p>
    <p style={{fontSize:13,color:"#607184"}}>A frequência da conciliação é definida no agendamento do Supabase. Consulte a data da última execução e os próximos horários programados para avaliar o funcionamento.</p>
    {last.error_message&&<p style={{fontSize:13,color:"#b42318",overflowWrap:"anywhere"}}>{last.error_message}</p>}
   </div>}
   <p style={{fontSize:13,color:"#607184"}}>Este painel não garante, por si só, uma frequência específica do agendador. Execução sem pagamentos pendentes também gera registro com zero verificações. Os e-mails são acompanhados separadamente na tela de envios automáticos.</p>
  </section>
  {!error&&rows.length>0&&<section className={styles.diagnosticsSection}>
   <h2>Últimas 30 execuções</h2>
   <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",background:"#fff"}}>
    <thead><tr>{["Início","Conclusão","Situação","Verificados","Abertos","Pagos","Falhas","Duração"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead>
    <tbody>{rows.map(r=><tr key={r.id}>
     <td style={td}>{fmt(r.started_at)}</td><td style={td}>{fmt(r.finished_at)}</td>
     <td style={td}>{r.status==="finished"?"Concluída":r.status==="error"?"Erro":"Em andamento"}{r.interrupted?" (tempo limite)":""}</td>
     <td style={td}>{r.checked??"—"}</td><td style={td}>{r.opened??"—"}</td>
     <td style={td}>{r.paid??"—"}</td><td style={td}>{r.errors??"—"}</td>
     <td style={td}>{r.duration_ms==null?"—":(r.duration_ms/1000).toFixed(1)+" s"}</td>
    </tr>)}</tbody>
   </table></div>
  </section>}
 </div></section></main>;
}
