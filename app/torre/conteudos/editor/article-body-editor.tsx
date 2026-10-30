"use client";
// app/torre/conteudos/editor/article-body-editor.tsx
import {useState} from "react";
import dynamic from "next/dynamic";
import FiscalRichText from "@/components/fiscal-rich-text";
import layout from "./editor-layout.module.css";
const VisualEditor=dynamic(()=>import("./visual-editor"),{ssr:false});
type Props={initial:string;sources:string};
const legacyBlocks=(value:string)=>/^:::(atencao|exemplo|checklist|conclusao)\s*$/m.test(value);
export default function ArticleBodyEditor({initial,sources}:Props){
 const [body,setBody]=useState(initial);
 const [mode,setMode]=useState<"visual"|"markdown">(initial.trim()?"markdown":"visual");
 const [preview,setPreview]=useState(true);
 const [revision,setRevision]=useState(0);
 const block=legacyBlocks(body);
 const clear=()=>{
  if(!body.trim())return;
  if(!window.confirm("Limpar todo o texto deste conteúdo? Esta alteração só será gravada ao clicar em Salvar conteúdo."))return;
  setBody("");setRevision(v=>v+1);setMode("markdown");
 };
 const apply=()=>{if(block){setPreview(true);return}setRevision(v=>v+1);setMode("visual");setPreview(true)};
 return <section style={{display:"grid",gap:16}}>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
   <div><strong style={{display:"block",color:"#102033",fontSize:17}}>Conteúdo</strong><p style={{margin:"5px 0",fontSize:13,color:"#607184"}}>Cole o Markdown completo e clique em Aplicar formatação, ou use o editor visual.</p></div>
   <div className={layout.toolbar}>
    <button type="button" className={layout.toolButton} aria-pressed={mode==="visual"} disabled={block} onClick={()=>{setRevision(v=>v+1);setMode("visual")}}>Editor visual</button>
    <button type="button" className={layout.toolButton} aria-pressed={mode==="markdown"} onClick={()=>setMode("markdown")}>Importar / Markdown</button>
    <button type="button" onClick={clear} disabled={!body.trim()} style={{padding:"9px 13px",border:"1px solid #e4bdba",borderRadius:7,color:"#a42323",background:"#fff7f7",cursor:"pointer",fontWeight:700}}>Limpar conteúdo</button>
   </div>
  </div>
  {block&&<p role="status" style={{padding:12,background:"#faf7ed",borderLeft:"3px solid #c9a227",color:"#6d531a",fontSize:13}}>O conteúdo utiliza blocos especiais antigos. Para preservar o texto, mantenha a edição em Markdown. A prévia permanece disponível.</p>}
  <input type="hidden" name="body" value={body}/>
  {mode==="visual"&&!block?<VisualEditor key={revision} value={body} onChange={setBody}/>:<>
   <textarea value={body} onChange={e=>setBody(e.target.value)} rows={21} aria-label="Texto Markdown do conteúdo" style={{width:"100%",boxSizing:"border-box",padding:18,border:"1px solid #cbd5e1",borderRadius:9,font:"14px/1.75 ui-monospace,monospace",minHeight:450,background:"#fff",color:"#102033"}} placeholder={"## Título da seção\n\nEscreva um parágrafo.\n\n| Informação | Valor |\n| --- | --- |\n| Base de cálculo | R$ 18.750,00 |"}/>
   <div><button type="button" onClick={apply} className={layout.toolButton}>{block?"Atualizar prévia":"Aplicar formatação e editar visualmente"}</button></div>
  </>}
  <label style={{display:"grid",gap:7,fontSize:14,color:"#102033"}}>Fontes oficiais / URLs<textarea style={{width:"100%",boxSizing:"border-box",padding:12,border:"1px solid #cbd5e1",borderRadius:7,background:"#fff",color:"#0d1b2a"}} name="source_links" rows={4} defaultValue={sources} placeholder="Uma URL por linha"/></label>
  <div style={{display:"flex",alignItems:"center",gap:12}}>
   <button type="button" onClick={()=>setPreview(p=>!p)} className={layout.toolButton}>{preview?"Ocultar prévia":"Mostrar prévia"}</button>
   <span style={{fontSize:12,color:"#607184"}}>Confira a formatação antes de salvar.</span>
  </div>
  {preview&&<section aria-label="Pré-visualização do conteúdo" style={{background:"#fff",padding:"clamp(15px,3vw,28px)",border:"1px solid #e2e8ee",borderRadius:10}}><strong style={{display:"block",fontSize:12,color:"#96710d",letterSpacing:1,marginBottom:20}}>PRÉ-VISUALIZAÇÃO · COMO O LEITOR VERÁ</strong><FiscalRichText body={body}/></section>}
 </section>;
}