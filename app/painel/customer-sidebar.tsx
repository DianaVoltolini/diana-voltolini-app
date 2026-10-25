"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./customer-sidebar.module.css";

type Props={diagnostics:boolean;subscriber:boolean;ebooks:boolean};
export default function CustomerSidebar({diagnostics,subscriber,ebooks}:Props){
 const path=usePathname();
 const link=(href:string,name:string,description?:string)=><Link key={href} href={href} className={styles.link} aria-current={path===href||(href!=="/painel"&&path.startsWith(href+"/"))?"page":undefined}><span>{name}</span>{description&&<small>{description}</small>}</Link>;
 return <aside className={styles.sidebar}>
  <nav className={styles.navigation} aria-label="Navegação da Área do Cliente">
   <div className={styles.desktop}>
    <p className={styles.intro}>PAINEL DO CLIENTE</p>
    {link("/painel","Visão geral")}
    <p className={styles.group}>MINHAS COMPRAS</p>
    {diagnostics&&link("/painel/diagnosticos","Diagnósticos","Serviços contratados")}
    {ebooks&&link("/painel/ebooks","E-books","Materiais adquiridos")}
    {subscriber&&link("/painel/assinatura","Fiscal na Prática","Minha assinatura")}
    {!diagnostics&&!ebooks&&!subscriber&&<p className={styles.empty}>Nenhuma compra liberada no momento.</p>}
    <p className={styles.group}>OUTROS PRODUTOS</p>
    {!diagnostics&&<a className={styles.link} href="https://dianavoltolini.com.br/diagnostico-ibs-cbs" target="_blank" rel="noopener noreferrer">Diagnóstico IBS/CBS <small>Conhecer →</small></a>}
    {!ebooks&&<Link className={styles.link} href="/painel/ebooks">E-book IBS/CBS <small>Conhecer ↗</small></a>}
    {!subscriber&&<Link className={styles.link} href="/painel/assinatura">Fiscal na Prática <small>Conhecer ↗</small></a>}
    {diagnostics&&ebooks&&subscriber&&<p className={styles.empty}>Confira outras soluções no site.</p>}
   </div>
   <details className={styles.mobile}><summary>Menu e minhas compras</summary><div className={styles.mobileLinks}>
    {link("/painel","Visão geral")}
    {diagnostics&&link("/painel/diagnosticos","Diagnósticos")}
    {ebooks&&link("/painel/ebooks","E-books")}
    {subscriber&&link("/painel/assinatura","Fiscal na Prática")}
    {!ebooks&&link("/painel/ebooks","Conhecer E-book IBS/CBS")}
    {!subscriber&&link("/painel/assinatura","Conhecer Fiscal na Prática")}
   </div></details>
  </nav>
 </aside>;
}
