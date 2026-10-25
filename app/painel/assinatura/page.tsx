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
 db.from("fiscal_articles").select("id,slug,title,summary,category,published_at,visibility").eq("status","published").order("published_at",{ascending:false}).limit(100)
 ]);
 const active=access.allowed;
 return <ProductPage title="Fiscal na Prática" description="Análises fiscais, materiais e orientações para aplicar na rotina de faturamento.">

 <section style={{display:"grid",gap:22}}>
 {!active?<div style={{background:"#fff",border:"1px solid #dbe3eb",borderTop:"3px solid #c9a227",borderRadius:12,padding:"26px 30px"}}>
 <p style={{fontSize:12,fontWeight:850,letterSpacing:1,color:"#98730c",margin:"0 0 10px"}}>CONHEÇA A ASSINATURA</p>
 <h2 style={{fontFamily:"Georgia,serif",fontSize:27,margin:"0 0 12px"}}>Amplie seu acesso ao Fiscal na Prática</h2>
 <p style={{color:"#586b7d",lineHeight:1.75}}>Consulte gratuitamente as publicações abertas e tenha acesso, com a assinatura mensal, às análises exclusivas, checklists, roteiros e orientações aplicadas ao faturamento.</p>
 <p style={{fontWeight:850,fontSize:21,color:"#102033",margin:"14px 0"}}>R$ 39,90/mês</p>
 <a href="https://dianavoltolini.com.br/checkout/assinatura-fiscal" style={{display:"inline-block",background:"#c9a227",color:"#0d1b2a",padding:"13px 20px",borderRadius:8,fontWeight:850,textDecoration:"none"}}>Assinar Fiscal na Prática →</a>
 <p style={{fontSize:12,color:"#6b7b8a",margin:"12px 0 0"}}>A finalização do pagamento utiliza o checkout seguro do site. Seus conteúdos e seu acesso permanecem nesta Área do Cliente.</p>
 </div>:<div style={{background:"#e9f6ee",border:"1px solid #cce9d4",padding:"18px 24px",borderRadius:10}}>
 <p style={{color:"#167143",fontWeight:750,margin:0}}>{access.grace?"Período de carência: regularize o pagamento para manter o acesso.":access.cancellationRequested?"Cancelamento solicitado. Acesso mantido até o fim do período pago.":"Assinatura vigente até "+new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(access.paidUntil!))}</p>
 {!access.cancellationRequested && access.paidUntil && access.subscriptionId && <CancelSubscriptionConfirm paidUntil={access.paidUntil} subscriptionId={access.subscriptionId} />}
 </div>}
 {articlesError?<p role="alert">Não foi possível carregar seus conteúdos.</p>:<FiscalLibrary articles={(articles??[]).filter(a=>active||a.visibility==="public")}/>}
 </section>
 </ProductPage>;
}
