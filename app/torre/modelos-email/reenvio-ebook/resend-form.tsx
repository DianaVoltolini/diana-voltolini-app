"use client";
// app/torre/modelos-email/reenvio-ebook/resend-form.tsx
import {useActionState,useState} from "react";
import {resendRealEbookEmail,initial} from "./actions";
const inputStyle={width:"100%",padding:12,border:"1px solid #cbd5e1",borderRadius:7,background:"#fff"};
export default function EbookResendForm(){
 const [state,action,pending]=useActionState(resendRealEbookEmail,initial);
 const [orderId,setOrderId]=useState("");
 const [recipient,setRecipient]=useState("");
 const [event,setEvent]=useState("ebook_charge_generated");
 const [identity,setIdentity]=useState(false),[send,setSend]=useState(false);
 const [key,setKey]=useState(()=>crypto.randomUUID());
 const reset=()=>{setIdentity(false);setSend(false);setKey(crypto.randomUUID());};
 return <form action={action} style={{display:"grid",gap:18,maxWidth:720}}>
   <div style={{background:"#fff9eb",border:"1px solid #edd9ad",padding:16,borderRadius:8,fontSize:13}}>
    <strong>Reenvio real — exige conferência manual do comprador</strong>
    <p style={{margin:"8px 0 0"}}>Use o ID de um pedido do e-book e confirme a identidade do comprador fora desta tela (por exemplo, dados do pedido). O endereço de destino pode ser diferente do original, mas esta operação não altera o e-mail do pedido, o cadastro de acesso, os pagamentos ou a liberação do e-book.</p>
   </div>
   <label style={{fontWeight:700,fontSize:13}}>ID do pedido no Supabase (UUID)
    <input name="order_id" required value={orderId} onChange={e=>{setOrderId(e.target.value);reset()}} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style={inputStyle}/>
   </label>
   <label style={{fontWeight:700,fontSize:13}}>E-mail que deve receber o reenvio
    <input name="recipient_email" type="email" required value={recipient} onChange={e=>{setRecipient(e.target.value);reset()}} placeholder="email-verificado@exemplo.com" style={inputStyle}/>
   </label>
   <label style={{fontWeight:700,fontSize:13}}>Qual e-mail deseja reenviar?
    <select name="event" value={event} onChange={e=>{setEvent(e.target.value);reset()}} style={inputStyle}>
     <option value="ebook_charge_generated">Cobrança gerada — pedido pendente</option>
     <option value="ebook_payment_confirmed">Pagamento confirmado — pedido pago</option>
    </select>
   </label>
   <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
    <button type="submit" name="mode" value="preview" disabled={pending} style={{padding:"12px 18px",border:0,borderRadius:7,background:"#c9a227",color:"#102033",fontWeight:700}}>Conferir pedido e prévia</button>
   </div>
   {state.message&&<div role="status" style={{border:"1px solid #dae4ee",background:"#f8fafc",padding:16,borderRadius:8}}>
    <strong>{state.status==="sent"?"Enviado":state.status==="preview"?"Prévia do pedido":"Atenção"}</strong><p>{state.message}</p>
    {state.orderId&&<p style={{fontSize:13}}>Pedido: {state.orderId}<br/>Comprador: {state.customer}<br/>Produto: {state.product}<br/>E-mail original: {state.originalEmail}<br/>Novo destino: {state.recipient}</p>}
   </div>}
   {state.status==="preview"&&state.orderId===orderId&&state.recipient===recipient.trim().toLowerCase()&&state.event===event&&<>
    <section style={{padding:18,border:"1px solid #dce4ec",borderRadius:9,background:"#fff"}}>
     <h3 style={{marginTop:0}}>{state.subject}</h3><p style={{whiteSpace:"pre-wrap",fontSize:14,lineHeight:1.8}}>{state.body}</p>
     <p style={{fontSize:12,color:"#647381"}}>O e-mail real incluirá logotipo, rodapé e botão ativo com destino adequado ao pedido.</p>
    </section>
    <label style={{display:"flex",gap:10,alignItems:"start",fontSize:13}}><input type="checkbox" checked={identity} onChange={e=>setIdentity(e.target.checked)} name="confirm_identity" value="yes" required/> Confirmei a identidade do comprador antes de usar este destinatário.</label>
    <label style={{display:"flex",gap:10,alignItems:"start",fontSize:13}}><input type="checkbox" checked={send} onChange={e=>setSend(e.target.checked)} name="confirm_send" value="yes" required/> Confirmo o envio de um e-mail REAL, com links reais, para o endereço informado.</label>
    <input type="hidden" name="request_key" value={key}/>
    <button type="submit" name="mode" value="send" disabled={pending||!identity||!send} style={{padding:"13px 18px",background:"#102033",color:"#fff",border:0,borderRadius:7,fontWeight:700,justifySelf:"start"}}>Reenviar e-mail real</button>
   </>}
   <p style={{fontSize:12,color:"#647381"}}>Cada tentativa é registrada antes do envio. Se houver falha ou dúvida sobre entrega, consulte a auditoria para evitar envios repetidos. Para corrigir definitivamente o e-mail de acesso após uma compra paga, é necessário verificar também o cadastro do cliente.</p>
  </form>;
}
