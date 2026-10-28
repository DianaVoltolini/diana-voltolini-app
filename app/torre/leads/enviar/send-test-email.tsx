"use client";
import {useActionState,useState,useRef} from "react";
import {sendTestEmail,type TestEmailResult} from "./test-email-action";
const initial:TestEmailResult={ok:false,message:""};
export default function SendTestEmail({subjectId,bodyId}:{subjectId:string;bodyId:string}){
 const [state,action,pending]=useActionState(sendTestEmail,initial);
 const [to,setTo]=useState("");
 const [confirmed,setConfirmed]=useState(false);
 const subjectRef=useRef<HTMLInputElement>(null);
 const bodyRef=useRef<HTMLInputElement>(null);
 const [localError,setLocalError]=useState("");
 return <section style={{border:"1px solid #dce4eb",borderRadius:10,padding:20,display:"grid",gap:12,marginTop:18}}>
  <h3 style={{margin:0,color:"#102033",fontSize:19}}>Enviar teste individual</h3>
  <p style={{margin:0,color:"#607184",fontSize:13}}>Somente o endereço informado receberá o teste. Nenhum lead será incluído.</p>
  <form action={action} onSubmit={event=>{const subj=(document.getElementById(subjectId) as HTMLInputElement|null)?.value.trim()||"";const message=(document.getElementById(bodyId) as HTMLTextAreaElement|null)?.value.trim()||"";if(!subj||!message){event.preventDefault();setLocalError("Preencha o assunto e a mensagem antes de enviar o teste.");return;}if(subjectRef.current)subjectRef.current.value=subj;if(bodyRef.current)bodyRef.current.value=message;setLocalError("");}} style={{display:"grid",gap:12}}>
   <label style={{display:"grid",gap:6,fontSize:13,fontWeight:700}}>E-mail para teste
    <input type="email" required value={to} onChange={e=>setTo(e.target.value)} style={{border:"1px solid #d7e0e9",borderRadius:7,padding:12}} placeholder="seuemail@exemplo.com"/>
   </label>
   <input name="to" type="hidden" value={to}/>
   <input name="subject" ref={subjectRef} type="hidden" defaultValue=""/>
   <input name="body" ref={bodyRef} type="hidden" defaultValue=""/>
   <input name="confirmed" type="hidden" value={confirmed?"yes":"no"}/>
   <label style={{display:"flex",gap:9,alignItems:"flex-start",fontSize:13,color:"#405266"}}>
    <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} style={{marginTop:3}}/>
    Confirmo o envio de apenas uma mensagem para o endereço informado.
   </label>
   <button type="submit" onClick={()=>{const subj=(document.getElementById(subjectId) as HTMLInputElement|null)?.value||"";const msg=(document.getElementById(bodyId) as HTMLTextAreaElement|null)?.value||"";if(subjectRef.current)subjectRef.current.value=subj;if(bodyRef.current)bodyRef.current.value=msg;}} disabled={pending||!confirmed} style={{justifySelf:"start",background:"#c9a227",border:0,borderRadius:7,padding:"12px 17px",color:"#102033",fontWeight:800,cursor:"pointer",opacity:pending||!confirmed?.6:1}}>{pending?"Enviando teste…":"Enviar teste"}</button>
  </form>
  {localError&&<p role="alert" style={{color:"#b42318",fontSize:13}}>{localError}</p>}
  {pending&&<p role="status" style={{color:"#647587",fontSize:13}}>Solicitando envio ao servidor SMTP…</p>}
  {state.message&&<p role="status" style={{margin:0,color:state.ok?"#167143":"#b42318",fontSize:13}}>{state.message}</p>}
 </section>;
}
