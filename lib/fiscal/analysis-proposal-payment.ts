import "server-only";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

export type FiscalProposalPayment={
 state:"none"|"pending"|"paid";
 method:"pix"|"boleto"|null;
 url:string|null;
 dueDate:string|null;
};
/**
 * Somente dados da cobrança vinculada à própria versão da Proposta.
 * Não cria pedido, recebível, PIX ou boleto ao visualizar o link.
 */
export async function getFiscalProposalPayment(quote:{
 id:string;request_id:string;order_id:string|null;amount_cents:number
}):Promise<FiscalProposalPayment>{
 const empty: FiscalProposalPayment={state:"none",method:null,url:null,dueDate:null};
 if(!quote.order_id)return empty;
 const db=getSupabaseAdmin();
 const {data:order,error:orderError}=await db.from("orders")
  .select("id,amount_cents,status,metadata,paid_at")
  .eq("id",quote.order_id).maybeSingle();
 if(orderError||!order)return empty;
 const metadata=order.metadata;
 if(!metadata||typeof metadata!=="object"||Array.isArray(metadata))return empty;
 const meta=metadata as Record<string,unknown>;
 if(meta.fiscal_analysis_quote_id!==quote.id||
    typeof meta.fiscal_analysis_quote_version!=="string"||
    order.amount_cents!==quote.amount_cents)return empty;
 if(order.paid_at||order.status==="paid")return {state:"paid",method:null,url:null,dueDate:null};
 if(order.status!=="pending")return empty;
 const {data:payments,error:paymentError}=await db.from("payments")
  .select("provider,payment_method,status,amount_cents,due_date,payment_url")
  .eq("order_id",quote.order_id).eq("provider","bling")
  .order("created_at",{ascending:false}).limit(10);
 if(paymentError)return empty;
 const matching=payments?.find(payment=>payment.status==="pending"&&
  payment.amount_cents===quote.amount_cents&&
  (payment.payment_method==="pix"||payment.payment_method==="boleto"));
 if(!matching)return empty;
 let url:string|null=null;
 if(typeof matching.payment_url==="string"){
  try{
   const parsed=new URL(matching.payment_url);
   if(parsed.protocol==="https:"&&!parsed.username&&!parsed.password)url=parsed.href;
  }catch{ /* URL não confiável: não exibir link */ }
 }
 return {state:"pending",method:matching.payment_method as "pix"|"boleto",
  url,dueDate:matching.due_date??null};
}
