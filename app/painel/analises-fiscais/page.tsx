import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import {claimPaidFiscalAnalyses} from "./claim-action";
import css from "../../torre/comercio-v2/commercial.module.css";
export const metadata: Metadata = { title:"Minhas Análises Fiscais | Diana Voltolini", robots:{index:false,follow:false} };
export const dynamic="force-dynamic";
type RequestRow={id:string;protocol:string|null;status:string;created_at:string;question:string};
const statusText:Record<string,string>={paid:"Pagamento confirmado",in_progress:"Em análise",awaiting_client:"Informações necessárias",completed:"Concluída",cancelled:"Cancelada"};
export default async function FiscalAnalysisCustomerPage({searchParams}:{searchParams:Promise<{acesso?:string}>}){
 const {acesso}=await searchParams;
 const auth=await createClient();
 const {data,error}=await auth.auth.getClaims();
 const uid=typeof data?.claims?.sub==="string"?data.claims.sub:null;
 if(error||!uid)redirect("/login");
 const db=getSupabaseAdmin();
 const {data:rows,error:queryError}=await db.from("fiscal_analysis_requests")
  .select("id,protocol,status,created_at,question").eq("user_id",uid)
  .not("paid_at","is",null).order("created_at",{ascending:false}).limit(100);
 return <main className={css.page}>
  <header className={css.header}><div><p className={css.eyebrow}>ÁREA DO CLIENTE · SERVIÇOS</p>
  <h1 className={css.title}>Minhas Análises Fiscais</h1>
  <p className={css.subtitle}>Consulte seus atendimentos contratados, converse com a equipe e acompanhe documentos e entregas.</p>
  </div></header>
  {acesso==="vinculado"&&<p className={css.message} role="status">Pagamento confirmado e atendimento vinculado à sua conta.</p>}
  {acesso==="confirmacao"&&<p className={css.error} role="alert">Confirme seu e-mail de acesso antes de vincular um pagamento.</p>}
  {acesso==="consulta"&&<p className={css.error} role="alert">Não foi possível conferir os pagamentos. Tente novamente.</p>}
  {acesso==="nenhum"&&<p className={css.note} role="status">Nenhum pagamento novo foi encontrado para o e-mail confirmado desta conta. Se acabou de pagar, aguarde a confirmação financeira.</p>}
  <section className={css.section}><h2>Vincular uma contratação</h2>
   <p className={css.note}>Se contratou uma Análise Fiscal Individual pelo site, entre com o mesmo e-mail da contratação e verifique se o pagamento já foi confirmado no Bling para liberar seu atendimento nesta conta. Nenhuma cobrança é gerada aqui.</p>
   <form action={claimPaidFiscalAnalyses}>
    <button className={css.button} type="submit">Verificar pagamento confirmado</button>
   </form>
  </section>
  <section className={css.section}><h2>Meus atendimentos</h2>
  {queryError?<p className={css.error}>Não foi possível carregar seus atendimentos.</p>:
  !rows?.length?<p className={css.note}>Você ainda não possui análises fiscais individuais com pagamento confirmado.</p>:
  <div className={css.grid}>{(rows as RequestRow[]).map(r=><article className={css.card} key={r.id}>
   <p className={css.status}>{statusText[r.status]??r.status}</p>
   <h3><Link href={"/painel/analises-fiscais/"+r.id} className={css.link}>{r.protocol??"Análise fiscal"}</Link></h3>
   <p>{r.question.slice(0,200)}{r.question.length>200?"…":""}</p>
   <small className={css.note}>Solicitada em {new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(r.created_at))}</small><p><Link className={css.link} href={"/painel/analises-fiscais/"+r.id}>Abrir atendimento</Link></p>
  </article>)}</div>}
  </section><Link className={css.secondary} href="/painel">Voltar à visão geral</Link>
 </main>;
}
