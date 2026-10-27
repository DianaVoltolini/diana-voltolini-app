import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {getFiscalAccess} from "@/lib/fiscal/subscription-access";
import styles from "../outros-produtos/page.module.css";
export const metadata:Metadata={title:"Minhas Compras | Diana Voltolini",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function Purchases(){const client=await createClient();const {data}=await client.auth.getClaims();const userId=typeof data?.claims?.sub==="string"?data.claims.sub:null;if(!userId)redirect("/login");
 const db=getSupabaseAdmin();
 const [{data:diagnostics},{data:orders},{data:products},{data:subscription},access]=await Promise.all([db.from("diagnostics").select("id,code,status").eq("user_id",userId).order("created_at",{ascending:false}).limit(1),db.from("orders").select("product_id").eq("user_id",userId).eq("status","paid").limit(200),db.from("products").select("id,code").eq("code","EBOOK-IBSCBS-001"),db.from("fiscal_subscriptions").select("id,status").eq("user_id",userId).limit(1),getFiscalAccess(userId)]);
 const ebook=products?.find(p=>p.code==="EBOOK-IBSCBS-001");
 const purchased=(id:string|undefined)=>Boolean(id&&orders?.some(o=>o.product_id===id));
 const dx=diagnostics?.[0];const items=[
 ...(dx?[{name:"Diagnóstico Expresso IBS/CBS",desc:"Consulte o andamento da análise, documentos e resultado.",status:dx.status==="completed"?"Concluído":"Em acompanhamento",href:"/painel/diagnosticos"}]:[]),
 ...(purchased(ebook?.id)?[{name:"IBS e CBS na Prática",desc:"Acesse ou baixe seu e-book digital.",status:"Disponível",href:"/painel/ebooks"}]:[]),
 ...(Boolean(subscription?.length)||access.allowed?[{name:"Fiscal na Prática",desc:"Consulte as entregas da assinatura e as informações de renovação.",status:access.allowed?"Assinatura ativa":"Acompanhar assinatura",href:"/painel/assinatura"}]:[])
 ];
 return <main className={styles.page} style={{background:"#f4f6f8"}}><div className={styles.container}><header className={styles.intro}><p>MINHAS COMPRAS</p><h1>Seus produtos e serviços</h1><span>Tudo o que você adquiriu, organizado para acessar e acompanhar.</span></header><section className={styles.grid}>{items.length?items.map(x=><article className={styles.card} key={x.name}><span>{x.status}</span><h2>{x.name}</h2><p>{x.desc}</p><Link className={styles.cta} href={x.href}>Acessar produto →</Link></article>):<div className={styles.card}><h2>Você ainda não possui produtos liberados</h2><p>Explore as soluções disponíveis e escolha por onde começar.</p><Link className={styles.cta} href="/painel/outros-produtos">Ver outros produtos →</Link></div>}</section></div></main>;
}
