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
    <section className={styles.content}><div className="container">
      
      <header className={styles.pageHeader}><div><p className={styles.eyebrow}>GESTÃO FINANCEIRA</p><h1>Vendas e recebimentos</h1><p>Consulte pagamentos de todos os produtos em um só lugar.</p></div></header>
      <FinanceOverview filters={filters}/>
    </div></section>
  </main>;
}
