"use server";

import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const back="/painel/analises-fiscais";
function fail(reason:string):never{redirect(back+"?acesso="+encodeURIComponent(reason));}

/**
 * O pedido público não possui user_id. A vinculação ocorre exclusivamente após
 * login com e-mail verificado e confirmação do pagamento via conciliação Bling.
 * O trigger activate_paid_fiscal_analysis_order é quem libera o atendimento.
 * Não vincular somente pelo e-mail sem autenticação.
 */
export async function claimPaidFiscalAnalyses(){
 const auth=await createClient();
 const {data:{user},error:authError}=await auth.auth.getUser();
 if(authError||!user)redirect("/login");
 const email=user.email?.trim().toLowerCase();
 if(!email||!user.email_confirmed_at)fail("confirmacao");
 const db=getSupabaseAdmin();
 const {data:orders,error:orderError}=await db.from("orders")
  .select("id,user_id,status,paid_at,customer_email,amount_cents,metadata")
  .eq("customer_email",email).eq("status","paid")
  .not("paid_at","is",null).is("user_id",null)
  .order("paid_at",{ascending:false}).limit(50);
 if(orderError)fail("consulta");
 let claimed=0;
 for(const order of orders??[]){
  const meta=order.metadata;
  if(!meta||typeof meta!=="object"||Array.isArray(meta))continue;
  const values=meta as Record<string,unknown>;
  const quoteId=values.fiscal_analysis_quote_id;
  const version=values.fiscal_analysis_quote_version;
  if(typeof quoteId!=="string"||!UUID.test(quoteId))continue;
  const {data:quote,error:quoteError}=await db.from("fiscal_analysis_quotes")
   .select("id,request_id,version,order_id,status,amount_cents")
   .eq("id",quoteId).eq("order_id",order.id).maybeSingle();
  if(quoteError||!quote||quote.status!=="accepted"||
     quote.amount_cents!==order.amount_cents||
     String(quote.version)!==String(version))continue;
  const {data:request,error:requestError}=await db.from("fiscal_analysis_requests")
   .select("id,user_id,customer_email,paid_at").eq("id",quote.request_id).maybeSingle();
  if(requestError||!request||request.user_id&&request.user_id!==user.id||
     request.customer_email.trim().toLowerCase()!==email)continue;
  const {data:updated,error:updateError}=await db.from("orders")
   .update({user_id:user.id,updated_at:new Date().toISOString()})
   .eq("id",order.id).eq("status","paid").not("paid_at","is",null)
   .is("user_id",null).select("id").maybeSingle();
  if(updateError){console.error("[fiscal-claim] linking failed",updateError.code);continue;}
  if(updated)claimed++;
 }
 revalidatePath(back);
 redirect(back+"?acesso="+(claimed?"vinculado":"nenhum"));
}
