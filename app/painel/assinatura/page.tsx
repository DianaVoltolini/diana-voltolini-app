import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getFiscalAccess } from "@/lib/fiscal/subscription-access";
import CancelSubscriptionConfirm from "./cancel-confirmation";
import RenewalRequest from "./renewal-request";
import ProductPage from "../product-page";
import ProductOffer from "../product-offer";
import FiscalLibrary from "./fiscal-library";
import styles from "./subscription-layout.module.css";
export const metadata:Metadata={title:"Fiscal na Prática | Minha assinatura",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function SubscriptionPage({searchParams}:{searchParams:Promise<{entrega?:string}>}){
 const client=await createClient();
 const {data,error}=await client.auth.getClaims();
 const uid=typeof data?.claims?.sub==="string"?data.claims.sub:null;
 if(error||!uid)redirect("/login?retorno=%2Fpainel%2Fassinatura");
 const db=getSupabaseAdmin();
 const [access,{data:articles,error:articlesError}]=await Promise.all([
 getFiscalAccess(uid),
 db.from("fiscal_articles").select("id,slug,title,summary,category,published_at,visibility,delivery_type").eq("status","published").order("published_at",{ascending:false}).limit(100)
 ]);
 const active=access.allowed;
 const selected=(await searchParams).entrega??"todos";
 const {data:nextInvoices}=access.subscriptionId?await db.from("fiscal_subscription_invoices")
  .select("due_date,status,amount_cents,order_id")
  .eq("subscription_id",access.subscriptionId).eq("status","pending")
  .order("due_date",{ascending:true}).limit(1):{data:null};
 const nextInvoice=nextInvoices?.[0]??null;
 const {data:pendingPayment}=nextInvoice?.order_id
  ?await db.from("payments").select("payment_url,status").eq("order_id",nextInvoice.order_id).eq("provider","bling").in("status",["pending","processing"]).order("created_at",{ascending:false}).limit(1).maybeSingle()
  :{data:null};
 // A janela de renovação usa datas civis de São Paulo, nunca horas.
 const dateInSaoPaulo=(value:Date)=>{const p=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(value);const m=Object.fromEntries(p.map(x=>[x.type,x.value]));return `${m.year}-${m.month}-${m.day}`;};
 const dateMinusDays=(iso:string,days:number)=>{const d=new Date(iso+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-days);return d.toISOString().slice(0,10);};
 const displayCivilDate=(iso:string)=>iso.split("-").reverse().join("/");
 const todaySaoPaulo=dateInSaoPaulo(new Date());
 const renewalStartIso=access.paidUntil?dateMinusDays(dateInSaoPaulo(new Date(access.paidUntil)),10):null;
 const renewalStartDate=renewalStartIso?displayCivilDate(renewalStartIso):null;
 const isRenewalPeriod=renewalStartIso!==null&&todaySaoPaulo>=renewalStartIso;
 // Não exibir a solicitação enquanto a emissão e conciliação não estiverem homologadas.
 const renewalRequestEnabled=process.env.FISCAL_RENEWAL_PANEL_ENABLED==="1";
 const formatDate=(value:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(value.length===10?value+"T12:00:00Z":value));
 const nextDate=nextInvoice?.due_date?formatDate(nextInvoice.due_date):access.paidUntil?formatDate(access.paidUntil):null;
 return <ProductPage title="Fiscal na Prática" description="Análises fiscais, materiais e orientações para aplicar na rotina de faturamento.">

 <section className={styles.sections}>
 {!active?<ProductOffer eyebrow="FISCAL NA PRÁTICA · ASSINATURA MENSAL" headline="Informação fiscal que vira ação" lead="Acompanhe as mudanças que impactam notas fiscais, impostos e processos da empresa, com orientações aplicadas à rotina do faturamento." price="R$ 39,90/mês" checkout="https://dianavoltolini.com.br/checkout/assinatura-fiscal" cta="Assinar Fiscal na Prática" features={["Uma análise prática aprofundada por semana","Alertas sobre mudanças fiscais relevantes","Checklists, roteiros e exemplos","Biblioteca exclusiva para assinantes","IBS, CBS, NF-e, ICMS e DIFAL","Material educativo aplicado ao faturamento"]}/>:<div className={styles.subscriptionCard}>
 <div className={styles.subscriptionGrid}>
 <div>
 <p style={{margin:"0 0 6px",color:"#65758a",fontSize:12,fontWeight:750}}>SEU ACESSO</p>
 <p className={styles.statusTitle}>{access.cancellationRequested?"Renovação desativada":access.grace?"Pagamento pendente": "Assinatura ativa"}</p>
 <p style={{margin:"8px 0 0",fontSize:13,color:"#65758a"}}>{access.cancellationRequested&&access.paidUntil?"Acesso disponível até "+formatDate(access.paidUntil):access.grace?"Regularize o pagamento para manter o acesso após a carência.":access.paidUntil?"Acesso disponível até "+formatDate(access.paidUntil):"Consulte suas entregas."}</p>
 </div>
 <details className={styles.manageDetails}><summary>Gerenciar assinatura <span aria-hidden="true">⌄</span></summary><div className={styles.renewalPanel}>
 <p style={{margin:"0 0 6px",fontSize:12,color:"#65758a",fontWeight:750}}>{access.cancellationRequested?"Fim do período pago":nextInvoice?"Próxima cobrança":"Próxima renovação prevista"}</p>
 <strong style={{fontSize:21,color:"#102033"}}>{nextDate??"A confirmar"}</strong>
 <p style={{fontSize:12,color:"#748497",margin:"5px 0 0"}}>{nextInvoice?"Cobrança pendente · "+new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(nextInvoice.amount_cents/100):access.cancellationRequested?"Não serão geradas novas renovações":"Previsão conforme o período pago; cobrança ainda não gerada."}</p>
 {!access.cancellationRequested&&nextInvoice&&pendingPayment?.payment_url&&pendingPayment.payment_url.startsWith("https://")&&<p style={{margin:"12px 0 0"}}><a href={pendingPayment.payment_url} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",background:"#c9a227",color:"#102033",padding:"10px 15px",borderRadius:8,fontWeight:750,textDecoration:"none"}}>Acessar cobrança existente</a></p>}
 {!access.cancellationRequested&&!nextInvoice&&isRenewalPeriod&&renewalRequestEnabled&&<RenewalRequest/>}
 {!access.cancellationRequested&&!nextInvoice&&renewalStartDate&&<p style={{fontSize:12,color:"#65758a",margin:"12px 0 0"}}>{isRenewalPeriod?"A renovação ainda não está disponível para pagamento. Nenhuma cobrança foi gerada.":"A renovação poderá ser solicitada a partir de "+renewalStartDate+". Nenhuma cobrança foi gerada."}</p>}
 {!access.cancellationRequested&&access.paidUntil&&access.subscriptionId&&<div className={styles.cancelArea}><CancelSubscriptionConfirm paidUntil={access.paidUntil} subscriptionId={access.subscriptionId}/></div>}
 </div></details>
 </div>
 </div>}
 {articlesError?<p role="alert">Não foi possível carregar seus conteúdos.</p>:<FiscalLibrary initialDelivery={selected} articles={(articles??[]).filter(a=>active||a.visibility==="public")}/>}
 </section>
 </ProductPage>;
}
