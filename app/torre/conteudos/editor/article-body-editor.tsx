"use client";
import {useState} from "react";
import FiscalRichText from "@/components/fiscal-rich-text";
type Props={initial:string};
const field={display:"block",width:"100%",padding:12,border:"1px solid #cbd5e1",borderRadius:7,marginTop:7,background:"#fff",color:"#0d1b2a"};
export default function ArticleBodyEditor({initial}:Props){
 const [body,setBody]=useState(initial);
 const [preview,setPreview]=useState(false);
 function applyFormat(prefix:string,suffix=""){
  const el=document.getElementById("fiscal-editor-body") as HTMLTextAreaElement|null;
  if(!el)return;
  const start=el.selectionStart,end=el.selectionEnd,selected=body.slice(start,end);
  const replacement=prefix+(selected||"Texto")+suffix;
  setBody(body.slice(0,start)+replacement+body.slice(end));
  setPreview(false);
 }
 return <div style={{display:"grid",gap:13}}>
   <label htmlFor="fiscal-editor-body" style={{fontWeight:700}}>Conteúdo</label>
   <p style={{fontSize:13,color:"#607184",margin:0}}>Cole o texto completo. Títulos com #, listas e tabelas são formatados automaticamente. O texto fiscal não é reescrito.</p>
   <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
    <button type="button" onClick={()=>applyFormat("## ")} title="Título de seção" style={field}>Título</button>
    <button type="button" onClick={()=>applyFormat("### ")} style={field}>Subtítulo</button>
    <button type="button" onClick={()=>applyFormat("**","**")} style={field}>Negrito</button>
    <button type="button" onClick={()=>applyFormat("- ")} style={field}>Lista</button>
    <button type="button" onClick={()=>applyFormat("ATENÇÃO: ")} style={field}>Destaque</button>
   </div>
   <textarea id="fiscal-editor-body" name="body" rows={17} required value={body} onChange={e=>{setBody(e.target.value);setPreview(false)}} style={{...field,marginTop:0,lineHeight:1.65}} placeholder="Cole aqui o texto do artigo..." />
   <button type="button" onClick={()=>setPreview(v=>!v)} style={{justifySelf:"start",padding:"11px 16px",background:"#f5edda",border:"1px solid #d8bc70",borderRadius:7,cursor:"pointer",fontWeight:800,color:"#76570a"}}>{preview?"Ocultar prévia":"Formatar e visualizar"}</button>
   {preview&&<section aria-label="Pré-visualização do artigo" style={{background:"#fff",padding:"24px",border:"1px solid #e2e8ee",borderRadius:10}}><strong style={{display:"block",fontSize:12,color:"#96710d",letterSpacing:1,marginBottom:22}}>PRÉ-VISUALIZAÇÃO · COMO O LEITOR VERÁ</strong><FiscalRichText body={body}/></section>}
 </div>
}
