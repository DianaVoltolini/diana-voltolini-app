import type {Metadata} from "next";
import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {getFiscalAccess} from "@/lib/fiscal/subscription-access";
import FiscalRichText from "@/components/fiscal-rich-text";
import styles from "./article.module.css";
export const metadata:Metadata={title:"Conteúdo Fiscal na Prática | Área do Cliente",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
const date=(v:string|null)=>v?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"long",year:"numeric"}).format(new Date(v)):"";
function labelSource(url:string){
 try{const host=new URL(url).hostname.replace(/^www\./,"");if(host==="nfe.fazenda.gov.br")return "Portal Nacional da NF-e";if(host==="confaz.fazenda.gov.br")return "CONFAZ — Legislação";if(host==="planalto.gov.br")return "Planalto — Legislação federal";return host}catch{return "Fonte consultada"}
}
export default async function ExclusiveArticle({params}:{params:Promise<{slug:string}>}){
 const auth=await createClient();
 const {data,error}=await auth.auth.getClaims();
 const uid=typeof data?.claims?.sub==="string"?data.claims.sub:null;
 if(error||!uid)redirect("/login?retorno=%2Fpainel%2Fassinatura");
 const access=await getFiscalAccess(uid);
 const db=getSupabaseAdmin();
 const {data:article,error:articleError}=await db.from("fiscal_articles")
 .select("title,summary,category,body,source_links,visibility,published_at")
 .eq("slug",(await params).slug).eq("status","published").maybeSingle();
 if(articleError)throw new Error("Não foi possível carregar o material.");
 if(!article)notFound();
 if(article.visibility!=="public"&&!access.allowed)redirect("/painel/assinatura");
 const sources=String(article.source_links??"").split(/\r?\n/).map(x=>x.trim()).filter(x=>/^https:\/\//i.test(x));
 const minutes=Math.max(1,Math.ceil(String(article.body??"").trim().split(/\s+/).length/220));
 return <main className={styles.page}><div className={styles.container}>
  <Link href="/painel/assinatura" className={styles.back}>← Voltar à biblioteca Fiscal na Prática</Link>
  <header className={styles.hero}>
   <p className={styles.category}>{article.category||"FISCAL NA PRÁTICA"} · {article.visibility==="public"?"CONTEÚDO GRATUITO":"EXCLUSIVO PARA ASSINANTES"}</p>
   <h1>{article.title}</h1>
   <p className={styles.summary}>{article.summary}</p>
   <div className={styles.meta}>
    {article.published_at&&<span>Publicado em {date(article.published_at)}</span>}
    <span>Leitura estimada: {minutes} min</span><span>Fiscal na Prática · Diana Voltolini</span>
   </div>
  </header>
  <article className={styles.content}>
   <FiscalRichText body={article.body??""}/>
   {sources.length>0&&<section className={styles.sources}><h2>Fontes e referências</h2><p>Documentos consultados na elaboração deste material.</p><ul className={styles.sourceList}>
    {sources.map((url,i)=><li key={i}><a href={url} target="_blank" rel="noopener noreferrer">{labelSource(url)}<small>{url.length>85?url.slice(0,82)+"…":url}</small></a></li>)}
   </ul></section>}
  </article>
  <section className={styles.footer}><h2>Continue explorando sua biblioteca fiscal</h2><p>Acesse os demais artigos, roteiros e materiais disponíveis para seu perfil. As publicações exclusivas permanecem disponíveis conforme a vigência da assinatura.</p><Link href="/painel/assinatura">Voltar aos conteúdos →</Link></section>
 </div></main>;
}