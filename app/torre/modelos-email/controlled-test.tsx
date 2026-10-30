"use client";
// app/torre/modelos-email/controlled-test.tsx
import {useActionState,useState} from "react";
import {sendNewsletterControlledTest,type NewsletterTestState} from "./test-newsletter-action";
const initial:NewsletterTestState={ok:false,message:""};
export default function ControlledNewsletterTest({templateId}:{templateId:string}){
 const [state,action,pending]=useActionState(sendNewsletterControlledTest,initial);
 const [confirm,setConfirm]=useState(false);
 return <section style={{padding:22,background:"#fff",border:"1px solid #dce4ec",borderRadius:12,marginTop:20,display:"grid",gap:12}}>
  <h2 style={{fontSize:21,margin:0}}>Teste do envio automático</h2>
  <p style={{color:"#607184",margin:0,fontSize:13}}>Envia somente ao endereço informado, com assunto sem [TESTE], botão e link individual de descadastro. O envio será registrado para este modelo; não ativa a campanha.</p>
  <form action={action} style={{display:"grid",gap:12,maxWidth:520}}>
   <input type="hidden" name="template_id" value={templateId}/>
   <label style={{display:"grid",gap:5}}>Seu e-mail para teste<input type="email" required name="email" placeholder="seuemail@dominio.com" style={{border:"1px solid #cbd5e1",padding:12,borderRadius:7}}/></label>
   <label style={{display:"flex",gap:8,alignItems:"start",fontSize:13}}><input name="confirm" type="checkbox" value="yes" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/>Confirmo o envio de uma única mensagem de teste real para o endereço informado.</label>
   <button disabled={!confirm||pending} type="submit" style={{background:"#c9a227",padding:"12px 18px",border:0,borderRadius:7,color:"#102033",fontWeight:750,cursor:"pointer",justifySelf:"start"}}>{pending?"Enviando…":"Enviar teste com descadastro"}</button>
  </form>
  {state.message&&<p role="status" style={{color:state.ok?"#167143":"#b42318",fontSize:13}}>{state.message}</p>}
 </section>;
}
