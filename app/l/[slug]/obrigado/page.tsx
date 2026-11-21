import {notFound} from "next/navigation";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";

export const dynamic="force-dynamic";
export default async function Thanks({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{token?:string}>}){
 const {slug}=await params,{token}=await searchParams;
 if(!token||!/^[0-9a-f-]{36}$/i.test(token))notFound();
 const db=getSupabaseAdmin();
 const {data:landing}=await db.from("marketing_landings").select("id,title,delivery_title,file_path,cover_path").eq("slug",slug).eq("status","published").maybeSingle();
 if(!landing?.file_path)notFound();
 const {data:lead}=await db.from("marketing_leads").select("id,newsletter_opt_in").eq("landing_id",landing.id).eq("delivery_token",token).maybeSingle();
 if(!lead)notFound();
 const {data:signed,error}=await db.storage.from("marketing-deliveries").createSignedUrl(landing.file_path,600);
 if(error||!signed?.signedUrl)throw new Error("Não foi possível disponibilizar o material.");
 const {data:cover}=landing.cover_path?await db.storage.from("marketing-deliveries").createSignedUrl(landing.cover_path,600):{data:null};
 return <main className={styles.page}>
  <section className={styles.card}>
   <p className={styles.kicker}>MATERIAL GRATUITO DISPONÍVEL</p>
   <h1>{landing.delivery_title}</h1>
   {cover?.signedUrl&&<div className={styles.cover}>{landing.cover_path?.toLowerCase().endsWith(".pdf")?
    <iframe title="Capa do material em PDF" src={cover.signedUrl+"#page=1&toolbar=0&navpanes=0&scrollbar=0"} loading="lazy"/>:
    <Image src={cover.signedUrl} alt={"Capa: "+landing.title} width={280} height={360} unoptimized/>}</div>}
   <p>Obrigada pelo seu interesse! Espero que este material ajude você a compreender melhor as mudanças fiscais e aplicá-las na sua rotina.</p>
   <p>Clique no botão abaixo para baixar seu material gratuito.</p>
   <a className={styles.download} href={signed.signedUrl} target="_blank" rel="noreferrer">Baixar meu material gratuito ↓</a>
   {lead.newsletter_opt_in&&<p className={styles.newsletter}>Seu e-mail também foi incluído na lista de inscritos da Newsletter Fiscal Diana Voltolini. Você poderá cancelar sua inscrição quando os envios começarem.</p>}
   <p className={styles.note}>O link de download é válido por 10 minutos. Se expirar, volte à página do material e informe novamente seu e-mail.</p>
   <Link className={styles.home} href="https://dianavoltolini.com.br">Visitar o site Diana Voltolini</Link>
  </section>
 </main>;
}
