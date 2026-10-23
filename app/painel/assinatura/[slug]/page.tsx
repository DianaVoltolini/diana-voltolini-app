import type { Metadata } from "next";
import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
export const metadata:Metadata={title:"Material exclusivo | Fiscal na Prática",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function ExclusiveArticle({params}:{params:Promise<{slug:string}>}){
 const auth=await createClient();const {data,error}=await auth.auth.getClaims();
 const uid=typeof data?.claims?.sub==="string"?data.claims.sub:null;
 if(error||!uid)redirect("/login?retorno=%2Fpainel%2Fassinatura");
 const db=getSupabaseAdmin();const {data:access,error:accessError}=await db.from("fiscal_subscriptions")
 .select("id").eq("user_id",uid).eq("status","active").gt("paid_until",new Date().toISOString()).limit(1);
 if(accessError)throw new Error("Não foi possível verificar a autorização.");
 if(!access?.length)redirect("/painel/assinatura");
 const {data:article,error:articleError}=await db.from("fiscal_articles").select("title,summary,category,body,source_links")
 .eq("slug",(await params).slug).eq("status","published").eq("visibility","subscriber").maybeSingle();
 if(articleError)throw new Error("Não foi possível carregar o material.");
 if(!article)notFound();
 const sources=String(article.source_links??"").split(/\r?\n/).map((x:string)=>x.trim()).filter((x:string)=>/^https:\/\//i.test(x));
 return <main style={{background:"#f2f6fa",minHeight:"100vh",padding:"45px 20px"}}><article className="container" style={{maxWidth:880,background:"#fff",padding:32,borderRadius:12}}>
 <Link href="/painel/assinatura">← Biblioteca Fiscal na Prática</Link>
 <p style={{color:"#96730e",marginTop:22,fontWeight:800}}>{article.category} · Exclusivo para assinantes</p>
 <h1>{article.title}</h1><p style={{fontSize:19}}>{article.summary}</p><hr style={{margin:"25px 0",borderColor:"#d9e1e7"}}/>
 <div style={{whiteSpace:"pre-wrap",lineHeight:1.85,overflowWrap:"anywhere"}}>{article.body}</div>
 {sources.length>0&&<section style={{marginTop:30}}><h2>Fontes</h2>{sources.map((url:string)=><p key={url}><a target="_blank" rel="noopener noreferrer" href={url}>{url}</a></p>)}</section>}
 </article></main>;
}
