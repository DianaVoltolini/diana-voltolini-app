import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {createFiscalAnalysisRequest} from "../new-request-action";
import css from "../../comercio-v2/commercial.module.css";

export const metadata:Metadata={title:"Nova solicitação | Análise Fiscal Individual",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function NewFiscalAnalysisRequest({searchParams}:{searchParams:Promise<{erro?:string}>}){
 await requireAdmin();
 const {erro}=await searchParams;
 return <main className={css.page}>
  <header className={css.header}><div><p className={css.eyebrow}>TORRE DE CONTROLE · ANÁLISE FISCAL INDIVIDUAL</p>
   <h1 className={css.title}>Nova solicitação</h1>
   <p className={css.subtitle}>Cadastre uma demanda recebida pelo WhatsApp ou e-mail. Depois, avalie a dúvida e prepare uma Proposta individual.</p>
  </div><Link href="/torre/analises-fiscais" className={css.secondary}>Voltar à lista</Link></header>
  {erro&&<p className={css.error} role="alert">{erro==="campos"?"Confira nome, e-mail, telefone e descrição da dúvida.":"Não foi possível registrar a solicitação. Tente novamente."}</p>}
  <section className={css.section}>
   <form action={createFiscalAnalysisRequest} className={css.form}>
    <div className={css.formRowBalanced}>
     <label>Nome do cliente<input name="customer_name" required minLength={2} maxLength={180} autoComplete="name"/></label>
     <label>E-mail do cliente<input type="email" name="customer_email" required maxLength={254} autoComplete="email"/></label>
     <label>WhatsApp com DDD<input name="customer_phone" required minLength={8} maxLength={30} autoComplete="tel"/></label>
     <label>Contato preferido<select name="preferred_contact" defaultValue="email"><option value="email">E-mail</option><option value="whatsapp">WhatsApp + e-mail</option></select></label>
    </div>
    <label>Descreva a dúvida fiscal<textarea name="question" required minLength={10} maxLength={10000} rows={7} placeholder="Informe a operação, o documento envolvido e o que o cliente precisa esclarecer."/></label>
    <p className={css.note}>O cadastro cria apenas a solicitação na Torre. Não envia Proposta, não emite cobrança e não libera acesso de cliente.</p>
    <div className={css.actions}><button className={css.button} type="submit">Registrar solicitação</button><Link href="/torre/analises-fiscais" className={css.secondary}>Cancelar</Link></div>
   </form>
  </section>
 </main>;
}
