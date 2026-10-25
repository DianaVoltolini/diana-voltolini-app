"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./sidebar.module.css";
const admin=[["/torre","Visão geral"],["/torre/financeiro","Financeiro"],["/torre/vendas","Vendas"],["/torre/clientes","Clientes"]];
const services=[["/torre/diagnosticos","Diagnósticos"],["/torre/assinaturas","Assinatura Recorrente"]];
export default function TorreSidebar(){
 const path=usePathname();
 const item=(href:string,label:string)=><Link key={href} href={href} aria-current={path===href||(href!=="/torre"&&path.startsWith(href+"/"))?"page":undefined} className={styles.link}>{label}</Link>;
 const navigation=<nav className={styles.links} aria-label="Navegação administrativa">
 <p className={styles.kicker}>ADMINISTRAÇÃO</p>{admin.map(([url,label])=>item(url,label))}
 <div className={styles.group}><span className={styles.groupLabel}>SERVIÇOS</span>{services.map(([url,label])=>item(url,label))}</div>
 <div className={styles.group}><span className={styles.groupLabel}>BLOG</span>{item("/torre/conteudos","Artigos e Conteúdos")}</div>
 </nav>;
 return <aside className={styles.sidebar}><div className={styles.desktop}>{navigation}</div><details className={styles.mobile}><summary>Menu administrativo</summary>{navigation}</details></aside>;
}
