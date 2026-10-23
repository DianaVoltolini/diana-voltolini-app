"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./customer-sidebar.module.css";
type Props={diagnostics:boolean,subscriber:boolean,ebooks:boolean};
export default function CustomerSidebar({diagnostics,subscriber,ebooks}:Props){
 const path=usePathname();
 const link=(href:string,name:string,description?:string)=> <Link key={href} href={href} className={styles.link} aria-current={path===href||(href!=="/painel"&&path.startsWith(href+"/"))?"page":undefined}>{name}{description&&<small>{description}</small>}</Link>;
 const menu=<nav className={styles.links} aria-label="Produtos e serviços">
 {link("/painel","Visão geral")}
 <span className={styles.group}>ATIVOS</span>
 {diagnostics&&link("/painel/diagnosticos","Diagnósticos")}
 {subscriber&&link("/painel/assinatura","Assinatura Fiscal")}
 {!diagnostics&&!subscriber&&<span className={styles.empty}>Nenhum serviço ativo no momento</span>}
 <span className={styles.group}>OUTROS PRODUTOS</span>
 {link("/painel/ebooks","E-books",ebooks?"Adquirido":"Conhecer")}
 {!subscriber&&link("/painel/assinatura","Assinatura Fiscal","Conhecer")}
 </nav>;
 return <aside className={styles.sidebar}>
 <div className={styles.desktop}><h2 className={styles.heading}>Meus produtos e serviços</h2>{menu}</div>
 <details className={styles.mobile}><summary>Meus produtos e serviços</summary>{menu}</details>
 </aside>;
}
