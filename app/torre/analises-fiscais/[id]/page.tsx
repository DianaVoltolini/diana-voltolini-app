import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {saveFiscalAnalysisQuoteDraft} from "../actions";
import {sendFiscalAnalysisQuote} from "../send-quote-action";
import {sendFiscalAdminMessage,updateFiscalServiceStatus,uploadFiscalAdminFile} from "../service-actions";
import {quoteUrl,whatsappQuoteUrl} from "@/lib/fiscal/analysis-quote-links";
import css from "../../comercio-v2/commercial.module.css";
import {fiscalProposalExpiresLabel} from "@/lib/fiscal/proposal-validity";

export const metadata:Metadata={title:"Solicitação de Análise Fiscal | Torre"};
export const dynamic="force-dynamic";
type Props={params:Promise<{id:string}>;searchParams:Promise<{salvo?:string;erro?:string;email?:string;mensagem?:string;arquivo?:string;situacao?:string}>};
type Request={id:string;protocol:string|null;customer_name:string;customer_email:string;
 customer_phone:string;preferred_contact:string;question:string;status:string;paid_at:string|null;created_at:string};
type Quote={id:string;version:number;status:string;email_sent_at:string|null;amount_cents:number;scope:string;
 notes:string|null;delivery_business_days:number;valid_until:string;created_at:string};
type Message={id:string;sender_role:string;body:string;created_at:string};
type Attachment={id:string;original_filename:string;size_bytes:number;created_at:string;visible_to_client:boolean;uploaded_by_role:string;media_type:string};
type Event={id:string;event_type:string;created_at:string};
const money=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n/100);
const date=(v:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}).format(new Date(v));
const eventText:Record<string,string>={
 service_notification_sent:"Aviso por e-mail enviado",
 service_notification_failed:"Falha no aviso por e-mail",
 service_notification_not_configured:"Aviso por e-mail sem configuração",
 service_message_sent:"Mensagem registrada no atendimento",
 service_file_uploaded:"Documento anexado",
 service_status_changed:"Situação do atendimento atualizada"
};
const errors:Record<string,string>={
 validacao:"Confira os campos da Proposta e informe um valor positivo.",
 situacao:"A situação atual não permite modificar a Proposta.",
 proposta_ativa:"Já existe uma proposta enviada ou aceita para esta solicitação.",
 consulta_orcamentos:"Não foi possível consultar as versões anteriores.",
 salvar:"Não foi possível salvar a Proposta.",
 atualizar_situacao:"Proposta registrada, mas houve erro ao atualizar a situação. Confira o histórico.",
 conflito:"Outra versão foi salva. Atualize a tela e confira antes de continuar.",
 solicitacao:"Solicitação não encontrada.",
 envio_bloqueado:"O envio de Propostas está suspenso pela configuração administrativa.",
 envio_em_andamento:"Esta Proposta já está sendo enviada ou já foi enviada.",
 smtp:"Não foi possível enviar o e-mail. Consulte os registros de envio.",
 conferencia_envio:"O servidor aceitou o e-mail, mas houve falha ao registrar o envio. Verifique antes de reenviar.",
 prazo:"O prazo de validade da Proposta terminou.",
 email:"O e-mail do solicitante precisa ser corrigido.",
 nao_encontrado:"Proposta não encontrada.",
 mensagem:"Informe uma mensagem de até 10.000 caracteres.",
 salvar_mensagem:"Não foi possível registrar a mensagem.",
 arquivo:"O arquivo deve ter até 15 MB.",
 tipo:"Envie PDF, Word (.docx), JPG ou PNG.",
 storage:"Não foi possível armazenar o arquivo privado.",
 salvar_arquivo:"Não foi possível registrar o documento.",
 transicao:"Esta mudança de situação não é permitida.",
 entrega_obrigatoria:"Antes de concluir, disponibilize ao cliente ao menos um arquivo de entrega em PDF ou Word.",
 conferencia_entrega:"Não foi possível conferir os documentos da entrega. Tente novamente."
};
export default async function FiscalAnalysisDetail({params,searchParams}:Props){
 await requireAdmin();
 const {id}=await params;
 const query=await searchParams;
 if(!/^[a-f\d-]{36}$/i.test(id))notFound();
 const db=getSupabaseAdmin();
 const [req,qs,ms,files,history]=await Promise.all([
  db.from("fiscal_analysis_requests").select("id,protocol,customer_name,customer_email,customer_phone,preferred_contact,question,status,paid_at,created_at").eq("id",id).maybeSingle(),
  db.from("fiscal_analysis_quotes").select("id,version,status,email_sent_at,amount_cents,scope,notes,delivery_business_days,valid_until,created_at").eq("request_id",id).order("version",{ascending:false}).limit(30),
  db.from("fiscal_analysis_messages").select("id,sender_role,body,created_at").eq("request_id",id).order("created_at",{ascending:true}).limit(100),
  db.from("fiscal_analysis_attachments").select("id,original_filename,size_bytes,created_at,visible_to_client,uploaded_by_role,media_type").eq("request_id",id).order("created_at",{ascending:false}).limit(100),
  db.from("fiscal_analysis_events").select("id,event_type,created_at").eq("request_id",id).order("created_at",{ascending:false}).limit(30)
 ]);
 if(!req.data)notFound();
 const request=req.data as Request;
 const quoteList=(qs.data??[]) as Quote[];
 const latest=quoteList[0];
 const canDraft=["received","awaiting_details","quoting"].includes(request.status)&&
  !quoteList.some(q=>q.status==="sent"||q.status==="accepted");
 const inputDefault=latest?.status==="draft"?latest:undefined;
 const serviceEnabled=Boolean(request.paid_at&&["paid","in_progress","awaiting_client"].includes(request.status));
 const transitions:Record<string,{code:string;label:string}[]>={
  paid:[{code:"in_progress",label:"Iniciar análise"},{code:"awaiting_client",label:"Aguardar informações do cliente"}],
  in_progress:[{code:"awaiting_client",label:"Aguardar cliente"},{code:"completed",label:"Concluir atendimento"}],
  awaiting_client:[{code:"in_progress",label:"Retomar análise"},{code:"completed",label:"Concluir atendimento"}]
 };
 const deliveryReady=Boolean(!files.error&&(files.data as Attachment[]|null)?.some(file=>
  file.uploaded_by_role==="admin"&&file.visible_to_client&&[
   "application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ].includes(file.media_type)));
 const sendBlocked=process.env.FISCAL_ANALYSIS_QUOTE_EMAIL_ENABLED==="0";
 const tokenReady=Boolean(process.env.FISCAL_ANALYSIS_QUOTE_TOKEN_SECRET&&process.env.FISCAL_ANALYSIS_QUOTE_TOKEN_SECRET.length>=32);
 const smtpReady=Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS);
 const sendAvailable=!sendBlocked&&tokenReady&&smtpReady;
 const whatsapp=latest?.status==="sent"&&latest.email_sent_at&&request.preferred_contact==="whatsapp"
  ? whatsappQuoteUrl(request.customer_phone,request.customer_name,request.protocol??request.id.slice(0,8),quoteUrl(latest.id,latest.version))
  : null;
 return <main className={css.page}>
  <header className={css.header}>
   <div><p className={css.eyebrow}>TORRE DE CONTROLE · ANÁLISES FISCAIS</p>
    <h1 className={css.title}>Solicitação {request.protocol??request.id.slice(0,8)}</h1>
    <p className={css.subtitle}>Avalie a solicitação, prepare a Proposta individual e envie ao cliente para análise, sem gerar cobrança.</p>
   </div><Link href="/torre/analises-fiscais" className={css.secondary}>Voltar às solicitações</Link>
  </header>
  <div className={css.banner}><strong>Proposta e contratação são etapas separadas</strong>
   O envio por e-mail apenas disponibiliza a Proposta ao cliente. Nenhuma cobrança é gerada neste momento. A contratação financeira será iniciada somente quando o cliente aprovar e o checkout estiver habilitado.
  </div>
  {query.email==="aceito"&&<p className={css.message} role="status">Proposta aceita pelo servidor de e-mail. O WhatsApp, quando escolhido, pode ser enviado manualmente.</p>}
  {(query.mensagem==="1"||query.arquivo==="1"||query.situacao==="1")&&<p className={css.message} role="status">Operação registrada com sucesso.</p>}
  {query.salvo==="1"&&<p className={css.message} role="status">Rascunho salvo. Nenhum e-mail ou WhatsApp foi enviado.</p>}
  {query.erro&&<p className={css.error} role="alert">{errors[query.erro]??"Não foi possível concluir a ação."}</p>}
  <div className={css.grid}>
   <section className={css.section}>
    <h2>Dados da solicitação</h2>
    <p><strong>Cliente</strong><br/>{request.customer_name}</p>
    <p><strong>E-mail</strong><br/>{request.customer_email}</p>
    <p><strong>WhatsApp</strong><br/>{request.customer_phone}</p>
    <p><strong>Aviso solicitado</strong><br/>{request.preferred_contact==="whatsapp"?"E-mail obrigatório + WhatsApp manual":"E-mail obrigatório"}</p>
    <p><strong>Recebido em</strong><br/>{date(request.created_at)}</p>
    <p className={css.status}>Situação: {request.status.replaceAll("_"," ")}</p>
   </section>
   <section className={css.section}>
    <h2>Dúvida apresentada</h2>
    <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",lineHeight:1.7}}>{request.question}</p>
    <p className={css.note}>Os documentos são opcionais no envio inicial. Complementos poderão ser solicitados posteriormente.</p>
   </section>
  </div>
  <section className={css.section}>
   <h2>Preparar Proposta</h2>
   {!canDraft?<p className={css.note}>Esta solicitação não permite novos rascunhos no momento. Uma proposta enviada ou aceita não pode ter o valor alterado.</p>:
   <form action={saveFiscalAnalysisQuoteDraft} className={css.form}>
    <input type="hidden" name="request_id" value={request.id}/>
    <label>Escopo da análise<textarea name="scope" rows={5} minLength={10} maxLength={10000} required defaultValue={inputDefault?.scope??""} placeholder="Defina precisamente a operação e a questão que serão analisadas."/></label>
    <div className={css.formRowTriple}>
     <label>Valor (R$)<input name="amount" inputMode="decimal" placeholder="47,00" required defaultValue={inputDefault?String(inputDefault.amount_cents/100).replace(".",","):""}/></label>
     <label>Prazo (dias úteis)<input type="number" min="1" max="90" name="delivery_business_days" required defaultValue={inputDefault?.delivery_business_days??2}/></label>
     <div style={{display:"grid",alignContent:"center",gap:7}}><strong style={{fontSize:13,color:"#102033"}}>Validade da Proposta</strong><span className={css.note}>3 dias corridos (72 horas) a partir do envio</span></div>
    </div>
    <label>Observações (opcional)<textarea rows={3} name="notes" maxLength={3000} defaultValue={inputDefault?.notes??""} placeholder="Condições, limites ou documentos ainda necessários."/></label>
    <div className={css.actions}><button type="submit" className={css.button}>Salvar rascunho</button><span className={css.note}>Salvar não envia a proposta.</span></div>
   </form>}
  </section>
  <section className={css.section}><h2>Envio da proposta</h2>
   {!latest||latest.status!=="draft"?<p className={css.note}>Nenhum rascunho aguardando envio.</p>:
    !sendAvailable?<p className={css.note}>O envio depende apenas da configuração de e-mail e do link seguro da Proposta, não da integração financeira. {!tokenReady?"Configure o segredo do link de Proposta. ":null}{!smtpReady?"Confira as credenciais SMTP. ":null}{sendBlocked?"O envio foi suspenso pela configuração administrativa.":null}</p>:
    <form action={sendFiscalAnalysisQuote} className={css.form}>
     <input type="hidden" name="request_id" value={request.id}/>
     <input type="hidden" name="quote_id" value={latest.id}/>
     <p className={css.note}>A Proposta será enviada a {request.customer_email}, com validade de 3 dias corridos a partir do envio. O cliente poderá consultar o escopo, valor e prazo; nenhuma cobrança será gerada agora.</p>
     <button className={css.button} type="submit">Enviar Proposta por e-mail</button>
    </form>}
   {whatsapp&&<div className={css.actions}><a className={css.button} href={whatsapp} target="_blank" rel="noopener noreferrer">Enviar WhatsApp</a><span className={css.note}>Abre a mensagem pronta; confirme o envio no WhatsApp.</span></div>}
  </section>
  <section className={css.section}>
   <h2>Atendimento individual</h2>
   {serviceEnabled?<div className={css.form}>
    <p className={css.note}>O atendimento está vinculado ao pagamento confirmado. Mensagens e documentos são acessíveis somente às partes autorizadas.</p>
    <p className={css.note}>{deliveryReady?"Entrega preparada: há PDF ou Word compartilhado com o cliente.":"Entrega pendente: anexe PDF ou Word da análise e marque 'Disponibilizar este documento ao cliente' antes de concluir."}</p>
    <form action={updateFiscalServiceStatus} className={css.actions}>
     <input type="hidden" name="request_id" value={request.id}/>
     <label style={{flex:"1 1 250px"}}>Próxima situação
      <select name="status" required defaultValue="">
       <option value="" disabled>Selecione</option>
       {(transitions[request.status]??[]).map(option=><option key={option.code} value={option.code} disabled={option.code==="completed"&&!deliveryReady}>{option.label}{option.code==="completed"&&!deliveryReady?" — requer entrega":""}</option>)}
      </select>
     </label>
     <button type="submit" className={css.button}>Atualizar situação</button>
    </form>
    <form action={sendFiscalAdminMessage} className={css.form}>
     <input type="hidden" name="request_id" value={request.id}/>
     <label>Mensagem para o cliente<textarea name="body" rows={4} maxLength={10000} required placeholder="Solicite informações ou informe o andamento do atendimento."/></label>
     <div className={css.actions}><button type="submit" className={css.button}>Enviar mensagem</button></div>
    </form>
    <form action={uploadFiscalAdminFile} className={css.form} encType="multipart/form-data">
     <input type="hidden" name="request_id" value={request.id}/>
     <label>Anexar documento<input type="file" name="document" required accept=".pdf,.docx,.jpg,.jpeg,.png"/></label>
     <label style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" name="visible_to_client" value="yes" style={{width:"auto"}}/>Disponibilizar este documento ao cliente</label>
     <p className={css.note}>PDF, Word (.docx), JPG ou PNG; até 15 MB. Se não marcar, o arquivo fica restrito à administração.</p>
     <div className={css.actions}><button type="submit" className={css.button}>Salvar documento</button></div>
    </form>
   </div>:<p className={css.note}>A comunicação e a entrega são liberadas após o pagamento confirmado. A Proposta pode continuar sendo preparada normalmente.</p>}
  </section>
  <section className={css.section}><h2>Versões de Proposta</h2>
   {qs.error?<p className={css.error}>Não foi possível consultar as Propostas.</p>:
   quoteList.length===0?<p className={css.note}>Nenhuma Proposta preparada.</p>:
   <div className={css.tableScroll}><table className={css.table}><thead><tr><th>Versão</th><th>Valor</th><th>Prazo</th><th>Validade</th><th>Status</th></tr></thead>
   <tbody>{quoteList.map(q=><tr key={q.id}><td>v{q.version}</td><td>{money(q.amount_cents)}</td><td>{q.delivery_business_days} dias úteis</td><td>{q.status==="draft"?"3 dias após envio":fiscalProposalExpiresLabel(q.valid_until)}</td><td>{q.status==="draft"?"Rascunho":q.status}</td></tr>)}</tbody></table></div>}
  </section>
  <div className={css.grid}>
   <section className={css.section}><h2>Documentos anexados</h2>
    {files.error?<p className={css.error}>Não foi possível consultar os documentos.</p>:
     !files.data?.length?<p className={css.note}>Nenhum documento enviado. Isso não impede a avaliação inicial.</p>:
     <ul>{(files.data as Attachment[]).map(f=><li key={f.id}><a className={css.link} href={"/api/fiscal-analysis/files/"+f.id+"?admin=1"}>{f.original_filename}</a> — {Math.ceil(f.size_bytes/1024)} KB · {f.visible_to_client?"Visível ao cliente":"Uso interno"}</li>)}</ul>}
    <p className={css.note}>Os documentos são baixados por uma rota autenticada, com armazenamento privado.</p>
   </section>
   <section className={css.section}><h2>Histórico de mensagens</h2>
    {ms.error?<p className={css.error}>Não foi possível consultar as mensagens.</p>:
    !ms.data?.length?<p className={css.note}>Nenhuma mensagem registrada.</p>:
    <ul>{(ms.data as Message[]).map(m=><li key={m.id}><strong>{m.sender_role==="admin"?"Administração":"Cliente"} — {date(m.created_at)}</strong><p style={{whiteSpace:"pre-wrap"}}>{m.body}</p></li>)}</ul>}
    <p className={css.note}>Mensagens para o cliente são exibidas na área restrita do atendimento após confirmação do pagamento.</p>
   </section>
  </div>
  <section className={css.section}><h2>Histórico da solicitação</h2>
    {history.error?<p className={css.error}>Histórico indisponível.</p>:
     !history.data?.length?<p className={css.note}>Nenhum evento registrado ainda.</p>:
     <ul>{(history.data as Event[]).map(e=><li key={e.id}>{date(e.created_at)} · {e.event_type}</li>)}</ul>}
  </section>
 </main>;
}
