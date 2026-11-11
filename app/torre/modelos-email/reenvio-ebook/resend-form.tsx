"use client";
// app/torre/modelos-email/reenvio-ebook/resend-form.tsx
import {useActionState,useState} from "react";
import {resendRealEbookEmail,initial} from "./actions";

export type OrderOption={
 id:string;
 customer_name:string;
 customer_email:string;
 amount_cents:number;
 status:string;
 created_at:string;
};

const inputStyle={width:"100%",padding:12,border:"1px solid #cbd5e1",borderRadius:7,background:"#fff"};
const currency=(cents:number)=>(cents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const date=(value:string)=>new Date(value).toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",year:"numeric"});

export default function EbookResendForm({orders,search}:{orders:OrderOption[],search:string}){
 const [state,action,pending]=useActionState(resendRealEbookEmail,initial);
 const [selected,setSelected]=useState<OrderOption|null>(null);
 const [recipient,setRecipient]=useState("");
 const [event,setEvent]=useState("ebook_charge_generated");
 const [identity,setIdentity]=useState(false);
 const [send,setSend]=useState(false);
 const [key,setKey]=useState("");
 const reset=()=>{setIdentity(false);setSend(false);setKey(crypto.randomUUID());};
 function selectOrder(order:OrderOption){
  setSelected(order);
  setRecipient(order.customer_email);
  setEvent(order.status==="paid"?"ebook_payment_confirmed":"ebook_charge_generated");
  reset();
 }
 return <div style={{display:"grid",gap:20,maxWidth:900}}>
  <section>
   <h2 style={{fontSize:18,margin:"0 0 10px"}}>{search?"Pedidos encontrados":"Últimos pedidos do e-book"}</h2>
   {orders.length===0?<p role="status" style={{padding:16,background:"#f8fafc",borderRadius:8}}>Nenhum pedido encontrado. Tente outro nome ou e-mail.</p>:
    <div style={{display:"grid",gap:8}}>
     {orders.map(order=><button type="button" key={order.id} onClick={()=>selectOrder(order)}
      style={{textAlign:"left",cursor:"pointer",display:"grid",gap:6,border:selected?.id===order.id?"2px solid #c9a227":"1px solid #dce4ec",padding:15,background:"#fff",borderRadius:9}}>
      <strong style={{fontSize:14,color:"#102033"}}>{order.customer_name||"Cliente sem nome"}</strong>
      <span style={{fontSize:13,color:"#405266"}}>{order.customer_email}</span>
      <span style={{fontSize:12,color:"#607184"}}>{date(order.created_at)} · E-book IBS/CBS · {currency(Number(order.amount_cents))} · {order.status==="paid"?"Pago":order.status==="pending"?"Aguardando pagamento":order.status}</span>
      <span style={{fontSize:12,color:"#846611",fontWeight:700}}>{selected?.id===order.id?"Pedido selecionado":"Selecionar pedido para reenvio"}</span>
     </button>)}
    </div>}
  </section>
  {!selected?<p style={{fontSize:13,color:"#607184"}}>Selecione um pedido acima. Os dados do comprador serão preenchidos automaticamente, sem consultar códigos no Supabase.</p>:
   <form key={selected.id} action={action} style={{display:"grid",gap:18,maxWidth:720}}>
    <h2 style={{fontSize:18,margin:0}}>Reenvio de e-mail — {selected.customer_name}</h2>
    <div style={{background:"#fff9eb",border:"1px solid #edd9ad",padding:16,borderRadius:8,fontSize:13}}>
     <strong>Confirme a identidade do comprador</strong>
     <p style={{margin:"8px 0 0"}}>O e-mail pode ser enviado a outro endereço após conferência. O reenvio não altera o cadastro ou o e-mail original do pedido. Em pedidos pagos, a correção definitiva do acesso exige verificação separada.</p>
    </div>
    <input name="order_id" type="hidden" value={selected.id}/>
    <label style={{fontWeight:700,fontSize:13}}>E-mail de destino
     <input name="recipient_email" type="email" required value={recipient} onChange={e=>{setRecipient(e.target.value);reset()}} placeholder="email@exemplo.com" style={inputStyle}/>
    </label>
    <label style={{fontWeight:700,fontSize:13}}>Mensagem
     <select name="event" value={event} onChange={e=>{setEvent(e.target.value);reset()}} style={inputStyle}>
      {selected.status==="pending"&&<option value="ebook_charge_generated">Reenviar cobrança gerada</option>}
      {selected.status==="paid"&&<option value="ebook_payment_confirmed">Reenviar pagamento confirmado</option>}
      {!["pending","paid"].includes(selected.status)&&<option value="ebook_charge_generated">Sem reenvio disponível para este status</option>}
     </select>
    </label>
    {!["pending","paid"].includes(selected.status)?<p role="status">Este pedido não está pendente nem pago. Não é permitido reenviar mensagem financeira.</p>:
    <>
     <button type="submit" name="mode" value="preview" disabled={pending} style={{justifySelf:"start",padding:"12px 18px",border:0,borderRadius:7,background:"#c9a227",color:"#102033",fontWeight:700}}>Conferir mensagem antes do envio</button>
     {state.message&&state.orderId===selected.id&&<div role="status" style={{border:"1px solid #dae4ee",background:"#f8fafc",padding:16,borderRadius:8}}>
      <strong>{state.status==="sent"?"Enviado":state.status==="preview"?"Prévia":"Atenção"}</strong>
      <p>{state.message}</p>
      <p style={{fontSize:13}}>E-mail original: {state.originalEmail}<br/>Destinatário: {state.recipient}</p>
     </div>}
     {state.status==="preview"&&state.orderId===selected.id&&state.recipient===recipient.trim().toLowerCase()&&state.event===event&&<>
      <section style={{padding:18,border:"1px solid #dce4ec",borderRadius:9,background:"#fff"}}>
       <h3 style={{marginTop:0}}>{state.subject}</h3>
       <p style={{whiteSpace:"pre-wrap",fontSize:14,lineHeight:1.8}}>{state.body}</p>
       <p style={{fontSize:12,color:"#647381"}}>A mensagem real incluirá logotipo, rodapé e link correspondente ao pedido.</p>
      </section>
      <label style={{display:"flex",gap:10,alignItems:"start",fontSize:13}}><input type="checkbox" checked={identity} onChange={e=>setIdentity(e.target.checked)} name="confirm_identity" value="yes" required/> Confirmei a identidade do comprador e o endereço de destino.</label>
      <label style={{display:"flex",gap:10,alignItems:"start",fontSize:13}}><input type="checkbox" checked={send} onChange={e=>setSend(e.target.checked)} name="confirm_send" value="yes" required/> Autorizo o reenvio de um e-mail real com links da compra.</label>
      <input type="hidden" name="request_key" value={key}/>
      <button type="submit" name="mode" value="send" disabled={pending||!identity||!send} style={{padding:"13px 18px",background:"#102033",color:"#fff",border:0,borderRadius:7,fontWeight:700,justifySelf:"start"}}>Reenviar e-mail real</button>
     </>}
    </>}
   </form>}
  <p style={{fontSize:12,color:"#647381"}}>Os reenvios ficam registrados no histórico de auditoria. Se o destinatário estiver incorreto, confirme a identidade antes de enviar. Nenhuma nova cobrança será criada.</p>
 </div>;
}
