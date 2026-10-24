import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getFiscalAccess } from "@/lib/fiscal/subscription-access";
import { cancelFiscalSubscription } from "./actions";
import StartFiscalCheckout from "./start-checkout";
export const metadata:Metadata={title:"Fiscal na Prática | Minha assinatura",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function SubscriptionPage(){
 const client=await createClient();
 const {data,error}=await client.auth.getClaims();
 const uid=typeof data?.claims?.sub==="string"?data.claims.sub:null;
 if(error||!uid)redirect("/login?retorno=%2Fpainel%2Fassinatura");
 const db=getSupabaseAdmin();
 const [access,{data:articles,error:articlesError}]=await Promise.all([
 getFiscalAccess(uid),
 db.from("fiscal_articles").select("id,slug,title,summary,category,published_at").eq("status","published").eq("visibility","subscriber").order("published_at",{ascending:false}).limit(100)
 ]);
 const active=access.allowed;
 return <main style={{minHeight:"100vh",background:"#f2f6fa",padding:"45px 20px"}}>
 <div className="container" style={{maxWidth:980}}>
 <Link href="/painel" style={{fontWeight:750,color:"#8d6a11"}}>← Voltar ao painel</Link>
 <p style={{marginTop:32,color:"#89660c",fontWeight:800}}>CONTEÚDO EXCLUSIVO</p><h1>Fiscal na Prática</h1>
 <p>Análises fiscais, materiais e orientações para aplicar na rotina de faturamento.</p>
 {!active?<section style={{marginTop:30,background:"#fff",padding:30,borderRadius:12}}>
 <h2>Acesso para assinantes</h2><p>Seu cadastro ainda não possui uma assinatura vigente. Seus outros produtos adquiridos continuam disponíveis normalmente no painel.</p>
 <a href="https://dianavoltolini.com.br/assinatura-fiscal" style={{fontWeight:800,color:"#926e10"}}>Conhecer o Fiscal na Prática →</a>
 <StartFiscalCheckout/>
 </section>:<section style={{marginTop:30}}>
 <p style={{color:"#167143",fontWeight:750}}>{access.grace?"Período de carência: regularize o pagamento para manter o acesso.":access.cancellationRequested?"Cancelamento solicitado. Acesso mantido até o fim do período pago.":"Assinatura vigente até "+new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(access.paidUntil!))}</p>
 {!access.cancellationRequested&&<form action={cancelFiscalSubscription} style={{margin:"14px 0 25px"}}><button type="submit" style={{padding:"10px 14px",cursor:"pointer"}}>Solicitar cancelamento da assinatura</button></form>}
 {articlesError?<p>Não foi possível carregar seus conteúdos.</p>:
 <div style={{display:"grid",gap:16}}>{(articles??[]).map(x=><article key={x.id} style={{background:"#fff",padding:25,borderRadius:12}}>
 <small>{x.category}</small><h2>{x.title}</h2><p>{x.summary}</p><Link href={`/painel/assinatura/${x.slug}`} style={{color:"#8d6a11",fontWeight:750}}>Acessar material →</Link></article>)}
 {articles?.length===0&&<p>Os primeiros materiais exclusivos serão publicados em breve.</p>}</div>}</section>}
 </div></main>;
}
