import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {moneyBR} from "@/lib/fiscal/analysis-quote-links";
import {fiscalProposalExpiresLabel} from "@/lib/fiscal/proposal-validity";
import {getFiscalProposalPayment} from "@/lib/fiscal/analysis-proposal-payment";

export const metadata:Metadata={title:"Proposta individual | Diana Voltolini",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
const hasExpired=(value:string)=>new Date(value).getTime()<=Date.now();
export default async function FiscalAnalysisQuotePublic({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[a-f0-9]{64}$/.test(token))notFound();
 // A consulta é somente por hash do token: não registra nem pesquisa e-mail do cliente.
 const {quoteTokenHash}=await import("@/lib/fiscal/analysis-quote-links");
 const db=getSupabaseAdmin();
 const {data:q,error}=await db.from("fiscal_analysis_quotes")
  .select("id,request_id,version,scope,amount_cents,delivery_business_days,valid_until,status,token_expires_at,order_id")
  .eq("access_token_hash",quoteTokenHash(token)).in("status",["sent","accepted"]).maybeSingle();
 if(error||!q||!q.token_expires_at||
    hasExpired(q.valid_until)||hasExpired(q.token_expires_at))notFound();
 const payment=await getFiscalProposalPayment(q);
 const {data:req}=await db.from("fiscal_analysis_requests").select("protocol").eq("id",q.request_id).maybeSingle();
 return <main style={{background:"#f4f6f8",minHeight:"100vh",padding:"40px 18px",color:"#102033"}}>
  <article style={{margin:"0 auto",maxWidth:740,background:"#fff",border:"1px solid #d6e0e8",borderRadius:12,overflow:"hidden"}}>
   <header style={{borderTop:"5px solid #c9a227",padding:"28px 32px",borderBottom:"1px solid #d6e0e8"}}>
    <p style={{fontSize:12,fontWeight:800,color:"#997100",letterSpacing:".1em"}}>DIANA VOLTOLINI · INTELIGÊNCIA FISCAL</p>
    <h1 style={{fontFamily:"Georgia,serif",fontSize:30,lineHeight:1.2}}>Sua Proposta de Análise Fiscal Individual</h1>
    <p style={{color:"#536372"}}>Solicitação {req?.protocol??"individual"} · Versão {q.version}</p>
   </header>
   <div style={{padding:"28px 32px",lineHeight:1.75}}>
    <h2 style={{fontSize:19}}>O que será analisado</h2>
    <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{q.scope}</p>
    <div style={{background:"#f7f9fb",padding:20,borderRadius:8,borderLeft:"3px solid #c9a227"}}>
     <p style={{margin:0,color:"#536372"}}>Investimento</p>
     <p style={{fontSize:30,fontWeight:800,margin:"3px 0"}}>{moneyBR(q.amount_cents)}</p>
     <p style={{margin:"4px 0"}}>Prazo de entrega: {q.delivery_business_days} dia(s) útil(eis), conforme condições da Proposta.</p>
     <p style={{margin:"4px 0"}}>Proposta válida até {fiscalProposalExpiresLabel(q.valid_until)} (horário de Brasília).</p>
    </div>
    {payment.state==="paid"?
     <div style={{marginTop:24}}><p style={{fontWeight:700}}>Pagamento confirmado.</p>
      <a href="https://app.dianavoltolini.com.br/painel/analises-fiscais" style={{color:"#173c71"}}>Acessar e vincular meu atendimento</a>
     </div>:
     payment.state==="pending"?
     <div style={{marginTop:28,textAlign:"center"}}>
      {payment.url?<a href={payment.url} target="_blank" rel="noopener noreferrer"
       style={{display:"inline-block",maxWidth:"100%",background:"#c9a227",padding:"16px 25px",borderRadius:7,textDecoration:"none",fontWeight:800,color:"#102033"}}>
       Acessar cobrança {payment.method==="pix"?"PIX":"boleto"} no Bling
      </a>:<p style={{fontWeight:700}}>Cobrança registrada. O link ainda não está disponível. Consulte o e-mail de cobrança ou entre em contato.</p>}
      <p style={{fontSize:12,color:"#536372",marginTop:12}}>Esta cobrança já existe. Reabrir a Proposta não cria outra cobrança.</p>
     </div>:
     q.status==="sent"&&process.env.FISCAL_ANALYSIS_VARIABLE_CHECKOUT_ENABLED==="1"?
     <div style={{marginTop:28,textAlign:"center"}}>
      <a href={"https://dianavoltolini.com.br/checkout/ANALISE-FISCAL-INDIVIDUAL?proposta="+encodeURIComponent(token)}
        referrerPolicy="no-referrer" rel="noreferrer noopener"
        style={{display:"inline-block",maxWidth:"100%",background:"#c9a227",padding:"16px 25px",borderRadius:7,textDecoration:"none",fontWeight:800,color:"#102033"}}>
        Aprovar Proposta e contratar
      </a>
      <p style={{fontSize:12,color:"#536372",marginTop:12}}>A cobrança será gerada no checkout somente após confirmar seus dados. O valor corresponde a esta Proposta.</p>
     </div>:
     <p style={{fontSize:14,color:"#536372",marginTop:24}}>A contratação está indisponível no momento. Abrir esta Proposta não gera cobrança.</p>}
    <p style={{fontSize:13,color:"#536372"}}>Para informações sobre esta proposta, responda ao e-mail recebido.</p>
   </div>
   <footer style={{padding:"16px 32px",borderTop:"1px solid #d6e0e8",background:"#f9fafb",textAlign:"center",fontSize:12}}>
    Diana Voltolini · Especialista em Faturamento e Inteligência Fiscal
   </footer>
  </article>
 </main>;
}
