import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import BuyerEmailSimulator from "./simulator";
import styles from "../../painel.module.css";
export const dynamic="force-dynamic";
export default async function EmailSimulationPage(){
 await requireAdmin();
 return <main className={styles.page}><section className={styles.content}><div className="container">
  <header className={styles.pageHeader}><p className={styles.eyebrow}>ADMINISTRAÇÃO · HOMOLOGAÇÃO</p><h1>Simulação de e-mails de compra</h1>
   <p>Teste modelos de cobrança e pagamento com um cadastro existente, sem criar movimentações financeiras.</p>
   <Link href="/torre/modelos-email">Voltar aos Modelos de E-mail</Link>
  </header>
  <section className={styles.diagnosticsSection}><BuyerEmailSimulator/></section>
 </div></section></main>;
}
