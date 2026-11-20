import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import css from "../comercio-v2/commercial.module.css";

export const metadata: Metadata = { title: "Análises Fiscais | Torre" };
export const dynamic = "force-dynamic";

type RequestRow = {
 id: string; protocol: string | null; customer_name: string;
 customer_email: string; preferred_contact: string; status: string; created_at: string;
};
const statusText: Record<string,string> = {
 received:"Nova solicitação",awaiting_details:"Aguardando informações",
 quoting:"Em orçamento",quote_sent:"Orçamento enviado",
 quote_accepted:"Proposta aprovada",awaiting_payment:"Aguardando pagamento",
 paid:"Pagamento confirmado",in_progress:"Em análise",
 awaiting_client:"Aguardando cliente",completed:"Concluída",
 expired:"Expirada",cancelled:"Cancelada"
};
const dateBR = (v:string) => new Intl.DateTimeFormat("pt-BR", {timeZone:"America/Sao_Paulo",dateStyle:"short"}).format(new Date(v));
export default async function AnalisesFiscaisTorre(){
 await requireAdmin();
 const db=getSupabaseAdmin();
 const {data,error}=await db.from("fiscal_analysis_requests")
  .select("id,protocol,customer_name,customer_email,preferred_contact,status,created_at")
  .order("created_at",{ascending:false}).limit(200);
 const rows=(data??[]) as RequestRow[];
 return <main className={css.page}>
  <header className={css.header}><div><p className={css.eyebrow}>TORRE DE CONTROLE · SERVIÇOS</p>
   <h1 className={css.title}>Análises Fiscais Individuais</h1>
   <p className={css.subtitle}>Solicitações, avaliação prévia, orçamentos e acompanhamento de atendimentos.</p></div>
  </header>
  <div className={css.banner}><strong>Implantação controlada</strong>
   A solicitação pública, o envio de orçamentos e a contratação serão disponibilizados após a homologação do fluxo completo. Documentos iniciais serão opcionais.</div>
  <section className={css.section}><h2>Solicitações recebidas</h2>
   {error?<p className={css.error}>Não foi possível consultar solicitações. Verifique a migração do banco antes de ativar o módulo.</p>:
   rows.length===0?<p className={css.note}>Nenhuma solicitação registrada até o momento.</p>:
   <div className={css.tableScroll}><table className={css.table}>
     <thead><tr><th>Protocolo</th><th>Cliente</th><th>Status</th><th>Retorno preferido</th><th>Recebida em</th></tr></thead>
     <tbody>{rows.map(r=><tr key={r.id}>
       <td><strong>{r.protocol??r.id.slice(0,8)}</strong></td>
       <td><strong>{r.customer_name}</strong><small>{r.customer_email}</small></td>
       <td>{statusText[r.status]??r.status}</td>
       <td>{r.preferred_contact==="whatsapp"?"WhatsApp + e-mail":"E-mail"}</td>
       <td>{dateBR(r.created_at)}</td>
      </tr>)}</tbody></table></div>}
  </section>
  <p className={css.note}>Esta tela é a primeira etapa. Edição do orçamento, e-mail, botão WhatsApp e checkout serão implementados em etapas seguintes. <Link href="/torre/comercio-v2">Área Comercial</Link>.</p>
 </main>;
}
