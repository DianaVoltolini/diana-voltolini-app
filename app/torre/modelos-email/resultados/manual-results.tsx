import {getSupabaseAdmin} from "@/lib/supabase/admin";

const when=(value:string|null)=>value?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}).format(new Date(value)):"—";
const labels:Record<string,string>={accepted:"Aceito pelo SMTP",failed:"Falhou",sending:"Em processamento",pending:"Pendente",skipped:"Ignorado"};
const card={border:"1px solid #e1e7ed",borderRadius:11,padding:17,background:"#fff"};
const uuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export default async function ManualCampaignResults({templateId,requestedId}:{templateId:string;requestedId?:string}){
 const db=getSupabaseAdmin();
 const {data:campaigns,error:campaignError}=await db.from("marketing_manual_sends")
   .select("id,description,created_at,recipient_count,status")
   .eq("template_id",templateId).order("created_at",{ascending:false}).limit(200);
 if(campaignError)return <p role="alert" style={{color:"#b42318"}}>Não foi possível consultar os resultados dos envios manuais.</p>;
 const selected=(requestedId&&uuid(requestedId)?campaigns?.find(c=>c.id===requestedId):null)??campaigns?.[0]??null;
 const {data:recipients,error:recipientsError}=selected?await db.from("marketing_manual_send_recipients")
   .select("email,lead_name,status,created_at,accepted_at,error_message")
   .eq("send_id",selected.id).order("created_at",{ascending:false}).limit(1000):{data:[],error:null};
 const rows=recipients??[];
 const accepted=rows.filter(r=>r.status==="accepted").length;
 const failed=rows.filter(r=>r.status==="failed").length;
 const pending=rows.filter(r=>r.status==="pending"||r.status==="sending").length;
 return <section style={{marginTop:20}}>
  <h2 style={{fontSize:22,marginBottom:8}}>Envios manuais</h2>
  {!selected?<p style={{color:"#607184"}}>Nenhuma campanha manual registrada para este modelo.</p>:<>
   <form method="get" style={{...card,display:"grid",gap:9,maxWidth:680}}>
    <input type="hidden" name="modelo" value={templateId}/>
    <label htmlFor="envio" style={{fontWeight:700}}>Campanha manual realizada</label>
    <select id="envio" name="envio" defaultValue={selected.id} style={{padding:12,border:"1px solid #cad4e0",borderRadius:7}}>
     {(campaigns??[]).map(c=><option key={c.id} value={c.id}>{c.description} · {when(c.created_at)}</option>)}
    </select>
    <button type="submit" style={{justifySelf:"start",padding:"10px 16px",border:0,borderRadius:7,background:"#c9a227",fontWeight:750}}>Consultar campanha</button>
   </form>
   <p style={{color:"#607184",fontSize:13}}>Status: <strong>{selected.status==="completed"?"Concluído":selected.status==="partial"?"Parcial":"Em processamento"}</strong> · Destinatários previstos: <strong>{selected.recipient_count}</strong>. Os números abaixo correspondem aos registros consultados, não à entrega na caixa de entrada.</p>
   {recipientsError?<p role="alert" style={{color:"#b42318"}}>Não foi possível consultar os destinatários do envio manual.</p>:<>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12}}>
     {([["Aceitos pelo SMTP",accepted],["Falhas",failed],["Pendentes",pending],["Registros consultados",rows.length]] as const).map(([label,value])=><div key={label} style={card}><div style={{fontSize:13,color:"#607184"}}>{label}</div><strong style={{fontSize:30,color:"#102033"}}>{value}</strong></div>)}
    </div>
    <p style={{color:"#607184",fontSize:13}}>Aceito pelo SMTP não garante entrega ou leitura. O histórico mostra até 1.000 destinatários por envio. Se houver registros pendentes, confira os logs antes de repetir a campanha.</p>
    <div style={{...card,marginTop:16,overflowX:"auto"}}>
     <h3 style={{fontSize:19,marginTop:0}}>Histórico dos destinatários — envio manual</h3>
     <table style={{width:"100%",minWidth:650,borderCollapse:"collapse",fontSize:13}}>
      <thead><tr>{["Destinatário","Status","Registro","Aceito em","Observação"].map(h=><th key={h} style={{textAlign:"left",padding:10,borderBottom:"2px solid #d9e1ea"}}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r,i)=><tr key={r.email+"-"+i}><td style={{padding:10,borderBottom:"1px solid #e7ebf0"}}>{r.lead_name?r.lead_name+" · ":""}{r.email}</td><td style={{padding:10,borderBottom:"1px solid #e7ebf0"}}>{labels[r.status]??r.status}</td><td style={{padding:10,borderBottom:"1px solid #e7ebf0"}}>{when(r.created_at)}</td><td style={{padding:10,borderBottom:"1px solid #e7ebf0"}}>{when(r.accepted_at)}</td><td style={{padding:10,borderBottom:"1px solid #e7ebf0"}}>{r.error_message??"—"}</td></tr>)}</tbody>
     </table>
     {!rows.length&&<p style={{color:"#607184"}}>Nenhum destinatário registrado nesta campanha.</p>}
    </div>
   </>}
  </>}
 </section>;
}
