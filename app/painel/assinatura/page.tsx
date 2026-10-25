import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getFiscalAccess } from "@/lib/fiscal/subscription-access";
import CancelSubscriptionConfirm from "./cancel-confirmation";
import ProductPage from "../product-page";
import ProductOffer from "../product-offer";
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
 db.from("fiscal_articles").select("id,slug,title,summary,category,published_at,visibility").eq("status","published").order("published_at",{ascending:false}).limit(100)
 ]);
 const active=access.allowed;
 return <ProductPage title="Fiscal na Prática" description="Análises fiscais, materiais e orientações para aplicar na rotina de faturamento.">

 <section style={{display:"grid",gap:22}}>
 {!active?<ProductOffer eyebrow="FISCAL NA PRÁTICA · ASSINATURA MENSAL" headline="Informação fiscal que vira ação" lead="Acompanhe as mudanças que impactam notas fiscais, impostos e processos da empresa, com orientações aplicadas à rotina do faturamento." price="R$ 39,90/mês" checkout="https://dianavoltolini.com.br/checkout/assinatura-fiscal" cta="Assinar Fiscal na Prática" features={["Uma análise prática aprofundada por semana","Alertas sobre mudanças fiscais relevantes","Checklists, roteiros e exemplos","Biblioteca exclusiva para assinantes","IBS, CBS, NF-e, ICMS e DIFAL","Material educativo aplicado ao faturamento"]}/>:<div style={{background:"#e9f6ee",border:"1px solid #cce9d4",padding:"18px 24px",borderRadius:10}}>
 <p style={{color:"#167143",fontWeight:750,margin:0}}>{access.grace?"Período de carência: regularize o pagamento para manter o acesso.":access.cancellationRequested?"Cancelamento solicitado. Acesso mantido até o fim do período pago.":"Assinatura vigente até "+new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(access.paidUntil!))}</p>
 {!access.cancellationRequested && access.paidUntil && access.subscriptionId && <CancelSubscriptionConfirm paidUntil={access.paidUntil} subscriptionId={access.subscriptionId} />}
 </div>}
 {articlesError?<p role="alert">Não foi possível carregar seus conteúdos.</p>:<FiscalLibrary articles={(articles??[]).filter(a=>active||a.visibility==="public")}/>}
 </section>
 </ProductPage>;
}
