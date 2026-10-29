"use client";
// app/torre/conteudos/editor/seo-editor.tsx
type Props={title:string;summary:string;slug:string;seoTitle:string;seoDescription:string};
export default function SeoEditor({title,summary,slug,seoTitle,seoDescription}:Props){
 const effectiveTitle=seoTitle||title;
 const effectiveDescription=seoDescription||summary;
 return <section style={{border:"1px solid #dbe2ea",borderRadius:10,padding:20,background:"#f8fafc",display:"grid",gap:12}}>
  <input type="hidden" name="seo_title" value={seoTitle}/>
  <input type="hidden" name="seo_description" value={seoDescription}/>
  <div><h2 style={{fontSize:20,margin:"0 0 6px"}}>Otimização para o Google (SEO)</h2><p style={{fontSize:13,color:"#536372",margin:0}}>Visualização de como o conteúdo poderá aparecer nos resultados de pesquisa.</p></div>
  <div aria-live="polite" style={{background:"#fff",border:"1px solid #e3e7ec",borderRadius:9,padding:15,overflowWrap:"anywhere"}}>
   <small style={{color:"#286b42"}}>dianavoltolini.com.br/blog/{slug||"endereco-do-conteudo"}</small>
   <p style={{color:"#1a0dab",fontSize:18,margin:"7px 0"}}>{effectiveTitle||"Título do conteúdo"}</p>
   <p style={{color:"#4b5563",fontSize:13,margin:0}}>{effectiveDescription||"Resumo do conteúdo"}</p>
  </div>
  <p style={{fontSize:12,color:"#607080",margin:0}}>Prévia aproximada. O Google pode apresentar títulos e descrições diferentes.</p>
 </section>;
}