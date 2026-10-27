import type {Metadata} from "next";
import Link from "next/link";
import styles from "./page.module.css";
export const metadata:Metadata={title:"Outros Produtos | Diana Voltolini",robots:{index:false,follow:false}};
const products=[
 {label:"SERVIÇO DE ANÁLISE",title:"Diagnóstico Expresso IBS/CBS",description:"Sua empresa está preparada para a nova tributação? Uma análise de até cinco documentos fiscais para identificar inconsistências, riscos e próximos passos na preparação do faturamento.",url:"https://dianavoltolini.com.br/diagnostico-ibs-cbs",cta:"Conhecer o diagnóstico"},
 {label:"E-BOOK DIGITAL",title:"IBS e CBS na Prática",description:"Um guia direto para entender os conceitos, a aplicação nas compras e vendas, os créditos e as notas fiscais, com exemplos, checklist e glossário para consultar no dia a dia.",url:"https://dianavoltolini.com.br/ibs-cbs-na-pratica",cta:"Conhecer o e-book"},
 {label:"ASSINATURA MENSAL",title:"Fiscal na Prática",description:"Mantenha-se informado sobre mudanças relevantes em tributos, notas fiscais e sistemas. Tenha acesso a análises, checklists e conteúdos exclusivos com referências a fontes oficiais.",url:"https://dianavoltolini.com.br/assinatura-fiscal",cta:"Conhecer a assinatura"}
];
export default function OtherProducts(){return <main className={styles.page}><div className={styles.container}><header className={styles.intro}><p>SOLUÇÕES DISPONÍVEIS</p><h1>Escolha por onde começar.</h1><span>Três formas de avançar: analisar sua situação, aprender no seu ritmo ou acompanhar continuamente as atualizações fiscais.</span></header><section className={styles.grid} aria-label="Produtos e serviços disponíveis">{products.map(x=><article className={styles.card} key={x.title}><span>{x.label}</span><h2>{x.title}</h2><p>{x.description}</p><Link href={x.url} className={styles.cta}>{x.cta} →</Link></article>)}</section></div></main>}
