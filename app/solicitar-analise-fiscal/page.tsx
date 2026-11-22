import type {Metadata} from "next";
import {submitPublicFiscalAnalysisRequest} from "./actions";
import {FiscalWhatsappInput} from "./FiscalWhatsappInput";
import css from "../torre/comercio-v2/commercial.module.css";

export const metadata:Metadata={
 title:"Solicitar Análise Fiscal Individual | Diana Voltolini",
 description:"Apresente sua dúvida fiscal para receber uma Proposta individual de análise, sem compromisso de contratação.",
 robots:{index:false,follow:false}
};
export const dynamic="force-dynamic";
type Props={searchParams:Promise<{erro?:string;recebida?:string;protocolo?:string}>};
const errors:Record<string,string>={
 campos:"Confira os dados, especialmente o WhatsApp com DDD no formato (47) 9 9285-1601, a descrição da dúvida e a autorização de contato.",
 limite:"Já recebemos solicitações recentes para este e-mail. Para uma nova demanda, entre em contato pelo canal em que conversamos.",
 indisponivel:"Não foi possível registrar a solicitação agora. Tente novamente."
};
export default async function PublicFiscalAnalysisForm({searchParams}:Props){
 const query=await searchParams;
 const success=query.recebida==="1";
 const protocol=typeof query.protocolo==="string"&&/^AFI-\d{8}-[A-F0-9]{8}$/.test(query.protocolo)?query.protocolo:null;
 return <main className={css.page} style={{maxWidth:920}}>
  <header className={css.header}>
   <div><p className={css.eyebrow}>DIANA VOLTOLINI · INTELIGÊNCIA FISCAL</p>
    <h1 className={css.title}>Solicitar Análise Fiscal Individual</h1>
    <p className={css.subtitle}>Explique sua dúvida fiscal e conte o que precisa esclarecer. Vou avaliar sua solicitação e, se puder atender à demanda, encaminharei uma Proposta com escopo, valor e prazo.</p>
   </div>
  </header>
  {success?
   <section className={css.section} role="status">
    <h2>Sua solicitação foi enviada com sucesso!</h2>
    <p>Obrigada por compartilhar sua dúvida. Sua solicitação chegou para avaliação. Vou analisar as informações e entrar em contato caso precise de algum esclarecimento ou documento complementar.</p>
    {protocol&&<p><strong>Seu protocolo:</strong> {protocol}</p>}
    <p><strong>Próximo passo:</strong> se a demanda puder ser atendida, você receberá uma Proposta personalizada com o que será analisado, o valor e o prazo de entrega. A contratação será uma escolha sua.</p>
    <p className={css.note}>Nenhum pagamento foi realizado. O envio da solicitação não representa contratação do serviço.</p>
   </section>:
   <>
    <div className={css.banner}><strong>Antes de começar</strong>
     Informe apenas os dados necessários para descrever sua situação. Não inclua senhas, certificados digitais, números completos de documentos pessoais ou informações sigilosas na descrição. Caso sejam necessários arquivos, solicitaremos por um canal apropriado.
    </div>
    {query.erro&&<p className={css.error} role="alert">{errors[query.erro]??"Não foi possível enviar a solicitação."}</p>}
    <section className={css.section}>
     <h2>Conte sobre sua necessidade</h2>
     <form action={submitPublicFiscalAnalysisRequest} className={css.form}>
      <div style={{position:"absolute",left:"-10000px",width:1,height:1,overflow:"hidden"}} aria-hidden="true">
       <label htmlFor="website">Site</label><input id="website" tabIndex={-1} autoComplete="off" name="website"/>
      </div>
      <div className={css.formRowBalanced}>
       <label>Nome completo ou razão social<input name="customer_name" required minLength={2} maxLength={180} autoComplete="name" placeholder="Como podemos chamar você?"/></label>
       <label>E-mail para retorno<input type="email" name="customer_email" required maxLength={254} autoComplete="email" placeholder="seuemail@empresa.com.br"/></label>
       <label>WhatsApp com DDD<FiscalWhatsappInput/></label>
       <label>Como prefere receber o retorno?
        <select name="preferred_contact" required defaultValue="email">
         <option value="email">E-mail</option>
         <option value="whatsapp">E-mail e WhatsApp</option>
        </select>
       </label>
      </div>
      <label>Qual é sua dúvida fiscal?
       <textarea name="question" required minLength={10} maxLength={10000} rows={7}
        placeholder="Descreva a operação, o documento fiscal, o sistema utilizado (se pertinente) e o que precisa ser analisado."/>
      </label>
      <p className={css.note}>Não precisa anexar documentos agora. Se forem necessários XMLs ou informações complementares, entrarei em contato. Após avaliar a solicitação, informarei o escopo, o valor e o prazo da Proposta.</p>
      <label style={{display:"flex",alignItems:"flex-start",gap:10,fontWeight:500,lineHeight:1.6}}>
       <input style={{width:"auto",marginTop:5}} type="checkbox" name="consent" value="yes" required/>
       Autorizo o uso dos dados fornecidos para avaliar minha solicitação e entrar em contato sobre a Análise Fiscal Individual.
      </label>
      <div className={css.actions}>
       <button className={css.button} type="submit">Enviar minha solicitação</button>
       <span className={css.note}>O envio é gratuito e não obriga você a contratar o serviço.</span>
      </div>
     </form>
    </section>
   </>
  }
  <footer style={{fontSize:12,textAlign:"center",color:"#64748b",padding:"0 0 20px"}}>
   DIANA VOLTOLINI · ESPECIALISTA EM FATURAMENTO E INTELIGÊNCIA FISCAL
  </footer>
 </main>;
}
