import {notFound} from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {captureLead} from "@/app/torre/landings/actions";
import styles from "./page.module.css";
export const dynamic="force-dynamic";
export default async function Landing({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{erro?:string}>}){
 const {slug}=await params,{erro}=await searchParams;
 const db=getSupabaseAdmin();
 const {data}=await db.from("marketing_landings").select("title,summary,eyebrow,button_text,status,file_path,cover_path,benefit_1,benefit_2,benefit_3,button_helper").eq("slug",slug).eq("status","published").maybeSingle();
 if(!data?.file_path)notFound();
 const {data:cover}=data.cover_path?await db.storage.from("marketing-deliveries").createSignedUrl(data.cover_path,3600):{data:null};
 const benefits=[data.benefit_1,data.benefit_2,data.benefit_3].filter(Boolean) as string[];
 return <main className={styles.page}><header className={styles.header}><Link href="https://dianavoltolini.com.br">DIANA <span>VOLTOLINI</span></Link></header><div className={styles.layout}><section><p className={styles.eyebrow}>{data.eyebrow}</p><h1>{data.title}</h1><p className={styles.description}>{data.summary}</p>{benefits.length>0&&<ul className={styles.benefits}>{benefits.map((benefit:string)=><li key={benefit}><span aria-hidden="true">✓</span>{benefit}</li>)}</ul>}
 {cover?.signedUrl&&<div className={styles.cover}>{data.cover_path?.toLowerCase().endsWith(".pdf")?<iframe title="Capa do material em PDF" src={cover.signedUrl+"#page=1&toolbar=0&navpanes=0&scrollbar=0"} loading="lazy"/>:<Image src={cover.signedUrl} alt={"Capa: "+data.title} width={600} height={760} unoptimized/>}</div>}
 <p className={styles.signature}>Conhecimento fiscal aplicado à rotina de faturamento.</p></section><section className={styles.card}><h2>Receba seu material gratuito</h2><p>Informe seus dados e tenha acesso ao PDF logo após o cadastro.</p>{erro&&<p role="alert" className={styles.error}>Não foi possível concluir. Confira os dados e tente novamente.</p>}<form action={captureLead}>
 <input name="slug" type="hidden" value={slug}/>
 <label className={styles.honeypot} aria-hidden="true">Website<input type="text" name="website" tabIndex={-1} autoComplete="off"/></label>
 <label>Nome completo<input required name="name" maxLength={120} autoComplete="name"/></label>
 <label>E-mail<input required type="email" name="email" maxLength={254} autoComplete="email"/></label>
 <label>Qual é o seu maior desafio fiscal?<select required name="interest" defaultValue=""><option value="" disabled>Selecione uma opção</option><option>Reforma Tributária — IBS/CBS</option><option>NF-e e erros fiscais</option><option>Cálculos e regras tributárias</option><option>Parametrização de ERP</option><option>Acompanhar a legislação</option></select></label>
 <label className={styles.check}><input type="checkbox" name="newsletter" value="yes"/>Quero receber a Newsletter Fiscal com novos conteúdos e materiais gratuitos. (Opcional)</label>
 <label className={styles.check}><input required type="checkbox" name="privacy_acknowledged" value="yes"/>Estou ciente da <a href="https://dianavoltolini.com.br/politica-de-privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a> e do uso dos meus dados para entregar o material solicitado.</label>
 <button type="submit">{data.button_text} →</button><p className={styles.helper}>{data.button_helper||"Acesso após o cadastro · Sem cobrança"}</p></form></section></div></main>;
}
