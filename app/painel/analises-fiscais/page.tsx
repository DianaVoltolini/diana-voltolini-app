import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import css from "../../torre/comercio-v2/commercial.module.css";
export const metadata: Metadata = { title:"Minhas Análises Fiscais | Diana Voltolini", robots:{index:false,follow:false} };
export const dynamic="force-dynamic";
type RequestRow={id:string;protocol:string|null;status:string;created_at:string;question:string};
const statusText:Record<string,string>={paid:"Pagamento confirmado",in_progress:"Em análise",awaiting_client:"Informações necessárias",completed:"Concluída",cancelled:"Cancelada"};
export default async function FiscalAnalysisCustomerPage(){
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
  <p className={css.subtitle}>Consulte os atendimentos contratados. A conversa e a entrega serão disponibilizadas após a integração do módulo.</p>
  </div></header>
  <section className={css.section}><h2>Meus atendimentos</h2>
  {queryError?<p className={css.error}>Não foi possível carregar seus atendimentos.</p>:
  !rows?.length?<p className={css.note}>Você ainda não possui análises fiscais individuais com pagamento confirmado.</p>:
  <div className={css.grid}>{(rows as RequestRow[]).map(r=><article className={css.card} key={r.id}>
   <p className={css.status}>{statusText[r.status]??r.status}</p>
   <h3>{r.protocol??"Análise fiscal"}</h3>
   <p>{r.question.slice(0,200)}{r.question.length>200?"…":""}</p>
   <small className={css.note}>Solicitada em {new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(r.created_at))}</small>
  </article>)}</div>}
  </section><Link className={css.secondary} href="/painel">Voltar à visão geral</Link>
 </main>;
}
