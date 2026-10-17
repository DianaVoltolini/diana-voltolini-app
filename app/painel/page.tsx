// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\painel\page.tsx

import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { logout } from "./actions";

import styles from "./painel.module.css";

export const metadata: Metadata = {
  title: "Área do Cliente",
};

export const dynamic = "force-dynamic";

type DiagnosticRow = {
  id: string;
  code: string;
  status: string;
  document_limit: number;
  created_at: string;
  submitted_at: string | null;
  completed_at: string | null;
  order_id: string | null;
};

type OrderRow = {
  id: string;
  status: string;
};

type DiagnosticDocumentRow = {
  diagnostic_id: string;
};

const journeySteps = [
  "Pagamento",
  "Envio",
  "Análise",
  "Revisão final",
  "Resultado",
];

function formatDate(
  value: string | null | undefined,
) {
  if (!value) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone:
        "America/Sao_Paulo",
    },
  ).format(
    new Date(value),
  );
}

function addDays(
  value: string,
  days: number,
) {
  const date =
    new Date(value);

  date.setDate(
    date.getDate() +
      days,
  );

  return date;
}

function formatDateObject(
  value: Date,
) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone:
        "America/Sao_Paulo",
    },
  ).format(value);
}

function paymentStatusLabel(
  value: string | null | undefined,
) {
  if (value === "paid") {
    return "Confirmado";
  }

  if (value === "pending") {
    return "Aguardando";
  }

  if (value === "cancelled") {
    return "Cancelado";
  }

  if (value === "refunded") {
    return "Reembolsado";
  }

  if (value === "failed") {
    return "Falha";
  }

  return "Não informado";
}

function getGeneralStatus(
  status: string,
) {
  if (
    status ===
      "awaiting_questionnaire" ||
    status ===
      "awaiting_documents"
  ) {
    return "Aguardando arquivos";
  }

  if (
    status ===
      "documents_received" ||
    status ===
      "under_review" ||
    status ===
      "client_action_required" ||
    status ===
      "awaiting_approval"
  ) {
    return "Em análise";
  }

  if (
    status ===
    "completed"
  ) {
    return "Concluído";
  }

  if (
    status ===
    "cancelled"
  ) {
    return "Cancelado";
  }

  return "Em andamento";
}

function getStatusClass(
  status: string,
) {
  if (
    status ===
    "completed"
  ) {
    return styles.statusCompleted;
  }

  if (
    status ===
      "awaiting_questionnaire" ||
    status ===
      "awaiting_documents"
  ) {
    return styles.statusWaiting;
  }

  if (
    status ===
    "cancelled"
  ) {
    return styles.statusCancelled;
  }

  return styles.statusAnalysis;
}

function getJourneyStep(
  status: string,
) {
  if (
    status ===
      "awaiting_questionnaire" ||
    status ===
      "awaiting_documents"
  ) {
    return 2;
  }

  if (
    status ===
      "documents_received" ||
    status ===
      "under_review" ||
    status ===
      "client_action_required"
  ) {
    return 3;
  }

  if (
    status ===
    "awaiting_approval"
  ) {
    return 4;
  }

  if (
    status ===
    "completed"
  ) {
    return 5;
  }

  return 0;
}

function getCompletionForecast(
  diagnostic: DiagnosticRow,
) {
  if (
    diagnostic.completed_at
  ) {
    return {
      value:
        formatDate(
          diagnostic.completed_at,
        ),

      helper:
        "Concluído",
    };
  }

  const awaitingFinalSubmission =
    diagnostic.status ===
      "awaiting_questionnaire" ||
    diagnostic.status ===
      "awaiting_documents";

  if (
    !awaitingFinalSubmission &&
    diagnostic.submitted_at
  ) {
    return {
      value:
        `Até ${formatDateObject(
          addDays(
            diagnostic.submitted_at,
            5,
          ),
        )}`,

      helper:
        "Até 5 dias após o envio",
    };
  }

  return {
    value:
      "A definir",

    helper:
      "Até 5 dias após o envio dos arquivos",
  };
}

export default async function PainelPage() {
  const supabase =
    await createClient();

  const {
    data:
      claimsData,
  } =
    await supabase.auth
      .getClaims();

  const userId =
    typeof claimsData?.claims?.sub ===
    "string"
      ? claimsData.claims.sub
      : null;

  const userEmail =
    typeof claimsData?.claims?.email ===
    "string"
      ? claimsData.claims.email
      : null;

  if (!userId) {
    redirect("/login");
  }

  const admin =
    getSupabaseAdmin();

  const [
    {
      data:
        profile,
    },

    {
      data:
        diagnosticData,
    },

    {
      data:
        orderData,
    },
  ] =
    await Promise.all([
      admin
        .from(
          "profiles",
        )
        .select(
          "full_name, email, status",
        )
        .eq(
          "id",
          userId,
        )
        .maybeSingle(),

      admin
        .from(
          "diagnostics",
        )
        .select(
          `
            id,
            code,
            status,
            document_limit,
            created_at,
            submitted_at,
            completed_at,
            order_id
          `,
        )
        .eq(
          "user_id",
          userId,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        ),

      admin
        .from(
          "orders",
        )
        .select(
          `
            id,
            status
          `,
        )
        .eq(
          "user_id",
          userId,
        ),
    ]);

  const diagnostics =
    (diagnosticData ??
      []) as DiagnosticRow[];

  const orders =
    (orderData ??
      []) as OrderRow[];

  const diagnosticIds =
    diagnostics.map(
      (
        diagnostic,
      ) =>
        diagnostic.id,
    );

  const {
    data:
      documentData,
  } =
    diagnosticIds.length >
    0
      ? await admin
          .from(
            "diagnostic_documents",
          )
          .select(
            "diagnostic_id",
          )
          .in(
            "diagnostic_id",
            diagnosticIds,
          )
          .eq(
            "counts_toward_limit",
            true,
          )
          .neq(
            "status",
            "rejected",
          )
      : {
          data:
            [] as DiagnosticDocumentRow[],
        };

  const documents =
    (documentData ??
      []) as DiagnosticDocumentRow[];

  const documentCountByDiagnostic =
    new Map<
      string,
      number
    >();

  for (
    const document
    of documents
  ) {
    documentCountByDiagnostic.set(
      document.diagnostic_id,

      (
        documentCountByDiagnostic.get(
          document.diagnostic_id,
        ) ?? 0
      ) + 1,
    );
  }

  const orderById =
    new Map(
      orders.map(
        (
          order,
        ) => [
          order.id,
          order,
        ],
      ),
    );

  // Controle de acesso ao e-book por produto e pagamento confirmado.
  const { data: ebookProduct, error: ebookProductError } = await admin
    .from("products").select("id").eq("code", "EBOOK-IBSCBS-001").maybeSingle();
  if (ebookProductError) throw new Error("Não foi possível consultar seus materiais digitais.");
  let ebookPurchased = false;
  if (ebookProduct) {
    const { data: ebookOrders, error: ebookOrdersError } = await admin
      .from("orders").select("id")
      .eq("user_id", userId)
      .eq("product_id", ebookProduct.id)
      .eq("status", "paid").limit(1);
    if (ebookOrdersError) throw new Error("Não foi possível verificar seus e-books.");
    ebookPurchased = Boolean(ebookOrders?.length);
  }

  const displayName =
    profile?.full_name?.trim() ||
    userEmail?.split(
      "@",
    )[0] ||
    "Cliente";

  return (
    <main
      className={
        styles.page
      }
    >
      <header
        className={
          styles.header
        }
      >
        <div
          className={`container ${styles.headerContent}`}
        >
          <a
            href="https://dianavoltolini.com.br"
            aria-label="Acessar o site Diana Voltolini"
          >
            <Image
              className={
                styles.logo
              }
              src="/brand/logo-light.png"
              alt="Diana Voltolini"
              width={1535}
              height={538}
              priority
            />
          </a>

          <form
            action={
              logout
            }
          >
            <button
              className={
                styles.logoutButton
              }
              type="submit"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <section
        className={
          styles.content
        }
      >
        <div className="container">
          <header
            className={
              styles.welcome
            }
          >
            <p
              className={
                styles.eyebrow
              }
            >
              Painel do Cliente
            </p>

            <h1>
              Olá, {displayName}
            </h1>

            <p
              className={
                styles.welcomeText
              }
            >
              Consulte suas compras, baixe seus materiais e acompanhe os serviços em andamento. Tudo organizado para você.            </p>
          </header>

          <section aria-label="Resumo da sua área" style={{ display: "flex", flexWrap: "wrap", gap: 14, margin: "28px 0 32px" }}>
            <div style={{ flex: "1 1 220px", background: "#fff", border: "1px solid #dfe5ec", borderRadius: 9, padding: 18 }}>
              <span style={{ color: "#64748b", fontSize: 13 }}>Diagnósticos</span>
              <p style={{ margin: "8px 0 0", fontSize: 25, fontWeight: 800 }}>{diagnostics.length}</p>
            </div>
            <div style={{ flex: "1 1 220px", background: "#fff", border: "1px solid #dfe5ec", borderRadius: 9, padding: 18 }}>
              <span style={{ color: "#64748b", fontSize: 13 }}>E-books adquiridos</span>
              <p style={{ margin: "8px 0 0", fontSize: 25, fontWeight: 800 }}>{ebookPurchased ? 1 : 0}</p>
            </div>
          </section>

          <section aria-label="Produtos e serviços" style={{ margin: "28px 0 36px" }}>
            <p className={styles.eyebrow}>SEUS PRODUTOS E SERVIÇOS</p>
            <h2 style={{ margin: "8px 0 18px" }}>Seus produtos e serviços</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <article style={{ padding: 24, border: "1px solid #dfe5ec", borderTop: "4px solid #c9a227", borderRadius: 10, background: "#fff" }}>
                <h3 style={{ marginTop: 0 }}>Diagnósticos</h3>
                <p>{diagnostics.length > 0 ? `Você tem ${diagnostics.length} diagnóstico(s) para acompanhar.` : "Acompanhe análises e resultados ou conheça o Diagnóstico Expresso."}</p>
                <a href={diagnostics.length > 0 ? "/painel/diagnosticos" : "https://dianavoltolini.com.br/diagnostico-ibs-cbs"} style={{ color: "#856511", fontWeight: 700 }}>{diagnostics.length > 0 ? "Ver meus diagnósticos →" : "Conhecer o diagnóstico →"}</a>
              </article>
              <article style={{ padding: 24, border: "1px solid #dfe5ec", borderTop: "4px solid #c9a227", borderRadius: 10, background: "#fff" }}>
                <h3 style={{ marginTop: 0 }}>E-books</h3>
                <p>{ebookPurchased ? "Seu e-book IBS e CBS na Prática está disponível." : "Conheça o material IBS e CBS na Prática."}</p>
                <Link href={ebookPurchased ? "/painel/ebooks" : "https://dianavoltolini.com.br/ibs-cbs-na-pratica"} style={{ color: "#856511", fontWeight: 700 }}>
                  {ebookPurchased ? "Acessar meu e-book →" : "Conhecer o e-book →"}
                </Link>
              </article>
              <article style={{ padding: 24, border: "1px solid #dfe5ec", borderTop: "4px solid #c9a227", borderRadius: 10, background: "#fff" }}>
                <h3 style={{ marginTop: 0 }}>Mentorias e encontros</h3>
                <p>Em breve, suas participações e materiais estarão reunidos aqui.</p>
                <span style={{ color: "#64748b", fontWeight: 600 }}>Área em preparação</span>
              </article>
            </div>
          </section>

        </div>
      </section>
    </main>
  );
}