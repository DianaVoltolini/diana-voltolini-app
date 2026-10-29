// app/torre/conteudos/previa/[id]/page.tsx
import {notFound} from "next/navigation";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import FiscalRichText from "@/components/fiscal-rich-text";
export const dynamic="force-dynamic";
export default async function PreviewFiscalArticle({params}:{params:Promise<{id:string}>}){
 await requireAdmin();
 const {id}=await params;
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))notFound();
 const {data:article,error}=await getSupabaseAdmin().from("fiscal_articles").select("title,summary,body,category,visibility,status,published_at,source_links").eq("id",id).maybeSingle();
 if(error||!article)notFound();
 return <main style={{minHeight:"100vh",background:"#faf8f4",padding:"clamp(18px,4vw,45px) 18px",color:"#102033"}}>
  <div style={{maxWidth:960,margin:"auto"}}>
   <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:24,padding:16,border:"1px solid #dec77e",background:"#fff9e9",borderRadius:9}}>
    <strong style={{fontSize:13}}>PRÉVIA ADMINISTRATIVA · Não é uma publicação pública</strong>
    <Link href="/torre/conteudos" style={{color:"#795a0c",fontWeight:700}}>Voltar ao Blog</Link>
   </div>
   <article style={{background:"#fff",border:"1px solid #dce4eb",borderRadius:13,padding:"clamp(22px,5vw,55px)"}}>
    <p style={{fontSize:12,color:"#a07a17",fontWeight:800,letterSpacing:1.2,margin:"0 0 14px"}}>{article.category} · {article.visibility==="public"?"GRATUITO":"ASSINANTES"} · {article.status==="published"?"APROVADO":"RASCUNHO"}</p>
    <h1 style={{fontFamily:"Georgia,serif",fontSize:"clamp(30px,4vw,46px)",lineHeight:1.16,letterSpacing:"-.025em",margin:"0 0 22px"}}>{article.title}</h1>
    <p style={{fontSize:19,lineHeight:1.65,color:"#53677d",margin:"0 0 30px"}}>{article.summary}</p>
    <div style={{borderTop:"1px solid #e1e8ee",paddingTop:18}}><FiscalRichText body={article.body}/></div>
    {article.source_links&&<section style={{borderTop:"1px solid #e1e8ee",marginTop:34,paddingTop:20}}><h2 style={{fontFamily:"Georgia,serif"}}>Fontes oficiais</h2><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",fontSize:13,color:"#53677d"}}>{article.source_links}</p></section>}
   </article>
  </div>
 </main>;
}
