// app/torre/financeiro/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logout } from "../actions";
import FinanceOverview from "../finance-overview";
import styles from "../painel.module.css";

export const metadata: Metadata = {title:"Financeiro Geral | Torre de Controle"};
export const dynamic="force-dynamic";
type Search={de?:string;ate?:string;cliente?:string;servico?:string;status?:string};
export default async function FinanceiroPage({searchParams}:{searchParams:Promise<Search>}) {
  const {profile}=await requireAdmin();
  const filters=await searchParams;
  return <main className={styles.page}>
    <header className={styles.header}><div className={`container ${styles.headerContent}`}>
      <div className={styles.brandArea}><Image className={styles.logo} src="/brand/logo-light.png" alt="Diana Voltolini" width={1535} height={538} priority/><span>Torre de Controle</span></div>
      <div className={styles.headerActions}><div className={styles.adminIdentity}><strong>{profile.full_name}</strong><span>Administradora</span></div><form action={logout}><button type="submit">Sair</button></form></div>
    </div></header>
    <section className={styles.content}><div className="container">
      <p><Link href="/torre" style={{fontWeight:800,color:"#80620e"}}>← Visão geral</Link></p>
      <header className={styles.pageHeader}><div><p className={styles.eyebrow}>GESTÃO FINANCEIRA</p><h1>Vendas e recebimentos</h1><p>Consulte pagamentos de todos os produtos em um só lugar.</p></div></header>
      <FinanceOverview filters={filters}/>
    </div></section>
  </main>;
}
