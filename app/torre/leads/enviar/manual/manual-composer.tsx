"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import SendTestEmail from "../send-test-email";
import styles from "./manual.module.css";
type Template={id:string;name:string;subject:string;body:string;interest:string|null;landing_id:string|null;cta_url:string|null;cta_label:string|null};
type Landing={id:string;title:string};
export default function ManualComposer({models,interests,landings}:{models:Template[];interests:string[];landings:Landing[]}){
 const [id,setId]=useState(models[0]?.id??"");
 const model=models.find(x=>x.id===id);
 const [interestOverride,setInterestOverride]=useState<string|null>(null);
 const [landingOverride,setLandingOverride]=useState<string|null>(null);
 const interest=interestOverride??model?.interest??"";
 const landing=landingOverride??model?.landing_id??"";
 const subject=model?.subject??"";
 const body=model?.body??"";
 const cta=model?.cta_url&&model?.cta_label?{url:model.cta_url,label:model.cta_label}:null;
 const text=useMemo(()=>body.replace(/\[BOTAO:\s*[^\]]+\]/g,"").trim().replaceAll("{{nome}}","Diana"),[body]);
 return <div className={styles.stack}>
  <section className={styles.card}>
   <div className={styles.section}><span>01 · MODELO</span><h2>Selecione a mensagem</h2><p>Assunto, texto e CTA são definidos em Modelos de E-mail.</p></div>
   <label>Modelo ativo<select value={id} onChange={e=>{setId(e.target.value);setInterestOverride(null);setLandingOverride(null)}}>{models.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
   {model&&<Link href={"/torre/modelos-email/editor?editar="+encodeURIComponent(model.id)} className={styles.textLink}>Editar conteúdo do modelo</Link>}
  </section>
  {model?<><section className={styles.card}>
   <div className={styles.section}><span>02 · DESTINATÁRIOS</span><h2>Defina o público</h2><p>Os filtros partem das condições cadastradas no modelo.</p></div>
   <div className={styles.duo}><label>Interesse<select value={interest} onChange={e=>setInterestOverride(e.target.value)}><option value="">Todos os interesses</option>{interests.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
   <label>Landing de origem<select value={landing} onChange={e=>setLandingOverride(e.target.value)}><option value="">Todas as landings</option>{landings.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label></div>
   <div className={styles.notice}><strong>Envio para leads ainda bloqueado.</strong> Antes de habilitar o disparo, serão necessários descadastro funcional, deduplicação, fila de envio e cálculo seguro dos destinatários elegíveis.</div>
  </section>
  <section className={styles.card}>
   <div className={styles.section}><span>03 · CONFERÊNCIA</span><h2>Visualização do modelo</h2></div>
   <div className={styles.email}>
    <div className={styles.logo}><img src="/brand/logo-light.png" alt="Diana Voltolini"/></div>
    <div className={styles.emailBody}><h3>{subject.replaceAll("{{nome}}","Diana")}</h3><div className={styles.message}>{text}</div>{cta&&<div className={styles.center}><a href={cta.url} target="_blank" rel="noopener noreferrer">{cta.label}</a></div>}</div>
    <div className={styles.footer}><strong>Diana Voltolini</strong><p>Especialista em Faturamento e Inteligência Fiscal</p><p>O link de cancelamento da newsletter será habilitado antes dos envios a leads.</p></div>
   </div>
  </section>
  <section className={styles.card}>
   <div className={styles.section}><span>04 · TESTE</span><h2>Validar antes do disparo</h2><p>O teste individual funciona com a configuração SMTP já existente.</p></div>
   <input type="hidden" id="manual-test-subject" value={subject} readOnly/>
   <textarea id="manual-test-body" value={body+(cta?"\n\n[BOTAO: "+cta.label+" | "+cta.url+"]":"")} readOnly hidden/>
   <SendTestEmail subjectId="manual-test-subject" bodyId="manual-test-body"/>
  </section></>:<section className={styles.card}>Nenhum modelo ativo disponível. <Link href="/torre/modelos-email/editor">Criar modelo</Link></section>}
 </div>;
}
