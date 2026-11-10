import Link from "next/link";
import {randomUUID} from "node:crypto";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import BuyerCampaignComposer from "./composer";
import styles from "../../painel.module.css";
export const dynamic="force-dynamic";
export default async function BuyerCampaignPage({searchParams}:{searchParams:Promise<{produto?:string}>}){
 await requireAdmin();
 const params=await searchParams;
 const db=getSupabaseAdmin();
 const [products,templates]=await Promise.all([
  db.from("products").select("id,name").eq("active",true).order("name"),
  db.from("marketing_email_templates").select("id,name,subject,body,cta_url,cta_label").eq("kind","manual").eq("audience_kind","buyers").eq("active",true).order("name")
 ]);
 return <main className={styles.page}><section className={styles.content}><div className="container">
  <header className={styles.pageHeader}><p className={styles.eyebrow}>ADMINISTRAÇÃO · CLIENTES</p><h1>Campanhas para compradores</h1>
   <p>Selecione um produto, confira os compradores com autorização para comunicações e escolha um modelo para enviar.</p>
   <Link href="/torre/clientes">← Voltar aos clientes</Link>
  </header>
  {products.error||templates.error?<p role="alert">Não foi possível carregar produtos e modelos.</p>:
  <BuyerCampaignComposer products={products.data??[]} models={templates.data??[]} sendId={randomUUID()}
  initialProduct={(products.data??[]).some(p=>p.id===params.produto)?params.produto??"all":"all"}/>}
 </div></section></main>;
}
