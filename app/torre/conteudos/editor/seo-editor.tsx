"use client";
import {useState} from "react";

type Props={title:string;summary:string;slug:string;seoTitle:string;seoDescription:string};
const field={display:"block",width:"100%",padding:"12px",border:"1px solid #cbd5e1",borderRadius:7,marginTop:7,background:"#fff",color:"#0d1b2a"} as const;
export default function SeoEditor({title,summary,slug,seoTitle,seoDescription}:Props){
 const [customTitle,setCustomTitle]=useState(seoTitle);
 const [customDescription,setCustomDescription]=useState(seoDescription);
 return <section style={{border:"1px solid #dbe2ea",borderRadius:10,padding:20,background:"#f8fafc",display:"grid",gap:12}}>
  <div><h2 style={{fontSize:20,margin:"0 0 6px"}}>Otimização para o Google (SEO)</h2><p style={{fontSize:13,color:"#536372",margin:0}}>Campos opcionais. Em branco, será usado o título e o resumo do conteúdo.</p></div>
  <label>Título SEO<input style={field} name="seo_title" maxLength={180} value={customTitle} onChange={e=>setCustomTitle(e.target.value)} placeholder="Título que você deseja destacar na pesquisa"/></label>
  <label>Descrição SEO<textarea style={field} name="seo_description" maxLength={320} rows={3} value={customDescription} onChange={e=>setCustomDescription(e.target.value)} placeholder="Descrição objetiva para resultados de pesquisa"/></label>
  <div aria-live="polite" style={{background:"#fff",border:"1px solid #e3e7ec",borderRadius:9,padding:15}}>
   <small style={{color:"#286b42"}}>dianavoltolini.com.br/blog/{slug||"endereco-do-conteudo"}</small>
   <p style={{color:"#1a0dab",fontSize:18,margin:"7px 0"}}>{customTitle||title||"Título do conteúdo"}</p>
   <p style={{color:"#4b5563",fontSize:13,margin:0}}>{customDescription||summary||"Resumo do conteúdo"}</p>
  </div>
  <p style={{fontSize:12,color:"#607080",margin:0}}>Prévia aproximada. O Google pode exibir títulos e descrições diferentes.</p>
 </section>;
}
