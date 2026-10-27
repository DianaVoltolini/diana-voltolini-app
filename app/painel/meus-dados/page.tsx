import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import DetailsForm from "./details-form";
import {getFiscalAccess} from "@/lib/fiscal/subscription-access";
import styles from "./meus-dados.module.css";
export const metadata:Metadata={title:"Meus Dados | Diana Voltolini",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
type Address={zipCode?:string;street?:string;number?:string;complement?:string;neighborhood?:string;city?:string;state?:string};
const money=(value:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value/100);
const date=(value:string|null)=>value?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(value)):"—";
const formatCpfCnpj=(v:string)=>{const x=v.replace(/\D/g,"");if(x.length===11)return x.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,"$1.$2.$3-$4");if(x.length===14)return x.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5");return v;};
const statusText=(v:string|null|undefined)=>({paid:"Pago",pending:"Pendente",awaiting_payment:"Aguardando pagamento",active:"Ativo",canceled:"Cancelado",cancelled:"Cancelado",failed:"Falhou",refunded:"Reembolsado",overdue:"Vencido",expired:"Expirado",partially_paid:"Parcialmente pago"} as Record<string,string>)[v??""]??(v||"Não informado");

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
 const [access,{data:subscriptions},{data:diagnostics}]=await Promise.all([
 getFiscalAccess(uid),db.from("fiscal_subscriptions").select("status,paid_until,renewal_enabled,cancellation_requested_at").eq("user_id",uid).order("created_at",{ascending:false}).limit(1),db.from("diagnostics").select("status").eq("user_id",uid).order("created_at",{ascending:false}).limit(1)]);
 const subscription=subscriptions?.[0];
 const subscriptionStatus=access.allowed?(access.cancellationRequested?"Assinatura cancelada":"Assinatura ativa"):subscription?.status==="canceled"||subscription?.renewal_enabled===false||Boolean(subscription?.cancellation_requested_at)?"Assinatura cancelada":"Assinatura pendente";
 const diagnosticStatus=diagnostics?.[0]?.status==="completed"||diagnostics?.[0]?.status==="concluded"||diagnostics?.[0]?.status==="delivered"?"Concluído":"Em andamento";
 const meta=order?.metadata&&typeof order.metadata==="object"&&!Array.isArray(order.metadata)?order.metadata as Record<string,unknown>:{};
 const address=meta.address&&typeof meta.address==="object"&&!Array.isArray(meta.address)?meta.address as Address:{};
 const details={phone:contact?.phone??order?.customer_phone??"",zip_code:contact?.zip_code??address.zipCode??"",street:contact?.street??address.street??"",number:contact?.number??address.number??"",complement:contact?.complement??address.complement??"",neighborhood:contact?.neighborhood??address.neighborhood??"",city:contact?.city??address.city??"",state:contact?.state??address.state??""};
 const productIds=[...new Set((orders??[]).map(o=>o.product_id))];
 const {data:products}=productIds.length?await db.from("products").select("id,name,code").in("id",productIds):{data:[] as {id:string;name:string;code:string}[]};
 const names=new Map((products??[]).map(p=>[p.id,p.name]));
 const codes=new Map((products??[]).map(p=>[p.id,p.code]));
 const purchased=Array.from(new Map((orders??[]).filter(o=>o.status==="paid").map(o=>[o.product_id,o])).values());
 const purchaseStatus=(id:string)=>{const code=(codes.get(id)??"").toUpperCase();if(code.includes("ASSINATURA")||code.includes("FISCAL-001"))return subscriptionStatus;if(code.includes("EBOOK")||code.includes("E-BOOK"))return "Disponível";if(code.includes("DIAGNOSTICO")||code.includes("DIAGNÓSTICO")||code==="DE001")return diagnosticStatus;return "Disponível";};
 return <main className={styles.page}><div className={styles.container}>
  <header className={styles.heading}><p>MINHA CONTA</p><h1>Meus Dados</h1><span>Consulte seu cadastro e os produtos que você adquiriu.</span></header>
  <section className={styles.panel}><h2 style={{fontSize:21,margin:0}}>Identificação</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14}}>
   {[["Nome / razão social",order?.customer_name??profile?.full_name??"Não informado"],["CPF/CNPJ",order?.customer_document?formatCpfCnpj(order.customer_document):"Não informado"],["E-mail",typeof data?.claims?.email==="string"?data.claims.email:order?.customer_email??"Não informado"]].map(([label,value])=><div key={label} style={{display:"grid",gap:7}}><span style={{fontSize:13,color:"#66788a"}}>{label}</span><div style={{border:"1px solid #e3e8ef",background:"#f5f7fa",padding:"12px",borderRadius:7,overflowWrap:"anywhere"}}>{value}</div></div>)}</div><p style={{fontSize:12,color:"#66788a",margin:0}}>E-mail e CPF/CNPJ são protegidos e não podem ser alterados por esta página.</p></section>
  <section className={styles.panel}><DetailsForm details={details}/></section>
  <section className={styles.panel}>
    <div className={styles.sectionHeader}><div><span>HISTÓRICO</span><h2>Minhas compras</h2></div><small>{purchased.length} {purchased.length===1?"produto adquirido":"produtos adquiridos"}</small></div>
    {purchased.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Produto / serviço</th><th>Compra</th><th>Valor</th><th>Status</th></tr></thead><tbody>
    {purchased.map(o=>{const status=purchaseStatus(o.product_id);return <tr key={o.id}><td><strong>{names.get(o.product_id)??"Produto contratado"}</strong></td><td>{date(o.created_at)}</td><td>{money(o.amount_cents)}</td><td><span className={status==="Assinatura pendente"||status==="Em andamento"?styles.statusPending:status==="Assinatura cancelada"?styles.statusCanceled:styles.statusActive}>{status}</span></td></tr>})}
    </tbody></table></div>:<p className={styles.empty}>Nenhuma compra confirmada vinculada à sua conta.</p>}
  </section>
 </div></main>;
}
