// app/torre/modelos-email/envios-compras/page.tsx
// Acompanhamento somente leitura dos eventos de compra com reserva atômica.
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import styles from "../../painel.module.css";

export const dynamic="force-dynamic";
type Dispatch={
 id:string;order_id:string;event_key:string;status:string;
 recipient_email:string;reserved_at:string;sent_at:string|null;
 failed_at:string|null;error_message:string|null
};
const labels:Record<string,string>={
 default_charge_generated:"Cobrança gerada",
 default_payment_confirmed:"Pagamento confirmado"
};
const statusLabels:Record<string,string>={
 reserved:"Reservado",sent:"Enviado",failed:"Falha"
};
const format=(s:string|null)=>s?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(s)):"—";
const cell={padding:"12px 14px",borderBottom:"1px solid #e4eaf0",fontSize:13,verticalAlign:"top" as const};
export default async function PurchaseEmailDispatchesPage(){
 await requireAdmin();
 const db=getSupabaseAdmin();
 const {data,error}=await db.from("purchase_email_dispatches")
  .select("id,order_id,event_key,status,recipient_email,reserved_at,sent_at,failed_at,error_message")
  .order("reserved_at",{ascending:false}).limit(100);
 const rows=(data??[]) as Dispatch[];
 const sent=rows.filter(r=>r.status==="sent").length;
 const failed=rows.filter(r=>r.status==="failed").length;
 const reserved=rows.filter(r=>r.status==="reserved").length;
 return <main className={styles.page}><section className={styles.content}><div className="container">
  <header className={styles.pageHeader}>
   <div><p className={styles.eyebrow}>ADMINISTRAÇÃO · E-MAILS</p>
    <h1>Envios automáticos de compras</h1>
    <p>Consulte os registros dos modelos gerais de cobrança e pagamento. Esta tela não envia mensagens nem altera pedidos.</p>
   </div>
   <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}><Link className={styles.openLink} href="/torre/modelos-email/rotina-pagamentos">Ver execução da rotina Bling</Link><Link className={styles.openLink} href="/torre/modelos-email">Voltar aos modelos</Link></div>
  </header>
  {error?<section className={styles.diagnosticsSection}><p role="alert" style={{color:"#b42318"}}>Não foi possível consultar o histórico de e-mails automáticos. Verifique a tabela purchase_email_dispatches e as permissões do servidor.</p></section>:
   <>
    <section className={styles.diagnosticsSection}>
     <h2>Últimos 100 registros</h2>
     <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
      <div style={{border:"1px solid #e2e8f0",padding:16,borderRadius:9,minWidth:140,background:"#fff"}}><strong>{sent}</strong><p style={{margin:"4px 0 0",fontSize:13}}>Enviados</p></div>
      <div style={{border:"1px solid #e2e8f0",padding:16,borderRadius:9,minWidth:140,background:"#fff"}}><strong>{reserved}</strong><p style={{margin:"4px 0 0",fontSize:13}}>Reservados</p></div>
      <div style={{border:"1px solid #e2e8f0",padding:16,borderRadius:9,minWidth:140,background:"#fff"}}><strong>{failed}</strong><p style={{margin:"4px 0 0",fontSize:13}}>Falhas</p></div>
     </div>
     <p style={{color:"#607184",fontSize:13}}>Estes números representam somente os últimos 100 eventos dos modelos gerais, não todos os e-mails do site. Mensagens específicas do e-book, Diagnóstico e Fiscal na Prática possuem controles separados.</p>
     {rows.length===0?<div role="status" style={{padding:20,border:"1px solid #e2e8f0",borderRadius:9,background:"#fff"}}><strong>Nenhum disparo automático geral registrado.</strong><p style={{marginBottom:0,color:"#607184"}}>Isso é esperado enquanto não houver um evento real de cobrança ou pagamento de um produto que utilize os modelos gerais. Os testes realizados na Torre não geram registros financeiros.</p></div>:
      <div style={{overflowX:"auto"}}>
       <table style={{width:"100%",borderCollapse:"collapse",background:"#fff",border:"1px solid #e2e8f0"}}>
        <thead><tr style={{background:"#f1f5f9",textAlign:"left"}}>
         {["Evento","Situação","Destinatário","Reserva","Enviado em","Falha / detalhe","Pedido"].map(x=><th key={x} style={cell}>{x}</th>)}
        </tr></thead>
        <tbody>{rows.map(r=><tr key={r.id}>
         <td style={cell}>{labels[r.event_key]??r.event_key}</td>
         <td style={cell}><strong style={{color:r.status==="sent"?"#177246":r.status==="failed"?"#b42318":"#a16e13"}}>{statusLabels[r.status]??r.status}</strong></td>
         <td style={cell}>{r.recipient_email}</td>
         <td style={cell}>{format(r.reserved_at)}</td>
         <td style={cell}>{format(r.sent_at)}</td>
         <td style={{...cell,maxWidth:270,overflowWrap:"anywhere"}}>{r.error_message??(r.failed_at?"Falha sem detalhe":"—")}</td>
         <td style={{...cell,fontFamily:"monospace",fontSize:11}}>{r.order_id}</td>
        </tr>)}</tbody>
       </table>
      </div>}
    </section>
    <section className={styles.diagnosticsSection}>
     <h2>Como interpretar o resultado</h2>
     <p style={{fontSize:13,color:"#607184"}}><strong>Enviado:</strong> o servidor SMTP aceitou a mensagem. <strong>Reservado:</strong> houve tentativa iniciada, ainda sem confirmação final. <strong>Falha:</strong> houve problema no envio; o sistema não repete automaticamente para evitar duplicidades após respostas incertas do provedor.</p>
     <p style={{fontSize:13,color:"#607184",marginBottom:0}}>Esta página é somente de consulta. Em caso de falha, analise o registro antes de qualquer reenvio manual.</p>
    </section>
   </>}
 </div></section></main>;
}
