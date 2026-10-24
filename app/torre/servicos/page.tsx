// app/torre/servicos/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logout } from "../actions";
import SoldProducts from "../sold-products";
import styles from "../painel.module.css";
export const metadata: Metadata = { title: "Gestão de Serviços" };
export const dynamic = "force-dynamic";
export default async function ServicosPage() {
 const {profile}=await requireAdmin();
 return <main className={styles.page}>
   <section className={styles.content}><div className="container">
     
     <header className={styles.pageHeader}><div><p className={styles.eyebrow}>GESTÃO DE SERVIÇOS</p><h1>Gestão de Serviços</h1><p>Consulte os produtos e serviços vendidos. Para acompanhar arquivos, questionários e análises, entre na gestão de Diagnósticos.</p></div></header>
     <SoldProducts/>
     <section className={styles.diagnosticsSection}>
       <header className={styles.sectionHeader}><div><p className={styles.eyebrow}>ACOMPANHAMENTO OPERACIONAL</p><h2>Diagnósticos contratados</h2></div></header>
       <p style={{color:"#536372"}}>Acompanhe os atendimentos, arquivos enviados, questionários e resultados na página exclusiva de Diagnósticos.</p>
       <Link href="/torre/diagnosticos" className={styles.openLink}>Gerenciar Diagnósticos →</Link>
     </section>
   </div></section>
 </main>;
}
