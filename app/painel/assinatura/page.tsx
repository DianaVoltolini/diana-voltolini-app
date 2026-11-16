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
 const {data:planProduct,error:planError}=await db.from("products")
  .select("price_cents,currency,active").eq("code","ASSINATURA-FISCAL-001").maybeSingle();
 const priceLabel=!planError&&planProduct?.active===true&&planProduct.currency==="BRL"&&
  Number.isSafeInteger(planProduct.price_cents)&&planProduct.price_cents>0
  ? new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"})
    .format(planProduct.price_cents/100)+"/mês"
  : "Consulte o valor no checkout";
 const active=access.allowed;
 const selected=(await searchParams).entrega??"todos";
 const {data:nextInvoices}=access.subscriptionId?await db.from("fiscal_subscription_invoices")
  .select("id,due_date,status,amount_cents,order_id")
  .eq("subscription_id",access.subscriptionId).eq("status","pending")
  .order("due_date",{ascending:true}).limit(1):{data:null};
 const nextInvoice=nextInvoices?.[0]??null;
 // A forma de renovação vem da última mensalidade paga, não da preferência do browser.
 const {data:lastPaidInvoices,error:lastPaidError}=access.subscriptionId?await db.from("fiscal_subscription_invoices")
  .select("order_id").eq("subscription_id",access.subscriptionId).eq("status","paid")
  .order("paid_at",{ascending:false}).limit(1):{data:[],error:null};
 const lastPaidId=lastPaidInvoices?.[0]?.order_id??null;
 const {data:lastPaidOrder,error:lastOrderError}=lastPaidId?await db.from("orders")
  .select("metadata,status,user_id").eq("id",lastPaidId).eq("user_id",uid).eq("status","paid").maybeSingle()
  :{data:null,error:null};
 const latestMethod=lastPaidError||lastOrderError?null:lastPaidOrder?.metadata?.payment_method;
 const renewalMethod=latestMethod==="pix"||latestMethod==="boleto"?latestMethod:null;
 const {data:pendingOrder}=nextInvoice?.order_id?await db.from("orders").select("metadata,provider_order_id").eq("id",nextInvoice.order_id).maybeSingle():{data:null};
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
 const renewalEndIso=access.paidUntil
  ?dateMinusDays(dateInSaoPaulo(new Date(access.paidUntil)),-3):null;
 const isRenewalPeriod=renewalStartIso!==null&&renewalEndIso!==null&&
  todaySaoPaulo>=renewalStartIso&&todaySaoPaulo<=renewalEndIso;
 // Não exibir a solicitação enquanto a emissão e conciliação não estiverem homologadas.
 const renewalRequestEnabled=process.env.FISCAL_RENEWAL_PANEL_ENABLED==="1";
 const formatDate=(value:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(value.length===10?value+"T12:00:00Z":value));
 const nextDate=nextInvoice?.due_date?formatDate(nextInvoice.due_date):access.paidUntil?formatDate(access.paidUntil):null;
 const showRenewalNotice=!access.cancellationRequested&&!!access.paidUntil&&isRenewalPeriod;
 const renewalActionReady=renewalRequestEnabled&&process.env.FISCAL_RENEWAL_RESERVATION_ENABLED==="1";
 const canRequestPix=renewalMethod==="pix"&&showRenewalNotice&&renewalActionReady&&
  (!nextInvoice||(!pendingPayment?.payment_url&&!!nextInvoice.id));
 return <ProductPage title="Fiscal na Prática" description="Análises fiscais, materiais e orientações para aplicar na rotina de faturamento.">

 <section className={styles.sections}>
 {!active?<ProductOffer eyebrow="FISCAL NA PRÁTICA · ASSINATURA MENSAL" headline="Informação fiscal que vira ação" lead="Acompanhe as mudanças que impactam notas fiscais, impostos e processos da empresa, com orientações aplicadas à rotina do faturamento." price={priceLabel} checkout="https://dianavoltolini.com.br/checkout/assinatura-fiscal" cta="Assinar Fiscal na Prática" features={["Uma análise prática aprofundada por semana","Alertas sobre mudanças fiscais relevantes","Checklists, roteiros e exemplos","Biblioteca exclusiva para assinantes","IBS, CBS, NF-e, ICMS e DIFAL","Material educativo aplicado ao faturamento"]}/>:<div className={styles.subscriptionCard}>
 <div className={styles.subscriptionGrid}>
 <div>
 <p style={{margin:"0 0 6px",color:"#65758a",fontSize:12,fontWeight:750}}>SEU ACESSO</p>
 <p className={styles.statusTitle}>{access.cancellationRequested?"Renovação desativada":access.grace?"Pagamento pendente": "Assinatura ativa"}</p>
 <p style={{margin:"8px 0 0",fontSize:13,color:"#65758a"}}>{access.cancellationRequested&&access.paidUntil?"Acesso disponível até "+formatDate(access.paidUntil):access.grace?"Regularize o pagamento para manter o acesso após a carência.":access.paidUntil?"Acesso disponível até "+formatDate(access.paidUntil):"Consulte suas entregas."}</p>
 </div>
 {showRenewalNotice&&<div style={{gridColumn:"1 / -1",padding:"14px 16px",background:"#fffaf0",border:"1px solid #e8d8b2",borderRadius:10,marginTop:12}}>
  <strong>Sua assinatura vence em {nextDate??"data a confirmar"}.</strong>
  {renewalMethod==="boleto"
   ?<p style={{margin:"6px 0 0",fontSize:13}}>A renovação por boleto é programada para 10 dias antes do vencimento. {pendingPayment?.payment_url?"O boleto já está disponível abaixo.":nextInvoice?"Sua cobrança está em processamento ou conferência.":"O boleto ainda não consta como emitido; acompanhe a situação nesta página."}</p>
   :renewalMethod==="pix"
    ?<p style={{margin:"6px 0 0",fontSize:13}}>Para continuar com seu acesso, solicite a renovação por PIX. Nenhuma cobrança PIX é gerada automaticamente.</p>
    :<p style={{margin:"6px 0 0",fontSize:13}}>A forma de pagamento anterior precisa ser conferida para disponibilizar a renovação.</p>}
  {canRequestPix&&<RenewalRequest existingInvoiceId={nextInvoice?.id??null}
   existingOrderState={typeof pendingOrder?.metadata?.checkout_state==="string"?pendingOrder.metadata.checkout_state:null}
   issuanceEnabled={process.env.FISCAL_RENEWAL_PANEL_ISSUANCE_ENABLED==="1"}
   financialEnabled={process.env.FISCAL_RENEWAL_PANEL_FINANCIAL_ENABLED==="1"}
   actionLabel="Renovar com PIX"/>}
  {renewalMethod==="pix"&&!renewalActionReady&&!nextInvoice&&<p style={{fontSize:12,margin:"8px 0 0"}}>A solicitação de PIX ainda está indisponível. Entre em contato com o suporte para renovar.</p>}
  {nextInvoice&&pendingPayment?.payment_url&&pendingPayment.payment_url.startsWith("https://")&&
   <p style={{margin:"10px 0 0"}}><a href={pendingPayment.payment_url} target="_blank" rel="noopener noreferrer" style={{fontWeight:750}}>Acessar cobrança da renovação</a></p>}
 </div>}
 <details className={styles.manageDetails}><summary>Gerenciar assinatura <span aria-hidden="true">⌄</span></summary><div className={styles.renewalPanel}>
 <p style={{margin:"0 0 6px",fontSize:12,color:"#65758a",fontWeight:750}}>{access.cancellationRequested?"Fim do período pago":nextInvoice?"Próxima cobrança":"Próxima renovação prevista"}</p>
 <strong style={{fontSize:21,color:"#102033"}}>{nextDate??"A confirmar"}</strong>
 <p style={{fontSize:12,color:"#748497",margin:"5px 0 0"}}>{nextInvoice?"Cobrança pendente · "+new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(nextInvoice.amount_cents/100):access.cancellationRequested?"Não serão geradas novas renovações":"Previsão conforme o período pago; cobrança ainda não gerada."}</p>
 {!access.cancellationRequested&&nextInvoice&&pendingPayment?.payment_url&&pendingPayment.payment_url.startsWith("https://")&&<p style={{margin:"12px 0 0"}}><a href={pendingPayment.payment_url} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",background:"#c9a227",color:"#102033",padding:"10px 15px",borderRadius:8,fontWeight:750,textDecoration:"none"}}>Acessar cobrança existente</a></p>}
 {/* O botão PIX permanece no aviso principal; boleto é processado pelo cron. */}
 {!access.cancellationRequested&&!nextInvoice&&renewalStartDate&&<p style={{fontSize:12,color:"#65758a",margin:"12px 0 0"}}>{!renewalRequestEnabled?"A solicitação de renovação ainda está em preparação. Nenhuma cobrança foi gerada.":isRenewalPeriod?(renewalMethod==="pix"?"Solicite seu PIX no aviso acima.":renewalMethod==="boleto"?"Boleto programado para emissão automática; verifique a Torre se ainda não foi emitido.":"Forma de pagamento anterior exige conferência."):todaySaoPaulo<renewalStartIso!?"A renovação poderá ser solicitada a partir de "+renewalStartDate+". Nenhuma cobrança foi gerada.":"O prazo de solicitação automática terminou. Entre em contato para regularizar sua assinatura."}</p>}
 {!access.cancellationRequested&&access.paidUntil&&access.subscriptionId&&<div className={styles.cancelArea}><CancelSubscriptionConfirm paidUntil={access.paidUntil} subscriptionId={access.subscriptionId}/></div>}
 </div></details>
 </div>
 </div>}
 {articlesError?<p role="alert">Não foi possível carregar seus conteúdos.</p>:<FiscalLibrary initialDelivery={selected} articles={(articles??[]).filter(a=>active||a.visibility==="public")}/>}
 </section>
 </ProductPage>;
}
