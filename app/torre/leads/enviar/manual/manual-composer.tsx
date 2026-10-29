"use client";
import {useMemo,useState} from "react";
import {countManualRecipients,queueManualDispatch} from "./manual-actions";
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
 const [count,setCount]=useState<number|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [confirmation,setConfirmation]=useState(false);
 const interest=interestOverride??model?.interest??"";
 const landing=landingOverride??model?.landing_id??"";
 const subject=model?.subject??"";
 const body=model?.body??"";
 const cta=model?.cta_url&&model?.cta_label?{url:model.cta_url,label:model.cta_label}:null;
 const text=useMemo(()=>body.replace(/\[BOTAO:\s*[^\]]+\]/g,"").trim().replaceAll("{{nome}}","Diana"),[body]);
 return <div className={styles.stack}>
  <section className={styles.card}>
   <div className={styles.section}><span>01 · MODELO</span><h2>Selecione a mensagem</h2><p>Assunto, texto e CTA são definidos em Modelos de E-mail.</p></div>
   <label>Modelo ativo<select value={id} onChange={e=>{setId(e.target.value);setInterestOverride(null);setLandingOverride(null);setCount(null);setConfirmation(false);setMessage("")}}>{models.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
   {model&&<Link href={"/torre/modelos-email/editor?editar="+encodeURIComponent(model.id)} className={styles.textLink}>Editar conteúdo do modelo</Link>}
  </section>
  {model?<><section className={styles.card}>
   <div className={styles.section}><span>02 · DESTINATÁRIOS</span><h2>Defina o público</h2><p>Os filtros partem das condições cadastradas no modelo.</p></div>
   <div className={styles.duo}><label>Interesse<select value={interest} onChange={e=>{setInterestOverride(e.target.value);setCount(null);setConfirmation(false)}}><option value="">Todos os interesses</option>{interests.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
   <label>Landing de origem<select value={landing} onChange={e=>{setLandingOverride(e.target.value);setCount(null);setConfirmation(false)}}><option value="">Todas as landings</option>{landings.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label></div>
   <div className={styles.notice}><strong>Destinatários autorizados.</strong> Serão considerados somente cadastros com consentimento para newsletter, sem duplicações e sem e-mails já descadastrados.</div>
   <div style={{display:"grid",gap:12,justifyItems:"start"}}>
    <button type="button" disabled={busy} onClick={async()=>{setBusy(true);setMessage("");const result=await countManualRecipients(id,interest,landing);setCount(result.ok?result.count??null:null);setMessage(result.ok?"":result.message);setBusy(false)}} style={{padding:"12px 18px",border:"1px solid #c9a227",borderRadius:7,background:"#fff",fontWeight:700,cursor:"pointer"}}>Conferir destinatários</button>
    {count!==null&&<strong>{count} destinatário(s) elegível(is)</strong>}
    {count!==null&&count>0&&<label style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={confirmation} onChange={e=>setConfirmation(e.target.checked)}/> Confirmo a criação desta campanha para os {count} destinatários.</label>}
    <button type="button" disabled={busy||!confirmation||!count} onClick={async()=>{setBusy(true);setMessage("");const result=await queueManualDispatch(id,interest,landing,count??0);setMessage(result.message);setConfirmation(false);setCount(null);setBusy(false)}} style={{background:"#c9a227",border:0,borderRadius:7,padding:"13px 20px",color:"#102033",fontWeight:800,opacity:busy||!confirmation||!count?.5:1}}>Enviar campanha</button>
    <small style={{color:"#607184"}}>O botão cria uma fila controlada. O processamento SMTP em lotes será ativado depois da configuração do executor e do descadastro.</small>
    {message&&<p role="status" style={{color:"#405266"}}>{message}</p>}
   </div>
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
