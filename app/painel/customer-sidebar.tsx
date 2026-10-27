"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import styles from "./customer-sidebar.module.css";
type Props={diagnostics:boolean;subscriber:boolean;ebooks:boolean;hasFiscalHistory?:boolean};
export default function CustomerSidebar({diagnostics,subscriber,ebooks,hasFiscalHistory=false}:Props){
 const path=usePathname();
 const item=(href:string,label:string,description?:string,sub=false)=><Link className={sub?styles.subLink:styles.link} href={href} key={href} aria-current={path===href||(sub&&path.startsWith(href+"/"))?"page":undefined}><span>{label}</span>{description&&<small>{description}</small>}</Link>;
 return <aside className={styles.sidebar}><nav className={styles.navigation} aria-label="Navegação da Área do Cliente"><div className={styles.desktop}><p className={styles.intro}>PAINEL DO CLIENTE</p>{item("/painel","Visão Geral")}{item("/painel/meus-dados","Meus Dados","Cadastro e extrato")}<div className={styles.purchaseGroup}>{item("/painel/minhas-compras","Minhas Compras","Produtos adquiridos")}{(diagnostics||ebooks||subscriber||hasFiscalHistory)&&<div className={styles.purchaseLinks}>{diagnostics&&item("/painel/diagnosticos","Diagnósticos",undefined,true)}{ebooks&&item("/painel/ebooks","E-books",undefined,true)}{(subscriber||hasFiscalHistory)&&item("/painel/assinatura","Fiscal na Prática",undefined,true)}</div>}</div><div className={styles.otherGroup}>{item("/painel/outros-produtos","Outros Produtos","Conheça nossas soluções")}</div></div></nav></aside>;
}
