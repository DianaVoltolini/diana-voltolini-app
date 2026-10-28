"use client";
import {useState} from "react";
const destinations=[
 {label:"Blog Fiscal",url:"https://dianavoltolini.com.br/blog"},
 {label:"Produtos e serviços",url:"https://dianavoltolini.com.br/produtos"},
 {label:"Diagnóstico Expresso IBS/CBS",url:"https://dianavoltolini.com.br/diagnostico-ibs-cbs"},
 {label:"Fiscal na Prática",url:"https://dianavoltolini.com.br/fiscal-na-pratica"},
 {label:"Site principal",url:"https://dianavoltolini.com.br"}
];
export default function EmailLinkMenu({bodyId}:{bodyId:string}){
 const [url,setUrl]=useState(destinations[0].url);
 const [label,setLabel]=useState("Conhecer o Blog Fiscal");
 const add=()=>{
  const el=document.getElementById(bodyId) as HTMLTextAreaElement|null;
  if(!el)return;
  const start=el.selectionStart,end=el.selectionEnd;
  const line="[BOTAO: "+label.trim()+" | "+url+"]";
  el.setRangeText(line,start,end,"end");
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.focus();
 };
 return <section style={{display:"grid",gap:9}}>
 <strong style={{fontSize:13,color:"#102033"}}>Botão de acesso (link do e-mail)</strong>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
  <label style={{display:"grid",gap:5,fontSize:13}}>Destino
   <select value={url} onChange={e=>{setUrl(e.target.value);const item=destinations.find(d=>d.url===e.target.value);if(item)setLabel("Acessar "+item.label)}} style={{border:"1px solid #d7e0e9",borderRadius:7,padding:11,background:"#fff"}}>
   {destinations.map(item=><option key={item.url} value={item.url}>{item.label}</option>)}
   </select>
  </label>
  <label style={{display:"grid",gap:5,fontSize:13}}>Texto do botão
   <input value={label} maxLength={80} onChange={e=>setLabel(e.target.value)} style={{border:"1px solid #d7e0e9",borderRadius:7,padding:11}}/>
  </label>
 </div>
 <div><button type="button" disabled={!label.trim()} onClick={add} style={{background:"#f6ebcf",border:"1px solid #d7b453",borderRadius:7,padding:"10px 13px",color:"#75540b",fontWeight:700,cursor:"pointer"}}>Inserir botão no texto</button></div>
 <small style={{color:"#647587"}}>Posicione o cursor na mensagem onde o botão deve aparecer. A seleção insere o destino como botão na pré-visualização.</small>
 </section>;
}
