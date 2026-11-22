import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import css from "../comercio-v2/commercial.module.css";
import dash from "../painel.module.css";

export const metadata: Metadata = { title: "Análise Fiscal Individual | Torre" };
export const dynamic = "force-dynamic";

type RequestRow = {
 id: string; protocol: string | null; customer_name: string;
 customer_email: string; preferred_contact: string; status: string; created_at: string;
};
const statusText: Record<string,string> = {
 received:"Nova solicitação",awaiting_details:"Aguardando informações",
 quoting:"Preparando proposta",quote_sent:"Proposta enviada",
 quote_accepted:"Proposta aprovada",awaiting_payment:"Aguardando pagamento",
 paid:"Pagamento confirmado",in_progress:"Em análise",
 awaiting_client:"Aguardando cliente",completed:"Concluída",
 expired:"Expirada",cancelled:"Cancelada"
};
const dateBR = (v:string) => new Intl.DateTimeFormat("pt-BR", {timeZone:"America/Sao_Paulo",dateStyle:"short"}).format(new Date(v));
export default async function AnalisesFiscaisTorre(){
 await requireAdmin();
 const db=getSupabaseAdmin();
 const [{data,error},{data:quotes,error:quotesError}]=await Promise.all([
  db.from("fiscal_analysis_requests")
    .select("id,protocol,customer_name,customer_email,preferred_contact,status,created_at")
    .order("created_at",{ascending:false}).limit(200),
  db.from("fiscal_analysis_quotes").select("request_id,status,amount_cents,valid_until,version")
    .order("version",{ascending:false}).limit(500)
 ]);
 const rows=(data??[]) as RequestRow[];
 const newestByRequest=new Map<string,{status:string;amount_cents:number;valid_until:string}>();
 for(const quote of quotes??[]){if(!newestByRequest.has(quote.request_id))newestByRequest.set(quote.request_id,quote);}
 const count=(...statuses:string[])=>rows.filter(row=>statuses.includes(row.status)).length;
 const money=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
 return <main className={css.page}>
  <header className={css.header}><div><p className={css.eyebrow}>TORRE DE CONTROLE · SERVIÇOS</p>
   <h1 className={css.title}>Análise Fiscal Individual</h1>
   <p className={css.subtitle}>Solicitações, propostas individuais, pagamentos e acompanhamento de atendimentos.</p></div>
  </header>
  <div className={css.banner}><strong>Implantação controlada</strong>
   A gestão das solicitações e dos rascunhos de propostas já está disponível. O envio ao cliente e a contratação dependem de homologação. Documentos iniciais são opcionais.</div>
  <section className={dash.summaryGrid} aria-label="Resumo das Análises Fiscais">
   <article><span>Solicitações registradas</span><strong>{error?"—":rows.length}</strong><small>Até 200 registros recentes</small></article>
   <article><span>Preparando proposta</span><strong>{error?"—":count("quoting")}</strong><small>Em avaliação e elaboração</small></article>
   <article><span>Propostas enviadas</span><strong>{error?"—":count("quote_sent","quote_accepted")}</strong><small>Aguardando retorno do cliente</small></article>
   <article><span>Aguardando pagamento</span><strong>{error?"—":count("awaiting_payment")}</strong><small>Propostas aprovadas</small></article>
   <article><span>Atendimentos ativos</span><strong>{error?"—":count("paid","in_progress","awaiting_client")}</strong><small>Pagamento confirmado ou execução</small></article>
   <article><span>Concluídas</span><strong>{error?"—":count("completed")}</strong><small>Atendimentos finalizados</small></article>
  </section>
  <section className={css.section}><h2>Solicitações e propostas</h2>
   {quotesError&&<p className={css.error}>Não foi possível consultar os dados das propostas. Os valores podem estar incompletos.</p>}
   {error?<p className={css.error}>Não foi possível consultar solicitações. Verifique a migração do banco antes de ativar o módulo.</p>:
   rows.length===0?<p className={css.note}>Nenhuma solicitação registrada até o momento.</p>:
   <div className={css.tableScroll}><table className={css.table}>
     <thead><tr><th>Protocolo</th><th>Cliente</th><th>Status</th><th>Valor da proposta</th><th>Validade</th><th>Retorno preferido</th><th>Recebida em</th><th>Ações</th></tr></thead>
     <tbody>{rows.map(r=><tr key={r.id}>
       <td><strong>{r.protocol??r.id.slice(0,8)}</strong></td>
       <td><strong>{r.customer_name}</strong><small>{r.customer_email}</small></td>
       <td>{statusText[r.status]??r.status}</td>
       <td>{newestByRequest.has(r.id)?money(newestByRequest.get(r.id)!.amount_cents):"—"}</td>
       <td>{newestByRequest.has(r.id)?(newestByRequest.get(r.id)!.status==="draft"?"3 dias após envio":dateBR(newestByRequest.get(r.id)!.valid_until)):"—"}</td>
       <td>{r.preferred_contact==="whatsapp"?"WhatsApp + e-mail":"E-mail"}</td>
       <td>{dateBR(r.created_at)}</td><td><Link href={`/torre/analises-fiscais/${r.id}`} className={css.link}>Abrir solicitação</Link></td>
      </tr>)}</tbody></table></div>}
  </section>
  <p className={css.note}>As propostas podem ser preparadas em rascunho. O envio por e-mail, o botão WhatsApp e a contratação permanecem condicionados à homologação. <Link href="/torre/comercio-v2">Área Comercial</Link>.</p>
 </main>;
}
