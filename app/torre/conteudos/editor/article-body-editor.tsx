"use client";
import {useState} from "react";
import FiscalRichText from "@/components/fiscal-rich-text";
import layout from "./editor-layout.module.css";
type Props={initial:string};
const field={display:"block",width:"100%",padding:12,border:"1px solid #cbd5e1",borderRadius:7,marginTop:7,background:"#fff",color:"#0d1b2a"};

function autoFormatFiscal(source:string){
 const lines=source.replace(/\r\n?/g,"\n").split("\n");
 if(lines.some(line=>/^:::(?:atencao|exemplo|checklist|conclusao)\s*$/.test(line.trim())))return source;
 const section=(line:string)=>{
  const value=line.trim().replace(/^#{1,3}\s+/,"").replace(/:$/,"").trim();
  if(/^(?:Exemplo prático|Como funciona na prática\??)$/i.test(value))return "exemplo";
  if(/^(?:O que a empresa deve fazer\??|Checklist(?: de conferência)?|Roteiro de conferência)$/i.test(value))return "checklist";
  if(/^(?:Conclusão|Considerações finais)$/i.test(value))return "conclusao";
  if(/^(?:Ponto de atenção|Atenção|Importante)$/i.test(value))return "atencao";
  return null;
 };
 const heading=(line:string)=>/^#{1,3}\s+/.test(line.trim())||/^(?:O que|Qual|Quais|Como|Quando|Por que|E quanto|Conclusão|Considerações finais|Checklist|Exemplo prático|Atenção|Importante|Ponto de atenção)\b.{0,110}[?:]?$/i.test(line.trim())&&line.trim().length<120;
 const output:string[]=[];
 for(let i=0;i<lines.length;){
  const kind=section(lines[i]);
  if(!kind){output.push(lines[i]);i++;continue}
  let end=i+1;
  while(end<lines.length&&!heading(lines[end]))end++;
  const contents=lines.slice(i+1,end);
  if(!contents.some(x=>x.trim())){output.push(lines[i]);i++;continue}
  output.push(":::"+kind,lines[i],...contents,":::");
  i=end;
 }
 return output.join("\n");
}
export default function ArticleBodyEditor({initial}:Props){
 const [body,setBody]=useState(initial);
 const [preview,setPreview]=useState(false);
 const [proposal,setProposal]=useState<string|null>(null);
 const [formatting,setFormatting]=useState(false);
 const [formatError,setFormatError]=useState("");
 async function formatWithAI(){
  if(formatting)return;
  setFormatting(true);setFormatError("");setProposal(null);
  try{
   const res=await fetch("/api/torre/conteudos/formatar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body})});
   const data=await res.json() as {formatted?:string;error?:string};
   if(!res.ok||!data.formatted)throw new Error(data.error||"Falha ao preparar a formatação.");
   setProposal(data.formatted);setPreview(false);
  }catch(error){setFormatError(error instanceof Error?error.message:"Não foi possível preparar a formatação.");}
  finally{setFormatting(false)}
 }

 function applyFormat(prefix:string,suffix=""){
  const el=document.getElementById("fiscal-editor-body") as HTMLTextAreaElement|null;
  if(!el)return;
  const start=el.selectionStart,end=el.selectionEnd,selected=body.slice(start,end);
  const replacement=prefix+(selected||"Texto")+suffix;
  setBody(body.slice(0,start)+replacement+body.slice(end));
  setPreview(false);
 }
 function insertEditorialBlock(kind:"atencao"|"exemplo"|"checklist"|"conclusao"){
  const el=document.getElementById("fiscal-editor-body") as HTMLTextAreaElement|null;
  if(!el)return;
  const {selectionStart:start,selectionEnd:end}=el;
  const selected=body.slice(start,end).trim();
  const inner=selected||"Escreva aqui o conteúdo deste destaque.";
  const value=`\n\n:::${kind}\n${inner}\n:::\n\n`;
  setBody(body.slice(0,start)+value+body.slice(end));
  setPreview(false);
 }
 return <div style={{display:"grid",gap:13}}>
   <label htmlFor="fiscal-editor-body" style={{fontWeight:700}}>Conteúdo</label>
   <p style={{fontSize:13,color:"#607184",margin:0}}>Cole o texto completo. Ao clicar em Formatar e visualizar, o editor organiza títulos, listas, tabelas e blocos editoriais identificáveis sem reescrever as informações fiscais.</p>
   <div className={layout.toolbar} role="toolbar" aria-label="Formatação do conteúdo">
    <button type="button" onClick={()=>applyFormat("## ")} title="Título de seção" className={layout.toolButton}>Título</button>
    <button type="button" onClick={()=>applyFormat("### ")} className={layout.toolButton}>Subtítulo</button>
    <button type="button" onClick={()=>applyFormat("**","**")} className={layout.toolButton}>Negrito</button>
    <button type="button" onClick={()=>applyFormat("- ")} className={layout.toolButton}>Lista</button>
    <button type="button" onClick={()=>applyFormat("ATENÇÃO: ")} className={layout.toolButton}>Destaque</button>
   </div>
   <div className={layout.toolbar} role="toolbar" aria-label="Blocos editoriais">
    <button type="button" onClick={()=>insertEditorialBlock("atencao")} className={layout.toolButton}>Ponto de atenção</button>
    <button type="button" onClick={()=>insertEditorialBlock("exemplo")} className={layout.toolButton}>Exemplo prático</button>
    <button type="button" onClick={()=>insertEditorialBlock("checklist")} className={layout.toolButton}>Checklist</button>
    <button type="button" onClick={()=>insertEditorialBlock("conclusao")} className={layout.toolButton}>Conclusão</button>
   </div>
   <p style={{fontSize:12,color:"#607184",margin:0}}>A IA prepara uma prévia para revisão, sem alterar o texto original. Os botões manuais permanecem disponíveis.</p>
   <textarea id="fiscal-editor-body" name="body" rows={17} required value={body} onChange={e=>{setBody(e.target.value);setPreview(false);setProposal(null);setFormatError("")}} style={{...field,marginTop:0,lineHeight:1.65}} placeholder="Cole aqui o texto do conteúdo..." />
   <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
    <button type="button" onClick={formatWithAI} disabled={formatting} style={{padding:"11px 16px",background:"#c9a227",border:0,borderRadius:7,cursor:"pointer",fontWeight:800,color:"#102033"}}>{formatting?"Preparando formatação…":"Formatar e visualizar com IA"}</button>
    <button type="button" onClick={()=>setPreview(v=>!v)} style={{padding:"11px 16px",background:"#f5edda",border:"1px solid #d8bc70",borderRadius:7,cursor:"pointer",fontWeight:800,color:"#76570a"}}>{preview?"Ocultar prévia original":"Visualizar texto atual"}</button>
   </div>
   {formatError&&<p role="alert" style={{color:"#b42318"}}>{formatError}</p>}
   {proposal!==null&&<section style={{display:"grid",gap:15,border:"1px solid #e2e8ee",borderRadius:10,padding:20,background:"#fff"}}>
    <strong style={{fontSize:13,color:"#896813"}}>PRÉVIA GERADA — CONFIRA AS INFORMAÇÕES FISCAIS ANTES DE APLICAR</strong>
    <p style={{fontSize:12,color:"#607184"}}>O texto original continua no editor. Verifique códigos, valores, datas, tabelas e referências. Apenas Aplicar formatação substitui o texto do editor; Salvar conteúdo continua sendo necessário.</p>
    <div style={{maxHeight:560,overflow:"auto",border:"1px solid #e2e8ee",padding:18,borderRadius:8}}><FiscalRichText body={proposal}/></div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
     <button type="button" onClick={()=>{setBody(proposal);setProposal(null);setPreview(true)}} style={{background:"#c9a227",border:0,borderRadius:7,padding:"11px 16px",fontWeight:800,cursor:"pointer"}}>Aplicar formatação ao editor</button>
     <button type="button" onClick={()=>setProposal(null)} style={{background:"#fff",border:"1px solid #cad5e0",borderRadius:7,padding:"11px 16px",cursor:"pointer"}}>Descartar prévia</button>
    </div>
   </section>}
   {preview&&<section aria-label="Pré-visualização do conteúdo" style={{background:"#fff",padding:"24px",border:"1px solid #e2e8ee",borderRadius:10}}><strong style={{display:"block",fontSize:12,color:"#96710d",letterSpacing:1,marginBottom:22}}>PRÉ-VISUALIZAÇÃO · COMO O LEITOR VERÁ</strong><FiscalRichText body={body}/></section>}
 </div>
}
