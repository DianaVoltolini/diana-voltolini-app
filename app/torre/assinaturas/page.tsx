import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import styles from "../painel.module.css";
export const metadata:Metadata={title:"Assinatura Recorrente | Torre"};
export const dynamic="force-dynamic";
const date=(v:string|null)=>v?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(v.length===10?v+"T12:00:00Z":v)):"—";
export default async function AssinaturasPage(){
 await requireAdmin();
 const db=getSupabaseAdmin();
 const [{data:rows,error},{data:profiles},{data:invoices,error:invoiceError},{data:product,error:priceError}]=await Promise.all([
 db.from("fiscal_subscriptions").select("id,user_id,status,paid_until,renewal_enabled,cancellation_requested_at,billing_day,created_at").order("created_at",{ascending:false}).limit(300),
 db.from("profiles").select("id,full_name,email").limit(1000),
 db.from("fiscal_subscription_invoices").select("*").order("due_date",{ascending:false}).limit(2000),
 db.from("products").select("price_cents,currency,active").eq("code","ASSINATURA-FISCAL-001").maybeSingle(),
 ]);
 const items=rows??[],users=new Map((profiles??[]).map(u=>[u.id,u]));
 const invoicesBySubscription=new Map<string,NonNullable<typeof invoices>>();
 for(const invoice of invoices??[]){
  const id=String(invoice.subscription_id??"");
  const group=invoicesBySubscription.get(id)??[];
  group.push(invoice);
  invoicesBySubscription.set(id,group);
 }
 const pendingInvoices=(invoices??[]).filter(i=>i.status==="pending"&&Boolean(i.order_id));
 const pendingOrderIds=[...new Set(pendingInvoices.map(i=>String(i.order_id)))];
 const [{data:pendingOrders,error:ordersError},{data:pendingPayments,error:paymentsError}]=pendingOrderIds.length?await Promise.all([
   db.from("orders").select("id,status,provider_order_id,metadata").in("id",pendingOrderIds),
   db.from("payments").select("order_id,status,provider_payment_id,provider").in("order_id",pendingOrderIds).eq("provider","bling"),
 ]):[{data:[],error:null},{data:[],error:null}];
 const ordersById=new Map((pendingOrders??[]).map(o=>[o.id,o]));
 type PaymentLinkRow={order_id:string;status:string;provider_payment_id:string|null;provider:string};
 const paymentsByOrder=new Map<string,PaymentLinkRow[]>();
 for(const payment of pendingPayments??[]){
   const group=paymentsByOrder.get(payment.order_id)??[];
   group.push(payment);
   paymentsByOrder.set(payment.order_id,group);
 }
 const priceLabel=!priceError&&product?.active===true&&product.currency==="BRL"&&
   Number.isSafeInteger(product.price_cents)&&product.price_cents>0
   ?new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(product.price_cents/100)
   :"Não disponível";
 const nextPending=(id:string)=>(invoicesBySubscription.get(id)??[])
  .filter(i=>i.status==="pending"&&Boolean(i.due_date))
  .sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)))[0]??null;
 const nextDue=(x:(typeof items)[number])=>{
  const invoice=nextPending(x.id);
  return invoice?.due_date?date(String(invoice.due_date)):date(x.paid_until);
 };
 const charge=(x:(typeof items)[number])=>{
  const invoice=nextPending(x.id);
  if(!invoice)return x.renewal_enabled===false?"Renovação desativada":"Não emitida";
  if(!invoice.order_id)return "Mensalidade sem pedido · conferir";
  const order=ordersById.get(String(invoice.order_id));
  if(!order)return "Pedido não localizado · conferir";
  const payments=paymentsByOrder.get(order.id)??[];
  if(payments.length>1)return "Cobranças duplicadas · conferir";
  if(payments.length===1){
    const payment=payments[0];
    if(payment.provider_payment_id&&payment.status==="paid")return "Pagamento confirmado · conferir";
    if(payment.provider_payment_id&&["pending","processing"].includes(payment.status))return "Cobrança Bling vinculada";
    return "Cobrança exige conferência";
  }
  if(order.provider_order_id)return "Pedido no Bling · sem cobrança vinculada";
  if(order.metadata?.checkout_state!=="reserved")return "Reserva em conferência";
  return "Apenas reserva local";
 };
 // Auditoria em tempo real, sem atualizar pedidos, cobranças ou assinaturas.
 // Uma mensalidade só passa a ser exigível na data civil do vencimento (São Paulo).
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"})
  .format(new Date());
 const dueISO=(value:string)=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"})
  .format(new Date(value));
 type Alert={id:string;label:string;description:string;severity:"failure"|"open"};
 const renewalAlerts:Alert[]=[];
 if(!error&&!invoiceError&&!ordersError&&!paymentsError){
  for(const sub of items){
   if(!["active","past_due"].includes(sub.status)||sub.renewal_enabled!==true||
      sub.cancellation_requested_at!==null||!sub.paid_until)continue;
   const due=dueISO(sub.paid_until);
   if(today<due)continue;
   const invoice=nextPending(sub.id);
   const label=users.get(sub.user_id)?.full_name||"Assinante";
   if(!invoice){
    const alreadyPaid=(invoicesBySubscription.get(sub.id)??[])
     .some(i=>i.status==="paid"&&String(i.reference_month??"")===due.slice(0,7)+"-01");
    if(!alreadyPaid)renewalAlerts.push({id:sub.id,label,
     description:"Cobrança automática não registrada para o vencimento "+date(sub.paid_until)+". Verificar agendamento e emissão.",
     severity:"failure"});
    continue;
   }
   if(!invoice.order_id){renewalAlerts.push({id:sub.id,label,description:"Mensalidade sem pedido de renovação vinculado.",severity:"failure"});continue;}
   const order=ordersById.get(String(invoice.order_id));
   if(!order){renewalAlerts.push({id:sub.id,label,description:"Pedido da mensalidade não localizado.",severity:"failure"});continue;}
   const payments=paymentsByOrder.get(order.id)??[];
   if(payments.length>1){renewalAlerts.push({id:sub.id,label,description:"Mais de uma cobrança vinculada. Conferência obrigatória.",severity:"failure"});continue;}
   const payment=payments[0];
   if(payment?.provider_payment_id&&["pending","processing"].includes(payment.status)){
    renewalAlerts.push({id:sub.id,label,description:"Cobrança emitida e vinculada ao Bling; pagamento ainda não confirmado.",severity:"open"});
   }else if(payment?.status==="paid"){
    renewalAlerts.push({id:sub.id,label,description:"Pagamento registrado, mas mensalidade ainda pendente: verificar conciliação.",severity:"failure"});
   }else{
    renewalAlerts.push({id:sub.id,label,description:"Cobrança não concluída no Bling. Verificar pedido, recibo e conciliação antes de nova tentativa.",severity:"failure"});
   }
  }
 }
 const failed=renewalAlerts.filter(a=>a.severity==="failure"), awaiting=renewalAlerts.filter(a=>a.severity==="open");
 const active=items.filter(x=>x.status==="active"&&x.renewal_enabled===true);
 const canceled=items.filter(x=>x.renewal_enabled===false);
 return <main className={styles.page}><section className={styles.content}><div className="container">
 <header className={styles.pageHeader}><div><p className={styles.eyebrow}>SERVIÇOS</p><h1>Assinatura Recorrente</h1><p>Acompanhe assinantes, vigência, renovação e cancelamentos do Fiscal na Prática.</p></div></header>
 {!error&&!invoiceError&&!ordersError&&!paymentsError&&<section className={styles.diagnosticsSection}>
  <header className={styles.sectionHeader}><div><p className={styles.eyebrow}>CRON · CONFERÊNCIA AUTOMÁTICA</p>
   <h2>Pendências da renovação mensal</h2>
   <p>Vencimento é a data programada para gerar a cobrança. A Torre identifica falhas e pagamentos pendentes sem criar outra cobrança.</p>
  </div></header>
  <div className={styles.summaryGrid}>
   <article><span>Falhas ou cobranças não geradas</span><strong>{failed.length}</strong><small>Exigem conferência operacional</small></article>
   <article><span>Cobranças aguardando pagamento</span><strong>{awaiting.length}</strong><small>Emissão vinculada, pagamento não confirmado</small></article>
  </div>
  {renewalAlerts.length>0?<div style={{display:"grid",gap:10,marginTop:14}}>
   {renewalAlerts.map(a=><div key={a.id} style={{padding:"12px 16px",border:"1px solid #dce3eb",borderLeft:a.severity==="failure"?"4px solid #b42318":"4px solid #c9a227",borderRadius:8}}>
    <strong>{a.label}</strong><p style={{margin:"5px 0",fontSize:13}}>{a.description}</p>
   </div>)}
  </div>:<p>Nenhuma renovação vencida sem conclusão identificada até hoje.</p>}
 </section>}
 {(ordersError||paymentsError)&&<p className={styles.errorMessage}>Não foi possível conferir os vínculos das cobranças no Bling. Os estados apresentados podem estar incompletos.</p>}
 {invoiceError&&<p className={styles.errorMessage}>Não foi possível consultar as cobranças. Verifique os dados antes de interpretar os vencimentos.</p>}
 {error?<p className={styles.errorMessage}>Não foi possível consultar assinaturas.</p>:<>
 <section className={styles.summaryGrid}><article><span>Assinaturas</span><strong>{items.length}</strong><small>Registros consultados</small></article><article><span>Renovações habilitadas</span><strong>{active.length}</strong><small>Sujeitas à cobrança agendada</small></article><article><span>Renovação desativada</span><strong>{canceled.length}</strong><small>Não gerar novas cobranças</small></article><article><span>Valor mensal por assinatura</span><strong style={{fontSize:28}}>{priceLabel}</strong><small>Preço atual do produto</small></article></section>
 <section className={styles.diagnosticsSection}><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>ACOMPANHAMENTO</p><h2>Assinaturas cadastradas</h2></div></header><div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Cliente</th><th>Cliente desde</th><th>Status</th><th>Próximo vencimento</th><th>Cobrança</th><th>Dia de cobrança</th><th>Renovação</th></tr></thead><tbody>
 {items.map(x=><tr key={x.id}><td><strong>{users.get(x.user_id)?.full_name||"Cliente"}</strong><small>{users.get(x.user_id)?.email||"E-mail não localizado"}</small></td><td>{date(x.created_at)}</td><td>{x.status==="active"?"Ativa":x.status==="canceled"?"Cancelada":x.status==="pending"?"Pendente":x.status}</td><td>{nextDue(x)}<small>{nextPending(x.id)?"Vencimento da cobrança":"Previsão pelo período pago"}</small></td><td>{charge(x)}</td><td>{x.billing_day??"—"}</td><td>{x.renewal_enabled?"Automática (conforme habilitação do cron)":"Desabilitada"}</td></tr>)}
 {!items.length&&<tr><td colSpan={7}>Nenhuma assinatura cadastrada.</td></tr>}</tbody></table></div><p style={{fontSize:12,color:"#657386"}}>Cliente desde corresponde à criação do registro da assinatura, não ao primeiro pagamento. Próximo vencimento usa a cobrança pendente mais próxima quando existe; caso contrário, mostra a previsão pelo fim do período pago. “Apenas reserva local” não significa cobrança emitida; “Pedido no Bling” não significa Pix ou boleto disponível. O painel consulta apenas os dados locais; a emissão depende do cron e das integrações do site habilitadas.</p></section></>}
 </div></section></main>;
}