"use client";
import {useActionState,useState} from "react";
import {sendTestEmail,type TestEmailResult} from "./test-email-action";
const initial:TestEmailResult={ok:false,message:""};
export default function SendTestEmail({subjectId,bodyId}:{subjectId:string;bodyId:string}){
 const [state,action,pending]=useActionState(sendTestEmail,initial);
 const [to,setTo]=useState("");
 const [confirmed,setConfirmed]=useState(false);
 return <section style={{border:"1px solid #dce4eb",borderRadius:10,padding:20,display:"grid",gap:12,marginTop:18}}>
  <h3 style={{margin:0,color:"#102033",fontSize:19}}>Enviar teste individual</h3>
  <p style={{margin:0,color:"#607184",fontSize:13}}>Somente o endereço informado receberá o teste. Nenhum lead será incluído.</p>
  <form action={action} onSubmit={event=>{const form=event.currentTarget;(form.elements.namedItem("subject") as HTMLInputElement).value=(document.getElementById(subjectId) as HTMLInputElement|null)?.value||"";(form.elements.namedItem("body") as HTMLInputElement).value=(document.getElementById(bodyId) as HTMLTextAreaElement|null)?.value||"";}} style={{display:"grid",gap:12}}>
   <label style={{display:"grid",gap:6,fontSize:13,fontWeight:700}}>E-mail para teste
    <input type="email" required value={to} onChange={e=>setTo(e.target.value)} style={{border:"1px solid #d7e0e9",borderRadius:7,padding:12}} placeholder="seuemail@exemplo.com"/>
   </label>
   <input name="to" type="hidden" value={to}/>
   <input name="subject" type="hidden" defaultValue=""/>
   <input name="body" type="hidden" defaultValue=""/>
   <input name="confirmed" type="hidden" value={confirmed?"yes":"no"}/>
   <label style={{display:"flex",gap:9,alignItems:"flex-start",fontSize:13,color:"#405266"}}>
    <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} style={{marginTop:3}}/>
    Confirmo o envio de apenas uma mensagem para o endereço informado.
   </label>
   <button type="submit" disabled={pending||!confirmed} style={{justifySelf:"start",background:"#c9a227",border:0,borderRadius:7,padding:"12px 17px",color:"#102033",fontWeight:800,cursor:"pointer",opacity:pending||!confirmed?.6:1}}>{pending?"Enviando teste…":"Enviar teste"}</button>
  </form>
  {state.message&&<p role="status" style={{margin:0,color:state.ok?"#167143":"#b42318",fontSize:13}}>{state.message}</p>}
 </section>;
}
