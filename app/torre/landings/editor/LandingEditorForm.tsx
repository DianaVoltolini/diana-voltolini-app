"use client";
import {useEffect,useRef,useState,useTransition} from "react";
import {saveLandingWithFeedback,type LandingSaveState} from "../actions";
import styles from "./page.module.css";

type Landing={
 id:string; campaign_name?:string|null; title?:string|null; slug?:string|null;
 eyebrow?:string|null;button_text?:string|null;summary?:string|null;
 benefit_1?:string|null;benefit_2?:string|null;benefit_3?:string|null;
 cover_path?:string|null;delivery_title?:string|null;file_path?:string|null;status?:string|null;
};
const DRAFT_PREFIX="dv-landing-editor-draft:";
const LIMIT_COVER=5*1024*1024,LIMIT_PDF=10*1024*1024;
function readDraft(form:HTMLFormElement){
  const fields:Record<string,string|boolean>={};
  for(const element of Array.from(form.elements)){
    if(!(element instanceof HTMLInputElement||element instanceof HTMLTextAreaElement||element instanceof HTMLSelectElement))continue;
    if(!element.name||element.type==="file"||element.type==="hidden")continue;
    fields[element.name]=element instanceof HTMLInputElement&&element.type==="checkbox"?element.checked:element.value;
  }
  return fields;
}
export default function LandingEditorForm({landing}:{landing:Landing|null}){
 const formRef=useRef<HTMLFormElement>(null);
 const storageKey=DRAFT_PREFIX+(landing?.id||"new");
 const [draftAvailable,setDraftAvailable]=useState(false);
 const [state,setState]=useState<LandingSaveState>({status:"idle",message:""});
 const [pending,startTransition]=useTransition();
 useEffect(()=>{
   // Leitura do rascunho após a montagem, fora do corpo síncrono do efeito.
   const frame=window.requestAnimationFrame(()=>{
     try{setDraftAvailable(Boolean(window.sessionStorage.getItem(storageKey)));}
     catch{setDraftAvailable(false);}
   });
   return ()=>window.cancelAnimationFrame(frame);
 },[storageKey]);
 function storeDraft(){
   if(!formRef.current)return;
   try{window.sessionStorage.setItem(storageKey,JSON.stringify(readDraft(formRef.current)));}catch{}
 }
 function restoreDraft(){
   if(!formRef.current)return;
   try{
     const saved=window.sessionStorage.getItem(storageKey);
     if(!saved)return;
     const draft=JSON.parse(saved) as Record<string,string|boolean>;
     const form=formRef.current;
     for(const [name,value] of Object.entries(draft)){
       const field=form.elements.namedItem(name);
       if(field instanceof HTMLInputElement){
         if(field.type==="checkbox")field.checked=value===true;
         else if(field.type!=="file")field.value=String(value);
       }else if(field instanceof HTMLTextAreaElement||field instanceof HTMLSelectElement)field.value=String(value);
     }
     setDraftAvailable(false);
     setState({status:"idle",message:"Rascunho recuperado. Confira os campos e salve novamente."});
   }catch{setState({status:"error",message:"Não foi possível recuperar o rascunho local."});}
 }
 function discardDraft(){
   try{window.sessionStorage.removeItem(storageKey);}catch{}
   setDraftAvailable(false);
 }
 function submit(e:React.FormEvent<HTMLFormElement>){
   e.preventDefault();
   const form=e.currentTarget;
   const cover=form.elements.namedItem("cover") as HTMLInputElement|null;
   const file=form.elements.namedItem("file") as HTMLInputElement|null;
   if(cover?.files?.[0]&&cover.files[0].size>LIMIT_COVER){
     setState({status:"error",message:"A capa ultrapassa 5 MB. Escolha uma imagem menor antes de salvar."});return;
   }
   if(file?.files?.[0]&&file.files[0].size>LIMIT_PDF){
     setState({status:"error",message:"O PDF ultrapassa 10 MB. Escolha um arquivo menor."});return;
   }
   const data=new FormData(form);
   storeDraft();
   setState({status:"idle",message:""});
   startTransition(async()=>{
     try{
       const result=await saveLandingWithFeedback({status:"idle",message:""},data);
       if(result.status==="success"){
         discardDraft();
         window.location.assign(result.nextStep==="email"&&result.savedId?
           "/torre/modelos-email/editor?landing_id="+encodeURIComponent(result.savedId):
           "/torre/landings?salvo=1");
       }else setState(result);
     }catch(err){
       console.error("[landing-editor] submission failed",err);
       setState({status:"error",message:"Não foi possível concluir o salvamento. Seu conteúdo continua no editor; tente novamente."});
     }
   });
 }
 return <>
 {draftAvailable&&<div className={styles.notice} role="status"><strong>Rascunho encontrado neste navegador.</strong> Você pode recuperar o conteúdo preenchido antes de continuar.
 <div className={styles.noticeActions}><button type="button" onClick={restoreDraft}>Recuperar rascunho</button><button type="button" onClick={discardDraft}>Descartar cópia</button></div></div>}
 {state.message&&<div role={state.status==="error"?"alert":"status"} className={state.status==="error"?styles.error:styles.notice}>{state.message}</div>}
 <form ref={formRef} className={styles.form} onSubmit={submit} onChange={storeDraft} onInput={storeDraft} encType="multipart/form-data">
 <input type="hidden" name="id" value={landing?.id??""}/>
 <div className={styles.grid}>
 <label>Nome da landing (primeira linha da página)<input name="campaign_name" maxLength={120} defaultValue={landing?.campaign_name??""} placeholder="E-book gratuito"/></label>
 <label>Título principal (segunda linha)<input required name="title" maxLength={160} defaultValue={landing?.title??""}/></label>
 <label>Endereço da campanha (slug)<input required name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={landing?.slug??""} placeholder="checklist-ibs-cbs"/></label>
 <label>Identificação superior<input name="eyebrow" maxLength={100} defaultValue={landing?.eyebrow??"MATERIAL GRATUITO"}/></label>
 <label>Texto do botão<input name="button_text" maxLength={100} defaultValue={landing?.button_text??"Receber material gratuito"}/></label>
 </div>
 <label>Descrição da oferta<textarea required name="summary" rows={4} maxLength={1000} defaultValue={landing?.summary??""}/></label>
 <div className={styles.grid}>
 <label>Benefício 1<input name="benefit_1" maxLength={160} defaultValue={landing?.benefit_1??""}/></label>
 <label>Benefício 2<input name="benefit_2" maxLength={160} defaultValue={landing?.benefit_2??""}/></label>
 <label>Benefício 3<input name="benefit_3" maxLength={160} defaultValue={landing?.benefit_3??""}/></label>
 </div>
 <label>Capa da landing (PNG, JPG, WebP ou PDF, máximo 5 MB)<input type="file" name="cover" accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"/>
 {landing?.cover_path&&<div className={styles.coverOptions}><label className={styles.coverCheckbox}><input type="checkbox" name="remove_cover" value="yes"/>Remover capa atual ao salvar</label><small>Ou selecione outro arquivo para substituir.</small></div>}</label>
 <label>Título da entrega<input name="delivery_title" maxLength={180} defaultValue={landing?.delivery_title??"Seu material está pronto"}/></label>
 <label>Material para download — PDF (máximo 10 MB)<input type="file" name="file" accept="application/pdf"/>{landing?.file_path&&<small>Arquivo já cadastrado. Envie outro apenas para substituir a entrega nas próximas inscrições.</small>}</label>
 <label>Status<select name="status" defaultValue={landing?.status??"draft"}><option value="draft">Rascunho</option><option value="published">Publicada</option></select></label>
 <button type="submit" disabled={pending}>{pending?"Salvando...":"Salvar landing"}</button>
 </form>
 </>;
}
