"use client";
import {useState,useRef,useEffect,useActionState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {saveEmailTemplate,type EmailTemplateSaveState} from "./actions";
import {saveTransactionalEmail} from "./transacionais/actions";
import css from "./template-editor.module.css";
type Template={audience_kind?:string|null;id:string;name:string;subject:string;body:string;kind:string;active:boolean;description:string|null;interest:string|null;landing_id:string|null;cta_label:string|null;cta_url:string|null;auto_enabled?:boolean;auto_include_existing?:boolean};
type Landing={id:string;campaign_name:string|null;title:string;slug:string;status:string;button_text:string|null};
const landingFullName=(landing:Landing)=>[landing.campaign_name?.trim(),landing.title?.trim()].filter(Boolean).join(" ").trim()||"Landing sem título";
type CatalogCta={id:string;name:string;button_label:string;url:string;active:boolean};
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
export default function TemplateEditor({selected,interests,landings,ctas,defaultAudience="leads",defaultLandingId=""}:{selected:Template|null;interests:string[];landings:Landing[];ctas:CatalogCta[];defaultAudience?:string;defaultLandingId?:string}){
 const transactional=selected?.kind==="transactional";
 const setupLanding=!selected?landings.find(l=>l.id===defaultLandingId):undefined;
 const setupMode=Boolean(setupLanding);
 const router=useRouter();
 const [saveState,saveAction,savePending]=useActionState<EmailTemplateSaveState,FormData>(saveEmailTemplate,{status:"idle",message:""});
 useEffect(()=>{if(!selected&&saveState.status==="success"&&saveState.savedId)router.replace(setupMode&&defaultLandingId?"/torre/landings/editor?id="+encodeURIComponent(defaultLandingId):"/torre/modelos-email/editor?editar="+encodeURIComponent(saveState.savedId));},[saveState.status,saveState.savedId,selected,router,setupMode,defaultLandingId]);
 // O identificador do CTA (não apenas a URL) mantém nome, botão e destino juntos.
 // URLs podem existir tanto no catálogo quanto na lista de destinos tradicionais.
 const destinations=[
  ...links.map(([label,url])=>({key:"legacy:"+url,label,url,buttonLabel:"Acessar "+label,ctaId:"",landingId:""})),
  ...ctas.filter(c=>c.active).map(c=>({key:"cta:"+c.id,label:c.name.startsWith("CTA — ")?
   c.name:"CTA — "+c.name,url:c.url,buttonLabel:c.button_label,ctaId:c.id,landingId:""})),
  ...landings.filter(l=>l.status==="published"||l.id===defaultLandingId).map(l=>({key:"landing:"+l.id,label:"Landing — "+landingFullName(l),
   url:"https://dianavoltolini.com.br/l/"+l.slug,buttonLabel:(l.button_text||"Acessar material gratuito").slice(0,80),ctaId:"",landingId:l.id}))
 ];
 const savedUrl=selected?.cta_url??"";
 const matchingCta=ctas.find(c=>c.active&&c.url===savedUrl&&c.button_label===selected?.cta_label);
 const matchingLanding=destinations.find(d=>d.landingId&&d.url===savedUrl);
 const matchingLegacy=destinations.find(d=>!d.ctaId&&!d.landingId&&d.url===savedUrl);
 const startingKey=matchingCta?"cta:"+matchingCta.id:matchingLanding?.key??(setupLanding?"landing:"+setupLanding.id:matchingLegacy?.key??(savedUrl?"saved":"legacy:"+links[0][1]));
 if(savedUrl&&!matchingCta&&!matchingLanding&&!matchingLegacy)
  destinations.push({key:"saved",label:"Destino salvo neste modelo",url:savedUrl,buttonLabel:selected?.cta_label??"Acessar",ctaId:"",landingId:""});

 const [audience,setAudience]=useState(selected?.audience_kind??defaultAudience);
 const [name,setName]=useState(selected?.name??(setupLanding?"Entrega de material — "+landingFullName(setupLanding):""));
 const [description,setDescription]=useState(selected?.description??"");
 const [subject,setSubject]=useState(selected?.subject??(setupLanding?"Seu material está disponível — "+landingFullName(setupLanding):""));
 const [body,setBody]=useState((selected?.body??(setupLanding?
  "Olá, {{nome}}!\n\nSeu material gratuito está disponível.\n\nClique no botão para acessar o PDF solicitado.\n\nDiana Voltolini\nFaturamento e Inteligência Fiscal":starter)).replace(buttonPattern,"").trim());
 const [destinationKey,setDestinationKey]=useState(startingKey);
 const [url,setUrl]=useState(matchingCta?.url??selected?.cta_url??(setupLanding?"https://dianavoltolini.com.br/l/"+setupLanding.slug:links[0][1]));
 const [cta,setCta]=useState(matchingCta?.button_label??selected?.cta_label??(setupLanding?"Acessar material gratuito":"Conhecer o Blog Fiscal"));
 const selectedDestination=destinations.find(d=>d.key===destinationKey);
 const catalogCtaId=selectedDestination?.ctaId??"";
 const selectedLandingCtaId=selectedDestination?.landingId??"";
 const [interest,setInterest]=useState(selected?.interest??"");
 const [landing,setLanding]=useState(selected?.landing_id??defaultLandingId);
 const [active,setActive]=useState(selected?.active??setupMode);
 const [automatic,setAutomatic]=useState(selected?.auto_enabled??setupMode);
 const [existing,setExisting]=useState(selected?.auto_include_existing??false);
 const [source,setSource]=useState(selected?.kind==="welcome"?"home":"landing");
 const [sendType,setSendType]=useState<"automatic"|"manual">(selected?.auto_enabled||selected?.kind==="welcome"||setupMode?"automatic":"manual");
 const bodyRef=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{const el=bodyRef.current;if(el){el.style.height="auto";el.style.height=Math.max(320,el.scrollHeight)+"px"}},[body]);
 return <form action={transactional?saveTransactionalEmail:saveAction} className={css.grid}>
  <input type="hidden" name="id" value={selected?.id??""}/>
  <input type="hidden" name="audience_kind" value={audience}/>
  <input type="hidden" name="kind" value={source==="home"?"welcome":"manual"}/>
  <input type="hidden" name="active" value={active?"yes":"no"}/>
  <input type="hidden" name="auto_enabled" value={sendType==="automatic"&&automatic?"yes":"no"}/>
  <input type="hidden" name="landing_id" value={source==="landing"?landing:""}/>
  <input type="hidden" name="interest" value={source==="landing"?interest:""}/>
  <input type="hidden" name="auto_include_existing" value={existing?"yes":"no"}/>
  <section className={css.headFields}>
   <div className={css.sectionIntro}><span>01 · IDENTIFICAÇÃO</span><h2>{transactional?"Dados do e-mail":"Dados da campanha"}</h2><p>{transactional?"Modelo transacional vinculado aos eventos de cobrança ou pagamento.":"Identificação e público de referência para este modelo."}</p></div>
   <label>{transactional?"Nome do modelo":"Nome da Campanha"}<input name="name" required maxLength={120} value={name} onChange={e=>setName(e.target.value)} readOnly={transactional} placeholder="Ex.: Boas-vindas ao Conhecimento Fiscal"/></label>
   <label>Descrição<textarea name="description" maxLength={500} rows={2} value={description} onChange={e=>setDescription(e.target.value)} readOnly={transactional} placeholder="Finalidade desta campanha"/></label>
   {transactional?
    <div className={css.transactionalConfig}>
     <div className={css.sectionIntro}><span>02 · CONFIGURAÇÃO DO ENVIO</span><h2>Automático — evento de compra</h2><p>Este modelo é enviado somente pelo evento correspondente: cobrança gerada ou pagamento confirmado. Não utiliza listas de leads nem campanhas manuais.</p></div>
     <p style={{fontSize:13,color:"#607184"}}>A edição do texto não dispara e-mails e não modifica o checkout ou os pagamentos.</p>
    </div>:
    <>
     <div className={css.configIntro}><div className={css.sectionIntro}><span>02 · CONFIGURAÇÃO DO ENVIO</span><h2>Quando enviar esta mensagem?</h2><p>Defina o tipo de envio e o público que receberá esta comunicação.</p></div></div>
     <div className={css.deliveryFields}>
      <label>Tipo de envio
       <select value={audience==="buyers"?"manual":sendType} disabled={audience==="buyers"} onChange={e=>{const v=e.target.value as "manual"|"automatic";setSendType(v);setAutomatic(v==="automatic");}}>
        <option value="manual">Manual — escolher destinatários na Torre</option>
        <option value="automatic">Automático — após cadastro no site</option>
       </select>
      </label>
      <label>Público do modelo
       <select value={audience} onChange={e=>{setAudience(e.target.value);setAutomatic(false);setSendType("manual");}}>
        <option value="leads">Inscritos e leads</option>
        <option value="buyers">Clientes que compraram</option>
       </select>
      </label>
     </div>
     <div className={css.deliveryOptions}>
      {audience!=="buyers"&&sendType==="automatic"&&<>
       <label>Origem do cadastro
        <select value={source} onChange={e=>{setSource(e.target.value);setLanding("");setInterest("");}}>
         <option value="landing">Landing de material gratuito</option>
         <option value="home">Newsletter da página principal</option>
        </select>
       </label>
       {source==="landing"&&<div className={css.duo}>
        <label>Landing de origem
         <select value={landing} onChange={e=>setLanding(e.target.value)} required>
          <option value="">Selecione uma landing</option>
          {landings.map(l=><option key={l.id} value={l.id}>{landingFullName(l)}</option>)}
         </select>
        </label>
        <label>Interesse
         <select value={interest} onChange={e=>setInterest(e.target.value)}>
          <option value="">Todos os interesses</option>
          {interests.map(i=><option key={i} value={i}>{i}</option>)}
         </select>
        </label>
       </div>}
       <label className={css.checkbox}><input type="checkbox" checked={automatic} onChange={e=>setAutomatic(e.target.checked)}/> Ativar o envio automático</label>
       {automatic&&<label className={css.checkbox}><input type="checkbox" checked={existing} onChange={e=>setExisting(e.target.checked)}/> Incluir inscritos anteriores que ainda não receberam este modelo</label>}
       <p style={{fontSize:12,color:"#607184"}}>O cron verifica novos inscritos e respeita o consentimento e os descadastros. A ativação poderá iniciar envios reais.</p>
      </>}
      {audience==="buyers"&&<p style={{fontSize:13,color:"#607184"}}>Este modelo poderá ser usado em campanhas para clientes com compras identificadas e autorização de marketing. Envie campanhas pela página Clientes.</p>}
      {audience!=="buyers"&&sendType==="manual"&&<p style={{fontSize:13,color:"#607184"}}>O modelo poderá ser selecionado no fluxo de envio manual. O disparo manual continua sujeito à liberação do envio real na Torre; salvar o modelo não envia mensagens.</p>}
     </div>
    </>
   }
  </section>
  <section className={css.fields}>
   <div className={css.sectionIntro}><span>03 · MENSAGEM</span><h2>Conteúdo do e-mail</h2><p>Escreva a mensagem e defina o botão de acesso.</p></div>
   <label>Assunto<input name="subject" required maxLength={180} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Assunto exibido no e-mail"/></label>
   <label>Texto<textarea ref={bodyRef} name="body" required maxLength={14000} rows={13} value={body} onChange={e=>setBody(e.target.value)} placeholder="Escreva a mensagem"/></label>
   {!transactional&&<div className={css.cta}>
    <strong>CTA — Botão de acesso</strong>
    <div className={css.duo}>
     <input type="hidden" name="cta_id" value={catalogCtaId}/>
     <input type="hidden" name="cta_landing_id" value={selectedLandingCtaId}/>
     <input type="hidden" name="cta_url" value={url}/>
     <label>Destino<select value={destinationKey} onChange={e=>{
      const chosen=destinations.find(d=>d.key===e.target.value);
      if(!chosen)return;
      setDestinationKey(chosen.key);
      setUrl(chosen.url);
      setCta(chosen.buttonLabel);
     }}>{destinations.map(d=><option key={d.key} value={d.key}>{d.label}</option>)}</select></label>
     <label>Texto do botão<input name="cta_label" required maxLength={80} value={cta}
       readOnly={Boolean(catalogCtaId)} onChange={e=>setCta(e.target.value)}/>
       {catalogCtaId&&<small>Texto definido no cadastro do CTA. Para alterá-lo, edite o CTA na Torre.</small>}
       {selectedLandingCtaId&&<small>Personalize o texto deste botão apenas para o e-mail. O botão da landing e o link individual de download não serão alterados.</small>}
     </label>
    </div>
   </div>}
   {transactional?<p style={{fontSize:13,color:"#607184"}}>O link de cobrança e o link de acesso são incluídos pelo sistema conforme o produto. Variáveis disponíveis: {"{{produto}}"}, {"{{nome}}"}, {"{{valor}}"}, {"{{forma_pagamento}}"} e {"{{situacao_encontro}}"}.</p>:<label className={css.checkbox}><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Modelo disponível para seleção</label>}
   {!transactional&&saveState.status!=="idle"&&<p role={saveState.status==="error"?"alert":"status"} aria-live="polite" style={{border:"1px solid "+(saveState.status==="error"?"#e7b6b6":"#b4d7c3"),background:saveState.status==="error"?"#fff7f7":"#f1faf4",color:saveState.status==="error"?"#9f2424":"#17613a",borderRadius:8,padding:"12px 14px",lineHeight:1.5}}>{saveState.message}</p>}
   <div className={css.buttons}><button type="submit" disabled={savePending}>{savePending?"Salvando...":"Salvar modelo"}</button>{(landing&&source==="landing")&&<Link href={"/torre/landings/editor?id="+encodeURIComponent(landing)} className={css.backButton}>Voltar à landing para publicar</Link>}<Link href="/torre/modelos-email" className={css.backButton}>Voltar</Link></div>
  </section>
  <aside className={css.previewPanel}>
   <div className={css.previewHeader}><span className={css.previewTitle}>04 · VISUALIZAÇÃO</span><p>O resultado aparece ao lado enquanto você escreve.</p></div>
   <div className={css.mail}>
    <header><img src="/brand/logo-light.png" alt="Diana Voltolini"/></header>
    <div className={css.mailBody}>
     <h2>{(subject||"Assunto do e-mail").replaceAll("{{nome}}","Diana")}</h2>
     <div className={css.message}>{(body||"Sua mensagem aparecerá aqui.").replaceAll("{{nome}}","Cliente Teste").replaceAll("{{produto}}","Produto de Teste").replaceAll("{{valor}}","R$ 29,90").replaceAll("{{forma_pagamento}}","PIX").replaceAll("{{situacao_encontro}}","Sua inscrição no encontro está confirmada.")}</div>
     {transactional?<div className={css.ctaCenter}><span className={css.mailButton}>{selected?.id==="eb0c0000-0000-4000-8000-000000000001"||selected?.id==="eb0c0000-0000-4000-8000-000000000011"?"Ver cobrança":"Acessar minha compra"}</span></div>:cta.trim()&&<div className={css.ctaCenter}><a href={url} target="_blank" rel="noopener noreferrer" className={css.mailButton}>{cta}</a></div>}
    </div>
    <footer><strong>Diana Voltolini</strong><p>Especialista em Faturamento e Inteligência Fiscal</p><p>{transactional?"Esta é uma comunicação referente à sua compra.":audience==="buyers"?"Você recebe esta campanha porque autorizou comunicações comerciais. Se não desejar receber novas campanhas, poderá cancelar sua inscrição.":(source==="landing"&&sendType==="automatic" ? "Este e-mail confirma a solicitação do material gratuito. O acesso será enviado após o cadastro." : "Você está recebendo este e-mail por ter autorizado nossas comunicações. Se não desejar continuar recebendo a Newsletter Fiscal, poderá cancelar sua inscrição pelo link de descadastro.")}</p>{!transactional&&<span>{audience==="buyers"?"O link individual de descadastro será incluído na campanha enviada ao cliente.":(source==="landing"&&sendType==="automatic" ? "Material gratuito solicitado — comunicação de entrega, sem descadastro de newsletter." : "Cancelar inscrição — o link individual será incluído no e-mail enviado ao assinante.")}</span>}</footer>
   </div>
  </aside>
 </form>;
}
