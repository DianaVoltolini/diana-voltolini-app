// app/torre/modelos-email/reenvio-ebook/page.tsx
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import EbookResendForm from "./resend-form";
import styles from "../../painel.module.css";
export const dynamic="force-dynamic";
export default async function ResendEbookEmailPage(){
 await requireAdmin();
 return <main className={styles.page}><section className={styles.content}><div className="container">
  <header className={styles.pageHeader}>
   <div><p className={styles.eyebrow}>ADMINISTRAÇÃO · SUPORTE DE COMPRAS</p>
    <h1>Reenviar e-mail real do e-book</h1>
    <p>Recupere mensagens de pedidos existentes após verificar o comprador. Não gera novas cobranças.</p></div>
   <Link href="/torre/modelos-email">Voltar aos modelos</Link>
  </header>
  <section className={styles.diagnosticsSection}><EbookResendForm/></section>
 </div></section></main>;
}
