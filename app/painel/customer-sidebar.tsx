"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import styles from "./customer-sidebar.module.css";
type Props={diagnostics:boolean;subscriber:boolean;ebooks:boolean};
export default function CustomerSidebar(_props:Props){
 const path=usePathname();
 const item=(href:string,label:string,description?:string)=><Link className={styles.link} href={href} key={href} aria-current={path===href?"page":undefined}><span>{label}</span>{description&&<small>{description}</small>}</Link>;
 return <aside className={styles.sidebar}><nav className={styles.navigation} aria-label="Navegação da Área do Cliente"><div className={styles.desktop}><p className={styles.intro}>PAINEL DO CLIENTE</p>{item("/painel","Visão Geral")}{item("/painel/meus-dados","Meus Dados","Cadastro e extrato")}{item("/painel/minhas-compras","Minhas Compras","Produtos adquiridos")}{item("/painel/outros-produtos","Outros Produtos","Conheça nossas soluções")}</div></nav></aside>;
}
