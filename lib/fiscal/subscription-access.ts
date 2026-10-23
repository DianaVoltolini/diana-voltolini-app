import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Access = {allowed:boolean; grace:boolean; paidUntil:string|null; cancellationRequested:boolean; subscriptionId:string|null};
const dateBR=(d:Date)=>{const p=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d);
 const m=Object.fromEntries(p.map(x=>[x.type,x.value]));return `${m.year}-${m.month}-${m.day}`;};
const addDays=(iso:string,n:number)=>{const d=new Date(iso+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export async function getFiscalAccess(userId:string):Promise<Access>{
 const db=getSupabaseAdmin();
 const {data:subscriptions,error}=await db.from("fiscal_subscriptions")
  .select("id,status,paid_until,renewal_enabled,cancellation_requested_at")
  .eq("user_id",userId).in("status",["active","canceled","past_due"])
  .order("created_at",{ascending:false}).limit(20);
 if(error)throw new Error("Falha ao verificar assinatura");
 const now=new Date(),today=dateBR(now);
 for(const sub of subscriptions??[]){
  const cancellationRequested=Boolean(sub.cancellation_requested_at)||sub.renewal_enabled===false||sub.status==="canceled";
  if(sub.paid_until && new Date(sub.paid_until)>now)
   return {allowed:true,grace:false,paidUntil:sub.paid_until,cancellationRequested,subscriptionId:sub.id};
  if(cancellationRequested||sub.status==="canceled"||!sub.paid_until)continue;
  const {data:invoices,error:invoiceError}=await db.from("fiscal_subscription_invoices")
    .select("due_date,status").eq("subscription_id",sub.id).eq("status","pending")
    .lte("due_date",today).order("due_date",{ascending:false}).limit(1);
  if(invoiceError)throw new Error("Falha ao verificar vencimento");
  const due=invoices?.[0]?.due_date;
  if(due && today<=addDays(due,3) && dateBR(new Date(sub.paid_until))>=due)
   return {allowed:true,grace:true,paidUntil:sub.paid_until,cancellationRequested:false,subscriptionId:sub.id};
 }
 return {allowed:false,grace:false,paidUntil:null,cancellationRequested:false,subscriptionId:null};
}
