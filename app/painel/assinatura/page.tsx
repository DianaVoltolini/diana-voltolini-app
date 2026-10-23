import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
export const metadata:Metadata={title:"Fiscal na Prática | Minha assinatura",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function SubscriptionPage(){
 const client=await createClient();
 const {data,error}=await client.auth.getClaims();
 const uid=typeof data?.claims?.sub==="string"?data.claims.sub:null;
 if(error||!uid)redirect("/login?retorno=%2Fpainel%2Fassinatura");
 const db=getSupabaseAdmin();
 const [{data:subscription,error:subscriptionError},{data:articles,error:articlesError}]=await Promise.all([
 db.from("fiscal_subscriptions").select("paid_until").eq("user_id",uid).eq("status","active").gt("paid_until",new Date().toISOString()).order("paid_until",{ascending:false}).limit(1),
 db.from("fiscal_articles").select("id,slug,title,summary,category,published_at").eq("status","published").eq("visibility","subscriber").order("published_at",{ascending:false}).limit(100)
 ]);
 const active=!subscriptionError&&Boolean(subscription?.length);
 return <main style={{minHeight:"100vh",background:"#f2f6fa",padding:"45px 20px"}}>
 <div className="container" style={{maxWidth:980}}>
 <Link href="/painel" style={{fontWeight:750,color:"#8d6a11"}}>← Voltar ao painel</Link>
 <p style={{marginTop:32,color:"#89660c",fontWeight:800}}>CONTEÚDO EXCLUSIVO</p><h1>Fiscal na Prática</h1>
 <p>Análises fiscais, materiais e orientações para aplicar na rotina de faturamento.</p>
 {subscriptionError?<p>Não foi possível verificar sua assinatura neste momento. O conteúdo continua protegido.</p>:
 !active?<section style={{marginTop:30,background:"#fff",padding:30,borderRadius:12}}>
 <h2>Acesso para assinantes</h2><p>Seu cadastro ainda não possui uma assinatura vigente. Seus outros produtos adquiridos continuam disponíveis normalmente no painel.</p>
 <a href="https://dianavoltolini.com.br/assinatura-fiscal" style={{fontWeight:800,color:"#926e10"}}>Conhecer o Fiscal na Prática →</a>
 </section>:<section style={{marginTop:30}}>
 <p style={{color:"#167143",fontWeight:750}}>Assinatura vigente até {new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(subscription![0].paid_until))}</p>
 {articlesError?<p>Não foi possível carregar seus conteúdos.</p>:
 <div style={{display:"grid",gap:16}}>{(articles??[]).map(x=><article key={x.id} style={{background:"#fff",padding:25,borderRadius:12}}>
 <small>{x.category}</small><h2>{x.title}</h2><p>{x.summary}</p><Link href={`/painel/assinatura/${x.slug}`} style={{color:"#8d6a11",fontWeight:750}}>Acessar material →</Link></article>)}
 {articles?.length===0&&<p>Os primeiros materiais exclusivos serão publicados em breve.</p>}</div>}</section>}
 </div></main>;
}
