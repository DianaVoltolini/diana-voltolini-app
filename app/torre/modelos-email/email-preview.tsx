"use client";
import {useState} from "react";
type Props={subjectId:string;bodyId:string};
export default function EmailPreview({subjectId,bodyId}:Props){
 const [open,setOpen]=useState(false);
 const [subject,setSubject]=useState("");
 const [body,setBody]=useState("");
 const show=()=>{
  const subj=document.getElementById(subjectId) as HTMLInputElement|null;
  const message=document.getElementById(bodyId) as HTMLTextAreaElement|null;
  setSubject((subj?.value||"").replaceAll("{{nome}}","Diana"));
  setBody((message?.value||"").replaceAll("{{nome}}","Diana"));
  setOpen(true);
 };
 return <section style={{display:"grid",gap:13,marginTop:12}}>
  <div><button type="button" onClick={open?()=>setOpen(false):show} style={{padding:"11px 16px",background:"#fff",border:"1px solid #c9a227",borderRadius:7,color:"#86630c",fontWeight:800,cursor:"pointer"}}>{open?"Ocultar prévia":"Visualizar e-mail"}</button></div>
  {open&&<div style={{background:"#f3f6f9",border:"1px solid #dce4eb",borderRadius:12,padding:"clamp(12px,3vw,26px)"}}>
   <p style={{fontSize:11,letterSpacing:1,color:"#96720d",fontWeight:800,margin:"0 0 15px"}}>PRÉ-VISUALIZAÇÃO · COMO O DESTINATÁRIO VERÁ</p>
   <div style={{maxWidth:650,margin:"auto",background:"#fff",border:"1px solid #e2e8ef",borderRadius:10,overflow:"hidden"}}>
    <header style={{padding:"19px 25px",borderTop:"4px solid #c9a227",borderBottom:"1px solid #e5eaf0",textAlign:"center"}}>
     <img src="/brand/logo-light.png" alt="Diana Voltolini" style={{width:185,height:"auto",maxWidth:"100%"}}/>
    </header>
    <div style={{padding:"clamp(20px,4vw,35px)"}}>
     <h2 style={{font:"bold 25px/1.3 Georgia,serif",color:"#102033",margin:"0 0 23px",overflowWrap:"anywhere"}}>{subject||"Assunto do e-mail"}</h2>
     <div style={{font:"15px/1.85 Arial,sans-serif",color:"#405266",whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{body||"Escreva a mensagem para visualizar."}</div>
    </div>
    <footer style={{borderTop:"1px solid #e5eaf0",padding:"19px 25px",background:"#f7f9fb",textAlign:"center"}}>
     <strong style={{fontSize:13,color:"#102033"}}>Diana Voltolini</strong>
     <p style={{fontSize:11,color:"#647587",lineHeight:1.6,margin:"7px 0"}}>Faturamento e Inteligência Fiscal</p>
     <p style={{fontSize:11,color:"#647587",lineHeight:1.6,margin:0}}>As mensagens de marketing terão um link de descadastro quando o envio estiver habilitado.</p>
    </footer>
   </div>
   <p style={{fontSize:12,color:"#697b8c",textAlign:"center",margin:"15px 0 0"}}>Prévia local sem envio. A substituição de nome é ilustrativa.</p>
  </div>}
 </section>;
}
