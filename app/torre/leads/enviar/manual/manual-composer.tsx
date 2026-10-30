"use client";
// app/torre/leads/enviar/manual/manual-composer.tsx
import {useActionState,useMemo,useState} from "react";
import Link from "next/link";
import {manualSendAction,initialManualState} from "./manual-actions";
import styles from "./manual.module.css";
type Template={id:string;name:string;subject:string;body:string;interest:string|null;landing_id:string|null;cta_url:string|null;cta_label:string|null};
type Landing={id:string;title:string};
export default function ManualComposer({models,interests,landings,sendId}:{models:Template[];interests:string[];landings:Landing[];sendId:string}){
 const [id,setId]=useState(models[0]?.id??"");
 const model=models.find(x=>x.id===id);
 const [interest,setInterest]=useState("");
 const [landing,setLanding]=useState("");
 const [description,setDescription]=useState("");
 const [confirmed,setConfirmed]=useState(false);
 const [state,action,pending]=useActionState(manualSendAction,initialManualState);
 const [currentKey,setCurrentKey]=useState("");
 const key=[id,interest,landing,description].join("|");
 const ready=state.stage==="review"&&key===currentKey&&state.eligible>0;
 const subject=model?.subject??"";
 const cta=model?.cta_url&&model?.cta_label?{url:model.cta_url,label:model.cta_label}:null;
 const body=useMemo(()=>(model?.body??"").replace(/\[BOTAO:[^\]]+\]/g,"").replaceAll("{{nome}}","Diana"),[model]);
 return <div className={styles.stack}>
 <form action={action} className={styles.stack}>
  <input type="hidden" name="template_id" value={id}/>
  <input type="hidden" name="interest" value={interest}/>
  <input type="hidden" name="landing_id" value={landing}/>
  <input type="hidden" name="send_id" value={sendId}/>
  <section className={styles.card}>
   <div className={styles.section}><h2>Nova campanha de e-mail</h2><p>Selecione um modelo, descreva a campanha e escolha os destinatários.</p></div>
   <label>Descrição da campanha<input name="description" required maxLength={300} value={description} onChange={e=>{setDescription(e.target.value);setConfirmed(false)}} placeholder="Ex.: Novidades fiscais de novembro" style={{padding:12,border:"1px solid #d4dee8",borderRadius:8,fontSize:14}}/></label>
   <label>Selecionar modelo<select value={id} onChange={e=>{setId(e.target.value);setConfirmed(false)}}>{models.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
   {model&&<Link href={"/torre/modelos-email/editor?editar="+encodeURIComponent(model.id)} className={styles.textLink}>Editar conteúdo do modelo</Link>}
  </section>
  {model?<><section className={styles.card}>
   <div className={styles.section}><h2>Definir o público</h2><p>Somente contatos que autorizaram a newsletter e não cancelaram a inscrição.</p></div>
   <div className={styles.duo}>
    <label>Interesse<select value={interest} onChange={e=>{setInterest(e.target.value);setConfirmed(false)}}><option value="">Todos os interesses</option>{interests.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
    <label>Landing de origem<select value={landing} onChange={e=>{setLanding(e.target.value);setConfirmed(false)}}><option value="">Todas as landings</option>{landings.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
   </div>
   <button type="submit" name="mode" value="review" disabled={pending||!description.trim()} onClick={()=>{setCurrentKey(key);setConfirmed(false)}} style={{justifySelf:"start",background:"#fff",border:"1px solid #c9a227",color:"#102033",padding:"11px 17px",borderRadius:7,fontWeight:750,cursor:"pointer"}}>{pending?"Consultando…":"Conferir destinatários"}</button>
   {ready&&<div className={styles.notice}><strong>{state.eligible} destinatário(s) elegível(is)</strong><p>Envio real, sem prefixo [TESTE]. Limite desta versão: 20 destinatários por campanha. Cada endereço recebe uma única mensagem nesta campanha.</p></div>}
   {state.stage==="review"&&state.eligible===0&&<p role="status">Nenhum contato elegível para os filtros selecionados.</p>}
  </section>
  {ready&&state.stage!=="done"&&<section className={styles.card}>
   <div className={styles.section}><h2>Confirmar envio</h2><p>Assunto: {subject}</p></div>
   <label style={{display:"flex",alignItems:"start",gap:10}}><input type="checkbox" name="confirm" value="yes" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Confirmo que desejo enviar esta campanha aos {state.eligible} destinatários elegíveis.</label>
   <button type="submit" name="mode" value="send" disabled={!confirmed||pending||state.eligible>20} style={{justifySelf:"start",background:"#c9a227",border:0,color:"#102033",padding:"13px 18px",borderRadius:7,fontWeight:800,cursor:"pointer"}}>{pending?"Enviando…":"Enviar e-mails agora"}</button>
  </section>}
  <section className={styles.card}>
   <div className={styles.section}><h2>Prévia do modelo</h2></div>
   <div className={styles.email}>
    <div className={styles.logo}><img src="/brand/logo-light.png" alt="Diana Voltolini"/></div>
    <div className={styles.emailBody}><h3>{subject.replaceAll("{{nome}}","Diana")}</h3><div className={styles.message}>{body}</div>{cta&&<div className={styles.center}><a href={cta.url} target="_blank" rel="noopener noreferrer">{cta.label}</a></div>}</div>
    <div className={styles.footer}><strong>Diana Voltolini</strong><p>Especialista em Faturamento e Inteligência Fiscal</p><p>O envio real inclui o link individual de descadastro.</p></div>
   </div>
  </section></>:<section className={styles.card}>Nenhum modelo disponível. <Link href="/torre/modelos-email/editor">Criar modelo</Link></section>}
  {state.message&&<div className={styles.notice} role="status">{state.message}{state.stage==="done"&&<p><strong>SMTP aceitou: {state.sent}</strong> · Falhas: {state.failed} · Total selecionado: {state.eligible}</p>}</div>}
 </form>
 </div>;
}
