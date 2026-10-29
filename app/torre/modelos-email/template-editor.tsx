"use client";
import {useState,useRef,useEffect} from "react";
import Link from "next/link";
import {saveEmailTemplate} from "./actions";
import css from "./template-editor.module.css";
type Template={id:string;name:string;subject:string;body:string;kind:string;active:boolean;description:string|null;interest:string|null;landing_id:string|null;cta_label:string|null;cta_url:string|null};
type Landing={id:string;title:string};
const links=[
 ["Blog Fiscal","https://dianavoltolini.com.br/blog"],
 ["E-book IBS e CBS na Prática","https://dianavoltolini.com.br/ibs-cbs-na-pratica"],
 ["Diagnóstico Expresso IBS/CBS","https://dianavoltolini.com.br/diagnostico-ibs-cbs"],
 ["Fiscal na Prática","https://dianavoltolini.com.br/fiscal-na-pratica"],
 ["Produtos e serviços","https://dianavoltolini.com.br/produtos"],
 ["Site principal","https://dianavoltolini.com.br"]
];
const starter="Olá, {{nome}}!\n\nQue bom ter você por aqui!\n\nMeu objetivo é ajudar profissionais e empresas a compreender as mudanças fiscais e aplicá-las com mais segurança na rotina.\n\nObrigada pelo interesse!\nDiana Voltolini";
const buttonPattern=/\[BOTAO:\s*([^\]\n|]+?)\s*\|\s*(https:\/\/[^\]\s]+)\]/g;
export default function TemplateEditor({selected,interests,landings}:{selected:Template|null;interests:string[];landings:Landing[]}){
 const [name,setName]=useState(selected?.name??"");
 const [description,setDescription]=useState(selected?.description??"");
 const [subject,setSubject]=useState(selected?.subject??"");
 const [body,setBody]=useState((selected?.body??starter).replace(buttonPattern,"").trim());
 const [url,setUrl]=useState(selected?.cta_url??links[0][1]);
 const [cta,setCta]=useState(selected?.cta_label??"Conhecer o Blog Fiscal");
 const [interest,setInterest]=useState(selected?.interest??"");
 const [landing,setLanding]=useState(selected?.landing_id??"");
 const [active,setActive]=useState(selected?.active??false);
 const bodyRef=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{const el=bodyRef.current;if(el){el.style.height="auto";el.style.height=Math.max(320,el.scrollHeight)+"px"}},[body]);
 return <form action={saveEmailTemplate} className={css.grid}>
  <input type="hidden" name="id" value={selected?.id??""}/>
  <input type="hidden" name="kind" value={selected?.kind??"manual"}/>
  <input type="hidden" name="active" value={active?"yes":"no"}/>
  <section className={css.headFields}>
   <div className={css.sectionIntro}><span>01 · IDENTIFICAÇÃO</span><h2>Dados da campanha</h2><p>Identificação e público de referência para este modelo.</p></div>
   <label>Nome da Campanha<input name="name" required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Boas-vindas ao Conhecimento Fiscal"/></label>
   <label>Descrição<textarea name="description" maxLength={500} rows={2} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Finalidade desta campanha"/></label>
   <div className={css.duo}>
    <label>Interesse<select name="interest" value={interest} onChange={e=>setInterest(e.target.value)}><option value="">Todos os interesses</option>{interests.map(i=><option key={i} value={i}>{i}</option>)}</select></label>
    <label>Landing de origem<select name="landing_id" value={landing} onChange={e=>setLanding(e.target.value)}><option value="">Todas as landings</option>{landings.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
   </div>
  </section>
  <section className={css.fields}>
   <div className={css.sectionIntro}><span>02 · MENSAGEM</span><h2>Conteúdo do e-mail</h2><p>Escreva a mensagem e defina o botão de acesso.</p></div>
   <label>Assunto<input name="subject" required maxLength={180} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Assunto exibido no e-mail"/></label>
   <label>Texto<textarea ref={bodyRef} name="body" required maxLength={14000} rows={13} value={body} onChange={e=>setBody(e.target.value)} placeholder="Escreva a mensagem"/></label>
   <div className={css.cta}>
    <strong>CTA — Botão de acesso</strong>
    <div className={css.duo}>
     <label>Destino<select name="cta_url" value={url} onChange={e=>{setUrl(e.target.value);setCta("Acessar "+(links.find(x=>x[1]===e.target.value)?.[0]??"site"));}}>{links.map(x=><option key={x[1]} value={x[1]}>{x[0]}</option>)}</select></label>
     <label>Texto do botão<input name="cta_label" required maxLength={80} value={cta} onChange={e=>setCta(e.target.value)}/></label>
    </div>
   </div>
   <label className={css.checkbox}><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Modelo disponível para seleção</label>
   <div className={css.buttons}><button type="submit">Salvar modelo</button><Link href="/torre/modelos-email" className={css.backButton}>Voltar</Link></div>
  </section>
  <aside className={css.previewPanel}>
   <div className={css.previewHeader}><span className={css.previewTitle}>03 · VISUALIZAÇÃO AUTOMÁTICA</span><p>O resultado aparece ao lado enquanto você escreve.</p></div>
   <div className={css.mail}>
    <header><img src="/brand/logo-light.png" alt="Diana Voltolini"/></header>
    <div className={css.mailBody}>
     <h2>{(subject||"Assunto do e-mail").replaceAll("{{nome}}","Diana")}</h2>
     <div className={css.message}>{(body||"Sua mensagem aparecerá aqui.").replaceAll("{{nome}}","Diana")}</div>
     {cta.trim()&&<div className={css.ctaCenter}><a href={url} target="_blank" rel="noopener noreferrer" className={css.mailButton}>{cta}</a></div>}
    </div>
    <footer><strong>Diana Voltolini</strong><p>Especialista em Faturamento e Inteligência Fiscal</p><p>Você está recebendo este e-mail por ter autorizado nossas comunicações. Se não desejar continuar recebendo a Newsletter Fiscal, poderá cancelar sua inscrição pelo link de descadastro.</p><span>Cancelar inscrição (link disponível na próxima etapa)</span></footer>
   </div>
  </aside>
 </form>;
}
