import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {saveFiscalAnalysisQuoteDraft} from "../actions";
import css from "../../comercio-v2/commercial.module.css";

export const metadata:Metadata={title:"Solicitação de Análise Fiscal | Torre"};
export const dynamic="force-dynamic";
type Props={params:Promise<{id:string}>;searchParams:Promise<{salvo?:string;erro?:string}>};
type Request={id:string;protocol:string|null;customer_name:string;customer_email:string;
 customer_phone:string;preferred_contact:string;question:string;status:string;created_at:string};
type Quote={id:string;version:number;status:string;amount_cents:number;scope:string;
 notes:string|null;delivery_business_days:number;valid_until:string;created_at:string};
type Message={id:string;sender_role:string;body:string;created_at:string};
type Attachment={id:string;original_filename:string;size_bytes:number;created_at:string};
type Event={id:string;event_type:string;created_at:string};
const money=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n/100);
const date=(v:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}).format(new Date(v));
const dateInput=(v:string)=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(v));
const errors:Record<string,string>={
 validacao:"Confira os campos do orçamento e informe um valor positivo.",
 data_invalida:"Informe uma data de validade válida.",
 validade_expirada:"A validade deve ser posterior a hoje.",
 situacao:"A situação atual não permite modificar o orçamento.",
 proposta_ativa:"Já existe uma proposta enviada ou aceita para esta solicitação.",
 consulta_orcamentos:"Não foi possível consultar as versões anteriores.",
 salvar:"Não foi possível salvar o orçamento.",
 atualizar_situacao:"Orçamento registrado, mas houve erro ao atualizar a situação. Confira o histórico.",
 conflito:"Outra versão foi salva. Atualize a tela e confira antes de continuar.",
 solicitacao:"Solicitação não encontrada."
};
export default async function FiscalAnalysisDetail({params,searchParams}:Props){
 await requireAdmin();
 const {id}=await params;
 const query=await searchParams;
 if(!/^[a-f\d-]{36}$/i.test(id))notFound();
 const db=getSupabaseAdmin();
 const [req,qs,ms,files,history]=await Promise.all([
  db.from("fiscal_analysis_requests").select("id,protocol,customer_name,customer_email,customer_phone,preferred_contact,question,status,created_at").eq("id",id).maybeSingle(),
  db.from("fiscal_analysis_quotes").select("id,version,status,amount_cents,scope,notes,delivery_business_days,valid_until,created_at").eq("request_id",id).order("version",{ascending:false}).limit(30),
  db.from("fiscal_analysis_messages").select("id,sender_role,body,created_at").eq("request_id",id).order("created_at",{ascending:true}).limit(100),
  db.from("fiscal_analysis_attachments").select("id,original_filename,size_bytes,created_at").eq("request_id",id).order("created_at",{ascending:false}).limit(100),
  db.from("fiscal_analysis_events").select("id,event_type,created_at").eq("request_id",id).order("created_at",{ascending:false}).limit(30)
 ]);
 if(!req.data)notFound();
 const request=req.data as Request;
 const quoteList=(qs.data??[]) as Quote[];
 const latest=quoteList[0];
 const canDraft=["received","awaiting_details","quoting"].includes(request.status)&&
  !quoteList.some(q=>q.status==="sent"||q.status==="accepted");
 const inputDefault=latest?.status==="draft"?latest:undefined;
 return <main className={css.page}>
  <header className={css.header}>
   <div><p className={css.eyebrow}>TORRE DE CONTROLE · ANÁLISES FISCAIS</p>
    <h1 className={css.title}>Solicitação {request.protocol??request.id.slice(0,8)}</h1>
    <p className={css.subtitle}>Avalie o pedido e prepare um orçamento individual, sem enviar antes da integração comercial.</p>
   </div><Link href="/torre/analises-fiscais" className={css.secondary}>Voltar às solicitações</Link>
  </header>
  <div className={css.banner}><strong>Atendimento em implantação</strong>
   O orçamento pode ser salvo como rascunho. O envio por e-mail, a mensagem de WhatsApp e o checkout ainda não estão habilitados.
  </div>
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
   <h2>Preparar orçamento</h2>
   {!canDraft?<p className={css.note}>Esta solicitação não permite novos rascunhos no momento. Uma proposta enviada ou aceita não pode ter o valor alterado.</p>:
   <form action={saveFiscalAnalysisQuoteDraft} className={css.form}>
    <input type="hidden" name="request_id" value={request.id}/>
    <label>Escopo da análise<textarea name="scope" rows={5} minLength={10} maxLength={10000} required defaultValue={inputDefault?.scope??""} placeholder="Defina precisamente a operação e a questão que serão analisadas."/></label>
    <div className={css.formRowTriple}>
     <label>Valor (R$)<input name="amount" inputMode="decimal" placeholder="47,00" required defaultValue={inputDefault?String(inputDefault.amount_cents/100).replace(".",","):""}/></label>
     <label>Prazo (dias úteis)<input type="number" min="1" max="90" name="delivery_business_days" required defaultValue={inputDefault?.delivery_business_days??2}/></label>
     <label>Validade da proposta<input type="date" name="valid_until" required defaultValue={inputDefault?dateInput(inputDefault.valid_until):undefined}/></label>
    </div>
    <label>Observações (opcional)<textarea rows={3} name="notes" maxLength={3000} defaultValue={inputDefault?.notes??""} placeholder="Condições, limites ou documentos ainda necessários."/></label>
    <div className={css.actions}><button type="submit" className={css.button}>Salvar rascunho</button><span className={css.note}>Salvar não envia a proposta.</span></div>
   </form>}
  </section>
  <section className={css.section}><h2>Versões de orçamento</h2>
   {qs.error?<p className={css.error}>Não foi possível consultar os orçamentos.</p>:
   quoteList.length===0?<p className={css.note}>Nenhum orçamento preparado.</p>:
   <div className={css.tableScroll}><table className={css.table}><thead><tr><th>Versão</th><th>Valor</th><th>Prazo</th><th>Validade</th><th>Status</th></tr></thead>
   <tbody>{quoteList.map(q=><tr key={q.id}><td>v{q.version}</td><td>{money(q.amount_cents)}</td><td>{q.delivery_business_days} dias úteis</td><td>{dateInput(q.valid_until)}</td><td>{q.status==="draft"?"Rascunho":q.status}</td></tr>)}</tbody></table></div>}
  </section>
  <div className={css.grid}>
   <section className={css.section}><h2>Documentos anexados</h2>
    {files.error?<p className={css.error}>Não foi possível consultar os documentos.</p>:
     !files.data?.length?<p className={css.note}>Nenhum documento enviado. Isso não impede a avaliação inicial.</p>:
     <ul>{(files.data as Attachment[]).map(f=><li key={f.id}>{f.original_filename} — {Math.ceil(f.size_bytes/1024)} KB</li>)}</ul>}
    <p className={css.note}>A abertura segura dos arquivos será adicionada com o módulo de anexos privados.</p>
   </section>
   <section className={css.section}><h2>Histórico de mensagens</h2>
    {ms.error?<p className={css.error}>Não foi possível consultar as mensagens.</p>:
    !ms.data?.length?<p className={css.note}>Nenhuma mensagem registrada.</p>:
    <ul>{(ms.data as Message[]).map(m=><li key={m.id}><strong>{m.sender_role==="admin"?"Administração":"Cliente"} — {date(m.created_at)}</strong><p style={{whiteSpace:"pre-wrap"}}>{m.body}</p></li>)}</ul>}
    <p className={css.note}>A conversa será habilitada junto com as notificações e o acesso autenticado.</p>
   </section>
  </div>
  <section className={css.section}><h2>Histórico da solicitação</h2>
    {history.error?<p className={css.error}>Histórico indisponível.</p>:
     !history.data?.length?<p className={css.note}>Nenhum evento registrado ainda.</p>:
     <ul>{(history.data as Event[]).map(e=><li key={e.id}>{date(e.created_at)} · {e.event_type}</li>)}</ul>}
  </section>
 </main>;
}
