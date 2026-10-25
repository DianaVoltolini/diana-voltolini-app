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
 const {data:nextInvoices}=access.subscriptionId?await db.from("fiscal_subscription_invoices")
  .select("due_date,status,amount_cents")
  .eq("subscription_id",access.subscriptionId).eq("status","pending")
  .order("due_date",{ascending:true}).limit(1):{data:null};
 const nextInvoice=nextInvoices?.[0]??null;
 const formatDate=(value:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(value.length===10?value+"T12:00:00Z":value));
 const nextDate=nextInvoice?.due_date?formatDate(nextInvoice.due_date):access.paidUntil?formatDate(access.paidUntil):null;
 return <ProductPage title="Fiscal na Prática" description="Análises fiscais, materiais e orientações para aplicar na rotina de faturamento.">

 <section style={{display:"grid",gap:22}}>
 {!active?<ProductOffer eyebrow="FISCAL NA PRÁTICA · ASSINATURA MENSAL" headline="Informação fiscal que vira ação" lead="Acompanhe as mudanças que impactam notas fiscais, impostos e processos da empresa, com orientações aplicadas à rotina do faturamento." price="R$ 39,90/mês" checkout="https://dianavoltolini.com.br/checkout/assinatura-fiscal" cta="Assinar Fiscal na Prática" features={["Uma análise prática aprofundada por semana","Alertas sobre mudanças fiscais relevantes","Checklists, roteiros e exemplos","Biblioteca exclusiva para assinantes","IBS, CBS, NF-e, ICMS e DIFAL","Material educativo aplicado ao faturamento"]}/>:<div style={{background:"#fff",border:"1px solid #dfe6ed",borderRadius:12,padding:"22px 26px",display:"grid",gap:12}}>
 <div style={{display:"flex",justifyContent:"space-between",gap:22,alignItems:"start",flexWrap:"wrap"}}>
 <div>
 <p style={{margin:"0 0 6px",color:"#65758a",fontSize:12,fontWeight:750}}>SUA ASSINATURA · FISCAL NA PRÁTICA</p>
 <p style={{margin:0,fontSize:19,fontWeight:800,color:"#102033"}}>{access.cancellationRequested?"Renovação desativada":access.grace?"Pagamento pendente": "Assinatura ativa"}</p>
 <p style={{margin:"8px 0 0",fontSize:13,color:"#65758a"}}>{access.cancellationRequested&&access.paidUntil?"Acesso disponível até "+formatDate(access.paidUntil):access.grace?"Regularize o pagamento para manter o acesso após a carência.":"Acompanhe suas publicações e informações de cobrança abaixo."}</p>
 </div>
 <div style={{textAlign:"left"}}>
 <p style={{margin:"0 0 6px",fontSize:12,color:"#65758a",fontWeight:750}}>{access.cancellationRequested?"Fim do período pago":nextInvoice?"Próxima cobrança":"Próxima renovação prevista"}</p>
 <strong style={{fontSize:21,color:"#102033"}}>{nextDate??"A confirmar"}</strong>
 <p style={{fontSize:12,color:"#748497",margin:"5px 0 0"}}>{nextInvoice?"Cobrança pendente · "+new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(nextInvoice.amount_cents/100):access.cancellationRequested?"Não serão geradas novas renovações":"Previsão conforme o período pago; cobrança ainda não gerada."}</p>
 </div>
 </div>
 {!access.cancellationRequested&&access.paidUntil&&access.subscriptionId&&<div style={{borderTop:"1px solid #ecf0f3",paddingTop:12}}><CancelSubscriptionConfirm paidUntil={access.paidUntil} subscriptionId={access.subscriptionId}/></div>}
 </div>}
 {articlesError?<p role="alert">Não foi possível carregar seus conteúdos.</p>:<FiscalLibrary articles={(articles??[]).filter(a=>active||a.visibility==="public")}/>}
 </section>
 </ProductPage>;
}
