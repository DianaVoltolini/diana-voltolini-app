import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import DetailsForm from "./details-form";
export const metadata:Metadata={title:"Meus Dados | Diana Voltolini",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
type Address={zipCode?:string;street?:string;number?:string;complement?:string;neighborhood?:string;city?:string;state?:string};
const money=(value:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value/100);
const date=(value:string|null)=>value?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(value)):"—";
const formatCpfCnpj=(v:string)=>{const x=v.replace(/\D/g,"");if(x.length===11)return x.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,"$1.$2.$3-$4");if(x.length===14)return x.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5");return v;};
const statusText=(v:string|null|undefined)=>({paid:"Pago",pending:"Pendente",awaiting_payment:"Aguardando pagamento",active:"Ativo",canceled:"Cancelado",cancelled:"Cancelado",failed:"Falhou",refunded:"Reembolsado",overdue:"Vencido",expired:"Expirado",partially_paid:"Parcialmente pago"} as Record<string,string>)[v??""]??(v||"Não informado");
const panel:React.CSSProperties={border:"1px solid #dfe6ed",background:"#fff",borderRadius:12,padding:"24px",display:"grid",gap:18};
export default async function MyDataPage(){
 const client=await createClient();const {data,error}=await client.auth.getClaims();
 const uid=typeof data?.claims?.sub==="string"?data.claims.sub:null;
 if(error||!uid)redirect("/login");
 const db=getSupabaseAdmin();
 const [{data:profile},{data:orders},{data:contact}]=await Promise.all([
  db.from("profiles").select("full_name").eq("id",uid).maybeSingle(),
  db.from("orders").select("id,product_id,customer_name,customer_email,customer_phone,customer_document,metadata,amount_cents,status,created_at,paid_at").eq("user_id",uid).order("created_at",{ascending:false}).limit(100),
  db.from("customer_contact_details").select("*").eq("user_id",uid).maybeSingle()
 ]);
 const order=orders?.[0];
 const meta=order?.metadata&&typeof order.metadata==="object"&&!Array.isArray(order.metadata)?order.metadata as Record<string,unknown>:{};
 const address=meta.address&&typeof meta.address==="object"&&!Array.isArray(meta.address)?meta.address as Address:{};
 const details={phone:contact?.phone??order?.customer_phone??"",zip_code:contact?.zip_code??address.zipCode??"",street:contact?.street??address.street??"",number:contact?.number??address.number??"",complement:contact?.complement??address.complement??"",neighborhood:contact?.neighborhood??address.neighborhood??"",city:contact?.city??address.city??"",state:contact?.state??address.state??""};
 const productIds=[...new Set((orders??[]).map(o=>o.product_id))];
 const {data:products}=productIds.length?await db.from("products").select("id,name").in("id",productIds):{data:[] as {id:string;name:string}[]};
 const names=new Map((products??[]).map(p=>[p.id,p.name]));
 const ids=(orders??[]).map(o=>o.id);
 const {data:payments}=ids.length?await db.from("payments").select("order_id,status,payment_method,due_date,paid_at,payment_url").in("order_id",ids):{data:[] as {order_id:string;status:string;payment_method:string|null;due_date:string|null;paid_at:string|null;payment_url:string|null}[]};
 const payMap=new Map((payments??[]).map(p=>[p.order_id,p]));
 return <main style={{padding:"28px clamp(16px,3vw,40px) 64px",display:"grid",gap:22,color:"#0d1b2a"}}>
  <header><p style={{fontSize:12,color:"#a47e16",fontWeight:800,letterSpacing:"0.12em"}}>ÁREA DO CLIENTE</p><h1 style={{fontFamily:"Georgia,serif",fontSize:"clamp(30px,3vw,42px)",margin:"6px 0"}}>Meus Dados</h1><p style={{color:"#607182"}}>Confira seu cadastro, histórico de compras e cobranças.</p></header>
  <section style={panel}><h2 style={{fontSize:21,margin:0}}>Identificação</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14}}>
   {[["Nome / razão social",order?.customer_name??profile?.full_name??"Não informado"],["CPF/CNPJ",order?.customer_document?formatCpfCnpj(order.customer_document):"Não informado"],["E-mail",typeof data?.claims?.email==="string"?data.claims.email:order?.customer_email??"Não informado"]].map(([label,value])=><div key={label} style={{display:"grid",gap:7}}><span style={{fontSize:13,color:"#66788a"}}>{label}</span><div style={{border:"1px solid #e3e8ef",background:"#f5f7fa",padding:"12px",borderRadius:7,overflowWrap:"anywhere"}}>{value}</div></div>)}</div><p style={{fontSize:12,color:"#66788a",margin:0}}>E-mail e CPF/CNPJ são protegidos e não podem ser alterados por esta página.</p></section>
  <section style={panel}><DetailsForm details={details}/></section>
  <section style={panel}><h2 style={{fontSize:21,margin:0}}>Minhas compras e extrato</h2>{orders?.length?<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,textAlign:"left"}}><thead><tr>{["Produto / serviço","Compra","Valor","Situação","Pagamento"].map(x=><th key={x} style={{padding:"12px",borderBottom:"1px solid #dfe6ed"}}>{x}</th>)}</tr></thead><tbody>{orders.map(o=>{const payment=payMap.get(o.id);return <tr key={o.id}>{[names.get(o.product_id)??"Produto contratado",date(o.created_at),money(o.amount_cents),statusText(o.status),payment?statusText(payment.status):"—"].map((value,i)=><td key={i} style={{padding:"13px 12px",borderBottom:"1px solid #edf1f4"}}>{value}</td>)}</tr>})}</tbody></table></div>:<p style={{color:"#66788a"}}>Nenhuma compra vinculada à sua conta até o momento.</p>}</section>

 </main>;
}
