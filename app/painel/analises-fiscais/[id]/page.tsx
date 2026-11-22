import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {getFiscalClientRequest} from "@/lib/fiscal/analysis-service";
import {sendFiscalClientMessage,uploadFiscalClientFile} from "@/app/torre/analises-fiscais/service-actions";
import css from "../../../torre/comercio-v2/commercial.module.css";
export const metadata:Metadata={title:"Meu atendimento fiscal | Diana Voltolini",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
const statusLabel:Record<string,string>={paid:"Pagamento confirmado",in_progress:"Em análise",awaiting_client:"Aguardando informações",completed:"Concluído",cancelled:"Cancelado"};
const date=(value:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}).format(new Date(value));
type Props={params:Promise<{id:string}>;searchParams:Promise<{erro?:string;mensagem?:string;arquivo?:string}>};
export default async function FiscalClientService({params,searchParams}:Props){
 const {id}=await params,{erro,mensagem,arquivo}=await searchParams;
 const found=await getFiscalClientRequest(id);
 if(!found)notFound();
 const db=getSupabaseAdmin();
 const [{data:messages,error:messageError},{data:files,error:fileError}]=await Promise.all([
  db.from("fiscal_analysis_messages").select("id,sender_role,body,created_at").eq("request_id",id).eq("visible_to_client",true).order("created_at",{ascending:true}).limit(200),
  db.from("fiscal_analysis_attachments").select("id,original_filename,size_bytes,created_at").eq("request_id",id).eq("visible_to_client",true).order("created_at",{ascending:false}).limit(100)
 ]);
 const item=found.request;
 const canReply=["paid","in_progress","awaiting_client"].includes(item.status);
 const errors:Record<string,string>={
  mensagem:"Verifique a mensagem (até 10.000 caracteres).",salvar_mensagem:"Não foi possível enviar a mensagem.",
  arquivo:"Escolha um documento de até 15 MB.",tipo:"Use PDF, Word (.docx), JPG ou PNG.",
  storage:"Não foi possível salvar o arquivo.",salvar_arquivo:"Não foi possível registrar o arquivo.",
  situacao:"Este atendimento não permite novas mensagens ou arquivos."
 };
 return <main className={css.page}>
  <header className={css.header}><div><p className={css.eyebrow}>ÁREA DO CLIENTE · ANÁLISE FISCAL INDIVIDUAL</p>
   <h1 className={css.title}>Atendimento {item.protocol??id.slice(0,8)}</h1>
   <p className={css.subtitle}>Acompanhe sua análise, responda às mensagens e acesse os documentos compartilhados.</p>
  </div><Link href="/painel/analises-fiscais" className={css.secondary}>Meus atendimentos</Link></header>
  {(mensagem==="1"||arquivo==="1")&&<p className={css.message} role="status">Informação registrada com sucesso.</p>}
  {erro&&<p className={css.error} role="alert">{errors[erro]??"Não foi possível concluir a operação."}</p>}
  <div className={css.grid}>
   <section className={css.section}><h2>Situação</h2><p className={css.status}>{statusLabel[item.status]??item.status}</p><p className={css.note}>Solicitada em {date(item.created_at)}</p></section>
   <section className={css.section}><h2>Sua solicitação</h2><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{item.question}</p></section>
  </div>
  <section className={css.section}><h2>Mensagens do atendimento</h2>
   {messageError?<p className={css.error}>Não foi possível carregar as mensagens.</p>:
    !messages?.length?<p className={css.note}>Nenhuma mensagem registrada.</p>:
    <ul>{messages.map(m=><li key={m.id} style={{marginBottom:14}}>
     <strong>{m.sender_role==="admin"?"Equipe Diana Voltolini":"Você"} · {date(m.created_at)}</strong>
     <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{m.body}</p>
    </li>)}</ul>}
   {canReply&&<form action={sendFiscalClientMessage} className={css.form}>
    <input type="hidden" name="request_id" value={id}/>
    <label>Sua resposta<textarea name="body" rows={4} maxLength={10000} required placeholder="Escreva sua dúvida ou as informações solicitadas."/></label>
    <div className={css.actions}><button type="submit" className={css.button}>Enviar mensagem</button></div>
   </form>}
  </section>
  <section className={css.section}><h2>Documentos compartilhados</h2>
   {fileError?<p className={css.error}>Não foi possível carregar os documentos.</p>:
    !files?.length?<p className={css.note}>Nenhum documento disponível no momento.</p>:
    <ul>{files.map(file=><li key={file.id} style={{marginBottom:10}}>
     <a className={css.link} href={"/api/fiscal-analysis/files/"+file.id}>{file.original_filename}</a> · {Math.ceil(file.size_bytes/1024)} KB · {date(file.created_at)}
    </li>)}</ul>}
   {canReply&&<form action={uploadFiscalClientFile} className={css.form} encType="multipart/form-data">
    <input type="hidden" name="request_id" value={id}/>
    <label>Enviar documento complementar<input type="file" name="document" accept=".pdf,.docx,.jpg,.jpeg,.png" required/></label>
    <p className={css.note}>PDF, Word (.docx), JPG ou PNG; tamanho máximo de 15 MB. O arquivo ficará disponível para a equipe responsável.</p>
    <div className={css.actions}><button type="submit" className={css.button}>Enviar documento</button></div>
   </form>}
  </section>
  {item.status==="completed"&&<p className={css.note}>Atendimento concluído. Os documentos compartilhados permanecem disponíveis para consulta.</p>}
 </main>;
}
