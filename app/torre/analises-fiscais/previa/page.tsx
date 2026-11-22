import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import css from "../../comercio-v2/commercial.module.css";

export const metadata:Metadata={
 title:"Prévia da Análise Fiscal Individual | Torre",
 robots:{index:false,follow:false}
};
export const dynamic="force-dynamic";

type View="lista"|"torre"|"cliente";
type Props={searchParams:Promise<{visao?:string}>};
const base="/torre/analises-fiscais/previa";
const displayDate="22/11/2026";
const protocol="AFI-2026-0001";
const demoName="Cliente Exemplo";
const money="R$ 249,90";
const sampleMessages=[
 {who:"Equipe Diana Voltolini",when:"20/11/2026, 10:30",body:"Recebemos sua solicitação. Para concluir a análise, poderia enviar o XML da operação?"},
 {who:"Cliente Exemplo",when:"20/11/2026, 14:10",body:"O XML já está disponível. Minha dúvida principal é a conferência dos campos fiscais da operação."},
 {who:"Equipe Diana Voltolini",when:"21/11/2026, 09:15",body:"Obrigada. A conferência está em andamento e o relatório será disponibilizado nesta área."}
];
const sampleDocuments=[
 {name:"XML da operação — exemplo",type:"Enviado pelo cliente",size:"48 KB"},
 {name:"Relatório da Análise Fiscal — exemplo.pdf",type:"Entrega da equipe",size:"185 KB"},
 {name:"Plano de ação — exemplo.docx",type:"Entrega da equipe",size:"39 KB"}
];
function PreviewNotice(){
 return <div className={css.banner} role="status"><strong>PRÉVIA DEMONSTRATIVA · SOMENTE LEITURA</strong>
  Todos os nomes, valores, documentos e mensagens abaixo são fictícios. Não há solicitação cadastrada, cobrança, e-mail ou arquivo real. Os campos estão desativados nesta visualização.
 </div>;
}
function Views({active}:{active:View}){
 const views:[View,string][]=[["lista","Visão geral da Torre"],["torre","Atendimento na Torre"],["cliente","Visão do cliente"]];
 return <nav className={css.actions} aria-label="Alternar prévia" style={{marginBottom:24}}>
  {views.map(([key,label])=><Link key={key} className={active===key?css.button:css.secondary} href={base+"?visao="+key} aria-current={active===key?"page":undefined}>{label}</Link>)}
 </nav>;
}
function SampleFileList({internal=false}:{internal?:boolean}){
 return <ul style={{paddingLeft:20,margin:"0 0 12px"}}>
  {sampleDocuments.map(f=><li key={f.name} style={{margin:"0 0 12px",lineHeight:1.6}}>
   <strong>{f.name}</strong> <span className={css.note}>· {f.size} · {f.type}</span>
   <span className={css.note}> · Arquivo ilustrativo (sem download)</span>
  </li>)}
  {internal&&<li style={{marginBottom:12}}><strong>Notas de conferência — uso interno</strong> <span className={css.note}>· Visível apenas na Torre</span></li>}
 </ul>;
}
function SampleMessages({client=false}:{client?:boolean}){
 return <ul style={{paddingLeft:20,margin:"0 0 14px"}}>
  {sampleMessages.map(m=><li key={m.when} style={{margin:"0 0 18px"}}>
   <strong>{client&&m.who===demoName?"Você":m.who} · {m.when}</strong>
   <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",lineHeight:1.7}}>{m.body}</p>
  </li>)}
 </ul>;
}
function ListPreview(){
 const data=[
  {protocol,status:"Aguardando informações",name:"Cliente Exemplo 2",value:"—",date:"21/11/2026"},
  {protocol:"AFI-2026-0002",status:"Proposta enviada",name:"Cliente Exemplo 3",value:"R$ 189,90",date:"21/11/2026"},
  {protocol:"AFI-2026-0001",status:"Em análise",name:demoName,value:money,date:displayDate}
 ];
 return <>
  <div className={css.grid} style={{marginBottom:22}}>
   {[["Solicitações registradas","3"],["Preparando proposta","0"],["Propostas enviadas","1"],["Aguardando pagamento","0"],["Atendimentos ativos","1"],["Concluídas","0"]].map(([label,value])=>
    <article className={css.card} key={label}><p>{label}</p><strong style={{fontSize:32}}>{value}</strong></article>)}
  </div>
  <section className={css.section}><h2>Solicitações e Propostas</h2>
   <div className={css.tableScroll}><table className={css.table}>
    <thead><tr><th>Protocolo</th><th>Cliente</th><th>Situação</th><th>Valor da Proposta</th><th>Recebida em</th><th>Ação</th></tr></thead>
    <tbody>{data.map((r,i)=><tr key={i}><td><strong>{r.protocol}</strong></td><td>{r.name}</td>
     <td>{r.status}</td><td>{r.value}</td><td>{r.date}</td>
     <td><Link className={css.link} href={base+"?visao=torre"}>Visualizar exemplo</Link></td>
    </tr>)}</tbody></table></div>
  </section>
 </>;
}
function TorrePreview(){
 return <>
  <div className={css.grid}>
   <section className={css.section}><h2>Dados da solicitação</h2>
    <p><strong>Cliente</strong><br/>{demoName}</p>
    <p><strong>E-mail</strong><br/>cliente.exemplo@example.com</p>
    <p><strong>WhatsApp</strong><br/>(47) 99999-0000</p>
    <p><strong>Recebido em</strong><br/>{displayDate}</p>
    <p className={css.status}>Situação: Em análise</p>
   </section>
   <section className={css.section}><h2>Dúvida apresentada</h2>
    <p style={{lineHeight:1.7}}>Preciso conferir o tratamento fiscal de uma operação interestadual e entender quais informações devem ser verificadas na nota fiscal antes da emissão.</p>
    <p className={css.note}>Texto de exemplo, sem dados de contribuinte real.</p>
   </section>
  </div>
  <section className={css.section}><h2>Proposta individual</h2>
   <p><strong>Escopo:</strong> Conferência de documento fiscal, identificação de pontos de atenção e relatório com orientações operacionais.</p>
   <div className={css.grid}>
    <p><strong>Valor da Proposta</strong><br/>{money}</p>
    <p><strong>Prazo de entrega</strong><br/>3 dias úteis</p>
    <p><strong>Validade</strong><br/>3 dias após envio</p>
   </div>
   <span className={css.note}>Nesta prévia, nenhuma Proposta pode ser enviada e nenhuma cobrança pode ser gerada.</span>
  </section>
  <section className={css.section}><h2>Atendimento individual</h2>
   <p className={css.note}>Entrega preparada: há PDF e Word compartilhados com o cliente (somente exemplo).</p>
   <div className={css.form}>
    <label>Próxima situação<select disabled defaultValue="completed"><option value="completed">Concluir atendimento</option></select></label>
    <div className={css.actions}><button type="button" disabled className={css.button}>Atualizar situação (simulação)</button></div>
    <label>Mensagem para o cliente<textarea disabled rows={3} placeholder="Digite uma mensagem de acompanhamento..."/></label>
    <div className={css.actions}><button type="button" disabled className={css.button}>Enviar mensagem (simulação)</button></div>
    <label>Anexar documento<input disabled type="file"/></label>
    <label style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" disabled style={{width:"auto"}}/>Disponibilizar este documento ao cliente</label>
    <div className={css.actions}><button type="button" disabled className={css.button}>Salvar documento (simulação)</button></div>
   </div>
  </section>
  <div className={css.grid}>
   <section className={css.section}><h2>Documentos anexados</h2><SampleFileList internal/></section>
   <section className={css.section}><h2>Histórico de mensagens</h2><SampleMessages/></section>
  </div>
  <section className={css.section}><h2>Histórico da solicitação</h2>
   <p>21/11/2026, 09:15 · Documento compartilhado</p>
   <p>20/11/2026, 14:10 · Resposta recebida</p>
   <p>20/11/2026, 10:30 · Mensagem enviada</p>
  </section>
 </>;
}
function ClientPreview(){
 return <>
  <div className={css.grid}>
   <section className={css.section}><h2>Situação</h2>
    <p className={css.status}>Em análise</p><p className={css.note}>Solicitada em {displayDate}</p>
   </section>
   <section className={css.section}><h2>Sua solicitação</h2>
    <p style={{lineHeight:1.7}}>Preciso conferir o tratamento fiscal de uma operação interestadual e entender quais informações devem ser verificadas na nota fiscal antes da emissão.</p>
   </section>
  </div>
  <section className={css.section}><h2>Mensagens do atendimento</h2>
   <SampleMessages client/>
   <div className={css.form}>
    <label>Sua resposta<textarea disabled rows={4} placeholder="Escreva sua dúvida ou as informações solicitadas."/></label>
    <div className={css.actions}><button className={css.button} type="button" disabled>Enviar mensagem (simulação)</button></div>
   </div>
  </section>
  <section className={css.section}><h2>Documentos e entrega da análise</h2>
   <SampleFileList/>
   <div className={css.form}>
    <label>Enviar documento complementar<input disabled type="file"/></label>
    <p className={css.note}>PDF, Word (.docx), JPG ou PNG; até 15 MB.</p>
    <div className={css.actions}><button type="button" className={css.button} disabled>Enviar documento (simulação)</button></div>
   </div>
  </section>
 </>;
}
export default async function FiscalAnalysisPreview({searchParams}:Props){
 await requireAdmin();
 const q=await searchParams;
 const view:View=q.visao==="torre"||q.visao==="cliente"?q.visao:"lista";
 return <main className={css.page}>
  <header className={css.header}><div>
   <p className={css.eyebrow}>{view==="cliente"?"ÁREA DO CLIENTE · PRÉVIA":"TORRE DE CONTROLE · PRÉVIA"}</p>
   <h1 className={css.title}>{view==="lista"?"Análise Fiscal Individual":view==="torre"?"Solicitação "+protocol:"Atendimento "+protocol}</h1>
   <p className={css.subtitle}>Visualização para avaliação de conteúdo, hierarquia, cores, espaçamentos e experiência de navegação.</p>
  </div><Link href="/torre/analises-fiscais" className={css.secondary}>Voltar à Torre</Link></header>
  <PreviewNotice/>
  <Views active={view}/>
  {view==="lista"?<ListPreview/>:view==="torre"?<TorrePreview/>:<ClientPreview/>}
 </main>;
}
