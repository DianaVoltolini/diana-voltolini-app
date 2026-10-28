"use client";
import {useState} from "react";
import {deleteEmailDraft} from "../../modelos-email/actions";
export default function DeleteDraftButton({id}:{id:string}){
 const [confirming,setConfirming]=useState(false);
 return <form action={deleteEmailDraft} style={{display:"inline-flex",alignItems:"center",gap:8}}>
  <input type="hidden" name="id" value={id}/>
  {confirming?<><span style={{fontSize:12,color:"#9a251e"}}>Excluir este rascunho?</span>
   <button type="submit" title="Confirmar exclusão" aria-label="Confirmar exclusão" style={{padding:8,border:"1px solid #dc9b93",borderRadius:7,color:"#a52820",background:"#fff1ef",cursor:"pointer"}}>✓</button>
   <button type="button" onClick={()=>setConfirming(false)} title="Cancelar exclusão" aria-label="Cancelar exclusão" style={{padding:8,border:"1px solid #d7e0e9",borderRadius:7,background:"white",cursor:"pointer"}}>×</button></>:
   <button type="button" onClick={()=>setConfirming(true)} title="Excluir rascunho" aria-label="Excluir rascunho" style={{padding:8,border:"1px solid #f0c4c0",borderRadius:7,color:"#ad3029",background:"#fff7f6",cursor:"pointer"}}>
   <svg aria-hidden="true" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M4 7h16M10 4h4m-8 3 1 14h10l1-14M10 11v7m4-7v7"/></svg>
   </button>}
 </form>;
}
