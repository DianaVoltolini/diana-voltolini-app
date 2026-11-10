"use client";
import {useActionState,useState} from "react";
import {simulateBuyerEmail,type SimulationState} from "./actions";

const initial:SimulationState={status:"idle",message:""};
const field={width:"100%",padding:12,border:"1px solid #cfdbe6",borderRadius:8,background:"#fff",fontSize:14};
export default function BuyerEmailSimulator(){
 const [email,setEmail]=useState("");
 const [event,setEvent]=useState("charge_generated");
 const [scenario,setScenario]=useState("default");
 const [confirmed,setConfirmed]=useState(false);
 const [state,action,pending]=useActionState(simulateBuyerEmail,initial);
 return <form action={action} style={{display:"grid",gap:18}}>
  <div style={{padding:18,background:"#fff9eb",border:"1px solid #eed9aa",borderRadius:9,color:"#5e4714",fontSize:13}}>
   <strong>Simulação segura</strong>
   <p style={{margin:"7px 0 0"}}>O sistema consulta um cadastro com pedido existente e gera uma mensagem de teste. Nenhuma venda, cobrança, pagamento ou entrega será criada ou alterada. O botão do e-mail não terá link ativo.</p>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:17}}>
   <label style={{fontWeight:700,fontSize:13}}>E-mail do cadastro para teste
    <input required name="customer_email" type="email" value={email} onChange={e=>{setEmail(e.target.value);setConfirmed(false)}} placeholder="Informe o e-mail cadastrado" style={field}/>
   </label>
   <label style={{fontWeight:700,fontSize:13}}>Evento simulado
    <select name="event" value={event} onChange={e=>{setEvent(e.target.value);setConfirmed(false)}} style={field}>
     <option value="charge_generated">Cobrança gerada</option>
     <option value="payment_confirmed">Pagamento confirmado</option>
    </select>
   </label>
   <label style={{fontWeight:700,fontSize:13}}>Modelo a verificar
    <select name="scenario" value={scenario} onChange={e=>{setScenario(e.target.value);setConfirmed(false)}} style={field}>
     <option value="default">Modelo geral (teste de conteúdo)</option>
     <option value="routing">Roteamento por produto (verificação)</option>
    </select>
   </label>
  </div>
  <p style={{fontSize:13,color:"#607184",margin:0}}>No modo “Modelo geral”, o e-mail é demonstrativo, mesmo que o cadastro tenha um produto com comunicação própria. O modo “Roteamento” identifica se o produto usa modelo próprio ou fluxo dedicado.</p>
  <div style={{display:"flex",alignItems:"center",gap:15,flexWrap:"wrap"}}>
   <button name="mode" value="preview" disabled={pending||!email.trim()} type="submit" style={{padding:"12px 19px",borderRadius:7,background:"#c9a227",border:0,color:"#102033",fontWeight:750}}>Pré-visualizar simulação</button>
   <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}><input type="checkbox" name="confirm" value="yes" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Confirmo um único e-mail de teste para esse cadastro</label>
   <button name="mode" value="send" disabled={pending||!confirmed||!email.trim()} type="submit" style={{padding:"12px 19px",borderRadius:7,background:"#102033",border:0,color:"white",fontWeight:700}}>Enviar e-mail simulado</button>
  </div>
  {state.message&&<div role="status" style={{padding:16,border:"1px solid #dce4ec",borderRadius:8,background:state.status==="error"?"#fff5f5":"#f8fafc"}}>
   <strong>{state.status==="sent"?"Simulação enviada":state.status==="preview"?"Resultado da simulação":"Não foi possível concluir"}</strong>
   <p>{state.message}</p>
   {state.recipient&&<p style={{fontSize:13}}>Destino: {state.recipient} · Produto: {state.product} · Modelo: {state.model??"Fluxo de e-mail específico"}</p>}
  </div>}
  {state.subject&&<section style={{padding:22,border:"1px solid #dce4ec",borderRadius:12,background:"#fff"}}>
   <h3 style={{marginTop:0}}>{state.subject}</h3>
   <div style={{whiteSpace:"pre-wrap",fontSize:14,lineHeight:1.8}}>{state.body}</div>
   <p style={{fontSize:12,color:"#647381",marginTop:24}}>Prévia exclusivamente ilustrativa. O e-mail enviado terá logo, assinatura, rodapé e botão demonstrativo sem link.</p>
  </section>}
 </form>;
}
