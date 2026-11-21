import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {moneyBR} from "@/lib/fiscal/analysis-quote-links";

export const metadata:Metadata={title:"Orçamento individual | Diana Voltolini",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
const hasExpired=(value:string)=>new Date(value).getTime()<=Date.now();
const dateBR=(date:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short"}).format(new Date(date));
export default async function FiscalAnalysisQuotePublic({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[a-f0-9]{64}$/.test(token))notFound();
 // A consulta é somente por hash do token: não registra nem pesquisa e-mail do cliente.
 const {quoteTokenHash}=await import("@/lib/fiscal/analysis-quote-links");
 const db=getSupabaseAdmin();
 const {data:q,error}=await db.from("fiscal_analysis_quotes")
  .select("id,request_id,version,scope,amount_cents,delivery_business_days,valid_until,status,token_expires_at")
  .eq("access_token_hash",quoteTokenHash(token)).eq("status","sent").maybeSingle();
 if(error||!q||!q.token_expires_at||
    hasExpired(q.valid_until)||hasExpired(q.token_expires_at))notFound();
 const {data:req}=await db.from("fiscal_analysis_requests").select("protocol").eq("id",q.request_id).maybeSingle();
 return <main style={{background:"#f4f6f8",minHeight:"100vh",padding:"40px 18px",color:"#102033"}}>
  <article style={{margin:"0 auto",maxWidth:740,background:"#fff",border:"1px solid #d6e0e8",borderRadius:12,overflow:"hidden"}}>
   <header style={{borderTop:"5px solid #c9a227",padding:"28px 32px",borderBottom:"1px solid #d6e0e8"}}>
    <p style={{fontSize:12,fontWeight:800,color:"#997100",letterSpacing:".1em"}}>DIANA VOLTOLINI · INTELIGÊNCIA FISCAL</p>
    <h1 style={{fontFamily:"Georgia,serif",fontSize:30,lineHeight:1.2}}>Seu orçamento de Análise Fiscal Individual</h1>
    <p style={{color:"#536372"}}>Solicitação {req?.protocol??"individual"} · Versão {q.version}</p>
   </header>
   <div style={{padding:"28px 32px",lineHeight:1.75}}>
    <h2 style={{fontSize:19}}>O que será analisado</h2>
    <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{q.scope}</p>
    <div style={{background:"#f7f9fb",padding:20,borderRadius:8,borderLeft:"3px solid #c9a227"}}>
     <p style={{margin:0,color:"#536372"}}>Investimento</p>
     <p style={{fontSize:30,fontWeight:800,margin:"3px 0"}}>{moneyBR(q.amount_cents)}</p>
     <p style={{margin:"4px 0"}}>Prazo de entrega: {q.delivery_business_days} dia(s) útil(eis), conforme condições do orçamento.</p>
     <p style={{margin:"4px 0"}}>Proposta válida até {dateBR(q.valid_until)}.</p>
    </div>
    <p style={{fontSize:14,color:"#536372",marginTop:24}}>A aprovação e o pagamento pela plataforma serão disponibilizados após a conclusão da integração do checkout. Nenhuma cobrança foi gerada ao visualizar esta proposta.</p>
    <p style={{fontSize:13,color:"#536372"}}>Para informações sobre esta proposta, responda ao e-mail recebido.</p>
   </div>
   <footer style={{padding:"16px 32px",borderTop:"1px solid #d6e0e8",background:"#f9fafb",textAlign:"center",fontSize:12}}>
    Diana Voltolini · Especialista em Faturamento e Inteligência Fiscal
   </footer>
  </article>
 </main>;
}
