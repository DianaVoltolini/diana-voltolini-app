"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./sidebar.module.css";
const links=[
 {href:"/torre",label:"Visão geral"},
 {href:"/torre/financeiro",label:"Financeiro"},
 {href:"/torre/servicos",label:"Serviços"},
 {href:"/torre/diagnosticos",label:"Diagnósticos"},
 {href:"/torre/ebooks",label:"E-books"},
 {href:"/torre/pendencias",label:"Pendências"},
];
export default function TorreSidebar(){
 const path=usePathname();
 const item=(href:string,label:string)=> <Link key={href} href={href} aria-current={path===href||(href!=="/torre"&&path.startsWith(href+"/"))?"page":undefined} className={styles.link}>{label}</Link>;
 return <aside className={styles.sidebar} aria-label="Navegação administrativa">
   <div className={styles.desktop}><p className={styles.kicker}>ADMINISTRAÇÃO</p><nav className={styles.links}>{links.map(l=>item(l.href,l.label))}
      <div className={styles.group}><span className={styles.groupLabel}>BLOG</span>{item("/torre/conteudos","Artigos e conteúdos")}</div>
   </nav></div>
   <details className={styles.mobile}><summary>Menu administrativo</summary><nav className={styles.links}>{links.map(l=>item(l.href,l.label))}<div className={styles.group}><span className={styles.groupLabel}>BLOG</span>{item("/torre/conteudos","Artigos e conteúdos")}</div></nav></details>
 </aside>;
}
