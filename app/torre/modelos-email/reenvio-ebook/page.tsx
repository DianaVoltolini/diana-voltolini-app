// app/torre/modelos-email/reenvio-ebook/page.tsx
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import EbookResendForm, {type OrderOption} from "./resend-form";
import styles from "../../painel.module.css";

export const dynamic="force-dynamic";

export default async function ResendEbookEmailPage({searchParams}:{searchParams:Promise<{busca?:string}>}){
 await requireAdmin();
 const db=getSupabaseAdmin();
 const params=await searchParams;
 const search=(params.busca??"").trim().slice(0,100);
 const {data:product,error:productError}=await db.from("products")
  .select("id").eq("code","EBOOK-IBSCBS-001").maybeSingle();
 let orders:OrderOption[]=[];
 let loadError=Boolean(productError||!product);
 if(product){
  const base=()=>db.from("orders")
   .select("id,customer_name,customer_email,amount_cents,status,created_at")
   .eq("product_id",product.id)
   .order("created_at",{ascending:false}).limit(50);
  if(search){
   // Duas consultas com parametros tratados como valor, sem interpolar filtros PostgREST.
   const literal=search.replace(/[\\%_]/g,"\\$&");
   const [byName,byEmail]=await Promise.all([
    base().ilike("customer_name",`%${literal}%`),
    base().ilike("customer_email",`%${literal}%`)
   ]);
   loadError=Boolean(byName.error||byEmail.error);
   const unique=new Map<string,OrderOption>();
   for(const item of [...(byName.data??[]),...(byEmail.data??[])]){
    unique.set(item.id,item as OrderOption);
   }
   orders=[...unique.values()].sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,50);
  }else{
   const result=await base();
   loadError=Boolean(result.error);
   orders=(result.data??[]) as OrderOption[];
  }
 }
 return <main className={styles.page}><section className={styles.content}><div className="container">
  <header className={styles.pageHeader}>
   <div><p className={styles.eyebrow}>ADMINISTRAÇÃO · ATENDIMENTO DE COMPRAS</p>
    <h1>Pedidos e reenvio de e-mails</h1>
    <p>Encontre o comprador por nome ou e-mail, confira o pedido e reenvie a mensagem sem criar outra cobrança.</p></div>
   <Link href="/torre/modelos-email">Voltar aos modelos</Link>
  </header>
  <section className={styles.diagnosticsSection}>
   <form method="get" style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"end",marginBottom:20}}>
    <label style={{fontWeight:700,fontSize:13,flex:"1 1 280px"}}>Buscar cliente pelo nome ou e-mail
     <input name="busca" defaultValue={search} placeholder="Digite o nome ou e-mail" maxLength={100}
      style={{display:"block",marginTop:8,width:"100%",padding:12,border:"1px solid #cbd5e1",borderRadius:8,background:"#fff"}}/>
    </label>
    <button type="submit" style={{padding:"12px 18px",background:"#102033",color:"#fff",border:0,borderRadius:8,fontWeight:700}}>Buscar pedidos</button>
    {search&&<Link href="/torre/modelos-email/reenvio-ebook" style={{padding:"12px",color:"#102033"}}>Limpar</Link>}
   </form>
   {loadError?<p role="alert">Não foi possível consultar os pedidos. Verifique a conexão.</p>:
    <EbookResendForm orders={orders} search={search}/>}
  </section>
 </div></section></main>;
}
