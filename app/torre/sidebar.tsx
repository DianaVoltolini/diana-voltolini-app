"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./sidebar.module.css";
const admin=[["/torre","Visão geral"],["/torre/financeiro","Financeiro"],["/torre/vendas","Vendas"],["/torre/clientes","Clientes"],["/torre/pendencias","Pendências"]];
const services=[["/torre/diagnosticos","Diagnósticos"],["/torre/assinaturas","Assinatura Recorrente"]];
export default function TorreSidebar(){
 const path=usePathname();
 const item=(href:string,label:string)=><Link key={href} href={href} aria-current={path===href||(href!=="/torre"&&path.startsWith(href+"/"))?"page":undefined} className={styles.link}>{label}</Link>;
 const navigation=<nav className={styles.links} aria-label="Navegação administrativa">
 <p className={styles.kicker}>ADMINISTRAÇÃO</p>{admin.map(([url,label])=>item(url,label))}
 <div className={styles.group}><span className={styles.groupLabel}>SERVIÇOS</span>{services.map(([url,label])=>item(url,label))}</div>
 <div className={styles.group}><span className={styles.groupLabel}>MARKETING</span>{item("/torre/landings","Landing Pages")}{item("/torre/produtos-entregas","Produtos e Entregas")}{item("/torre/leads","Leads")}{item("/torre/conteudos","Blog")}{item("/torre/sugestoes","Sugestões de conteúdo")}{item("/torre/ctas","CTAs do Blog")}{item("/torre/modelos-email","Modelos de E-mail")}</div>
 <div className={styles.group}><span className={styles.groupLabel}>ÁREA COMERCIAL · EM IMPLANTAÇÃO</span>{item("/torre/comercio-v2","Visão geral")}{item("/torre/comercio-v2/produtos","Produtos")}{item("/torre/comercio-v2/materiais","Biblioteca de Materiais")}{item("/torre/comercio-v2/ofertas","Ofertas e Preços")}{item("/torre/comercio-v2/paginas","Páginas de Vendas")}</div>
 </nav>;
 return <aside className={styles.sidebar}><div className={styles.desktop}>{navigation}</div><details className={styles.mobile}><summary>Menu administrativo</summary>{navigation}</details></aside>;
}
