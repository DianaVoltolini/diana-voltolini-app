import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getFiscalAccess } from "@/lib/fiscal/subscription-access";
import CancelSubscriptionConfirm from "./cancel-confirmation";
import ProductPage from "../product-page";
import FiscalLibrary from "./fiscal-library";
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
 return <ProductPage title="Fiscal na Prática" description="Análises fiscais, materiais e orientações para aplicar na rotina de faturamento.">
 {!active?<section style={{marginTop:0,background:"#fff",padding:30,borderRadius:12}}>
 <h2>Acesso para assinantes</h2><p>Seu cadastro ainda não possui uma assinatura vigente. Seus outros produtos adquiridos continuam disponíveis normalmente no painel.</p>
 <a href="https://dianavoltolini.com.br/assinatura-fiscal" style={{fontWeight:800,color:"#926e10"}}>Conhecer o Fiscal na Prática →</a>
 </section>:<section style={{marginTop:30}}>
 <p style={{color:"#167143",fontWeight:750}}>{access.grace?"Período de carência: regularize o pagamento para manter o acesso.":access.cancellationRequested?"Cancelamento solicitado. Acesso mantido até o fim do período pago.":"Assinatura vigente até "+new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(access.paidUntil!))}</p>
 {!access.cancellationRequested && access.paidUntil && access.subscriptionId && <CancelSubscriptionConfirm paidUntil={access.paidUntil} subscriptionId={access.subscriptionId} />}
 {articlesError?<p role="alert">Não foi possível carregar seus conteúdos.</p>:<FiscalLibrary articles={articles??[]}/>} </section>}
 </ProductPage>;
}
