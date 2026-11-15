import type {ReactNode} from "react";
import styles from "./offer.module.css";
type OfferProps={eyebrow:string;headline:string;lead:string;price:string;checkout:string|null;cta:string;features:string[];children?:ReactNode};
export default function ProductOffer({eyebrow,headline,lead,price,checkout,cta,features,children}:OfferProps){
 return <div className={styles.stack}>
  <section className={styles.hero}><div><p className={styles.eyebrow}>{eyebrow}</p><h2>{headline}</h2><p className={styles.lead}>{lead}</p><div className={styles.buy}><span>{price}</span>{checkout?<a href={checkout}>{cta} →</a>:<strong role="status">Contratações em preparação</strong>}</div><p className={styles.hint}>{checkout?"Você será direcionado ao checkout seguro do site para concluir a compra. Após o pagamento, volte à Área do Cliente.":"Este produto ainda não está disponível para contratação. Nenhuma cobrança será gerada."}</p></div></section>
  <section className={styles.section}><p className={styles.eyebrow}>O QUE ESTÁ INCLUÍDO</p><h2>Conheça os benefícios</h2><div className={styles.grid}>{features.map((item,i)=><article key={item}><span>{String(i+1).padStart(2,"0")}</span><p>{item}</p></article>)}</div></section>
  {children}
  <section className={styles.bottom}><div><p className={styles.eyebrow}>PRÓXIMO PASSO</p><h2>{checkout?"Comece agora":"Contratações em preparação"}</h2><p>{checkout?"Faça sua contratação com segurança e acompanhe seus acessos neste painel.":"O pagamento será liberado após a homologação do produto."}</p></div>{checkout&&<a href={checkout}>{cta} →</a>}</section>
 </div>;
}
