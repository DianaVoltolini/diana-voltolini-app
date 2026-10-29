"use client";
import {useState} from "react";
import dynamic from "next/dynamic";
import FiscalRichText from "@/components/fiscal-rich-text";
import layout from "./editor-layout.module.css";
const VisualEditor=dynamic(()=>import("./visual-editor"),{ssr:false});
type Props={initial:string};
const legacyBlocks=(value:string)=>/^:::(atencao|exemplo|checklist|conclusao)\s*$/m.test(value);
export default function ArticleBodyEditor({initial}:Props){
 const [body,setBody]=useState(initial);
 const [mode,setMode]=useState<"visual"|"markdown">(initial.trim()?"markdown":"visual");
 const [preview,setPreview]=useState(true);
 const block=legacyBlocks(body);
 return <section style={{display:"grid",gap:14}}>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
   <div><strong style={{display:"block",color:"#102033",fontSize:17}}>Conteúdo</strong><p style={{margin:"5px 0",fontSize:13,color:"#607184"}}>Importe Markdown estruturado ou edite visualmente os títulos, parágrafos, listas e tabelas.</p></div>
   <div className={layout.toolbar}>
    <button type="button" className={layout.toolButton} aria-pressed={mode==="visual"} disabled={block} onClick={()=>setMode("visual")}>Editor visual</button>
    <button type="button" className={layout.toolButton} aria-pressed={mode==="markdown"} onClick={()=>setMode("markdown")}>Importar / Markdown</button>
   </div>
  </div>
  {block&&<p role="status" style={{padding:12,background:"#faf7ed",borderLeft:"3px solid #c9a227",color:"#6d531a",fontSize:13}}>Este conteúdo contém blocos especiais do editor anterior. Para evitar perda de informação, mantenha a edição em Markdown. O texto original será preservado.</p>}
  <input type="hidden" name="body" value={body}/>
  {mode==="visual"&&!block?<VisualEditor value={body} onChange={setBody}/>:<textarea value={body} onChange={e=>setBody(e.target.value)} rows={21} aria-label="Texto Markdown do conteúdo" style={{width:"100%",boxSizing:"border-box",padding:18,border:"1px solid #cbd5e1",borderRadius:9,font:"14px/1.75 ui-monospace,monospace",minHeight:450,background:"#fff",color:"#102033"}} placeholder={"## Título da seção\n\nEscreva um parágrafo.\n\n| Informação | Valor |\n| --- | --- |\n| Base de cálculo | R$ 18.750,00 |"}/>}
  <div style={{display:"flex",alignItems:"center",gap:12}}>
   <button type="button" onClick={()=>setPreview(p=>!p)} className={layout.toolButton}>{preview?"Ocultar prévia":"Mostrar prévia"}</button>
   <span style={{fontSize:12,color:"#607184"}}>O texto não é reescrito automaticamente. Confira a prévia antes de salvar.</span>
  </div>
  {preview&&<section aria-label="Pré-visualização do conteúdo" style={{background:"#fff",padding:"clamp(15px,3vw,28px)",border:"1px solid #e2e8ee",borderRadius:10}}><strong style={{display:"block",fontSize:12,color:"#96710d",letterSpacing:1,marginBottom:20}}>PRÉ-VISUALIZAÇÃO · COMO O LEITOR VERÁ</strong><FiscalRichText body={body}/></section>}
 </section>;
}