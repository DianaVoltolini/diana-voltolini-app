// app/painel/outros-produtos/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  ENCOUNTER_PRODUCT_CODE,
  EBOOK_PRODUCT_CODE,
  getEbookPurchaseAccess,
} from "@/lib/ebooks/purchase-access";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Outros Produtos | Diana Voltolini",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const products = [
  {
    key: "diagnostic",
    label: "SERVIÇO DE ANÁLISE",
    title: "Diagnóstico Expresso IBS/CBS",
    description:
      "Sua empresa está preparada para a nova tributação? Uma análise de até cinco documentos fiscais para identificar inconsistências, riscos e próximos passos na preparação do faturamento.",
    url: "https://dianavoltolini.com.br/diagnostico-ibs-cbs",
    cta: "Conhecer o diagnóstico",
  },
  {
    key: "ebook",
    label: "E-BOOK DIGITAL",
    title: "IBS e CBS na Prática",
    description:
      "Um guia direto para entender os conceitos, a aplicação nas compras e vendas, os créditos e as notas fiscais, com exemplos, checklist e glossário para consultar no dia a dia.",
    url: "https://dianavoltolini.com.br/ibs-cbs-na-pratica",
    cta: "Conhecer o e-book",
  },
  {
    key: "encounter",
    label: "ENCONTRO ONLINE",
    title: "Reforma Tributária na Prática",
    description:
      "Compras e Faturamento em 2027. Encontro ao vivo em 21/01/2027, das 19h30 às 21h (horário de Brasília), pelo Google Meet. Inclui o e-book IBS e CBS na Prática e materiais de apoio.",
    url: "https://dianavoltolini.com.br/black-november-ibs-cbs",
    cta: "Conhecer o encontro",
  },
  {
    key: "subscription",
    label: "ASSINATURA MENSAL",
    title: "Fiscal na Prática",
    description:
      "Mantenha-se informado sobre mudanças relevantes em tributos, notas fiscais e sistemas. Tenha acesso a análises, checklists e conteúdos exclusivos com referências a fontes oficiais.",
    url: "https://dianavoltolini.com.br/assinatura-fiscal",
    cta: "Conhecer a assinatura",
  },
] as const;

export default async function OtherProducts() {
  const auth = await createClient();
  const { data, error: authError } = await auth.auth.getClaims();
  const uid = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (authError || !uid) redirect("/login");

  const db = getSupabaseAdmin();
  // A mesma validação de compra e vínculo de usuário é utilizada em Meus E-books.
  // O pagamento do encontro só será reconhecido quando o pedido estiver pago
  // e tiver paid_at registrado. Isso evita confirmar inscrições antecipadamente.
  const [access, { data: diagnostics, error: diagnosticsError },
    { data: orders, error: ordersError },
    { data: catalog, error: catalogError },
    { data: subscriptions, error: subscriptionsError }] = await Promise.all([
    getEbookPurchaseAccess(uid),
    db.from("diagnostics").select("id").eq("user_id", uid).limit(1),
    db.from("orders").select("product_id,paid_at").eq("user_id", uid).eq("status", "paid").limit(200),
    db.from("products").select("id,code").in("code", [EBOOK_PRODUCT_CODE, ENCOUNTER_PRODUCT_CODE]),
    db.from("fiscal_subscriptions").select("id").eq("user_id", uid).limit(1),
  ]);

  if (diagnosticsError || ordersError || catalogError || subscriptionsError) {
    throw new Error("Não foi possível conferir seus produtos no momento.");
  }

  const ebookId = catalog?.find(p => p.code === EBOOK_PRODUCT_CODE)?.id;
  const hasDirectEbookPurchase = Boolean(
    ebookId && orders?.some(o => o.product_id === ebookId && o.paid_at),
  );
  const acquired: Record<(typeof products)[number]["key"], boolean> = {
    diagnostic: Boolean(diagnostics?.length),
    ebook: hasDirectEbookPurchase || access.hasEncounterOrder,
    encounter: access.hasEncounterOrder,
    subscription: Boolean(subscriptions?.length),
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.intro}>
          <p>SOLUÇÕES DISPONÍVEIS</p>
          <h1>Escolha por onde começar.</h1>
          <span>
            Conheça as soluções para analisar sua situação, aprender na prática e acompanhar
            as atualizações fiscais.
          </span>
        </header>
        <section className={styles.grid} aria-label="Produtos e serviços disponíveis">
          {products.map(product => {
            const purchased = acquired[product.key];
            const isEncounter = product.key === "encounter";
            const isEbook = product.key === "ebook";
            const link = purchased && (isEncounter || isEbook)
              ? "/painel/ebooks" : product.url;
            const action = purchased && isEncounter
              ? "Ver minha inscrição" : purchased && isEbook
                ? "Acessar meu e-book" : product.cta;

            return (
              <article className={styles.card} key={product.key}>
                <div className={styles.cardHeading}>
                  <span>{product.label}</span>
                  {purchased && (
                    <span className={styles.acquired}>
                      {isEncounter ? "✓ Inscrição confirmada" : "✓ Adquirido"}
                    </span>
                  )}
                </div>
                <h2>{product.title}</h2>
                <p>{product.description}</p>
                <Link href={link} className={styles.cta}>{action} →</Link>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
