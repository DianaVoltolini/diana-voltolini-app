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

  const pendingDiagnostics = diagnostics.filter((item) =>
    item.status === "awaiting_questionnaire" ||
    item.status === "awaiting_documents" ||
    item.status === "client_action_required"
  );
  const latestDiagnostics = diagnostics.slice(0, 3);

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
          <header style={{ background: "#0d1b2a", color: "#fff", borderRadius: 14, padding: "clamp(24px, 4vw, 46px)", marginBottom: 24 }}>
            <p style={{ color: "#d5ad35", fontSize: 12, fontWeight: 800, letterSpacing: 1.5 }}>ÁREA DO CLIENTE</p>
            <h1 style={{ color: "#fff", margin: "12px 0 14px" }}>Olá, {displayName}</h1>
            <p style={{ color: "#d3dce5", maxWidth: 680, lineHeight: 1.65, marginBottom: 20 }}>
              Tudo o que você contratou, seus materiais e os próximos passos em um só lugar.
            </p>
            <Link href="#produtos-servicos" style={{ display: "inline-block", color: "#0d1b2a", background: "#d7b03a", fontWeight: 800, borderRadius: 7, padding: "12px 17px", textDecoration: "none" }}>
              Ver meus produtos e serviços →
            </Link>
          </header>

          <section aria-label="Resumo da conta" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(195px,1fr))", gap: 14, marginBottom: 32 }}>
            {[
              { label: "Diagnósticos contratados", value: diagnostics.length, detail: "Serviços vinculados à sua conta" },
              { label: "Materiais digitais", value: ebookPurchased ? 1 : 0, detail: "E-books disponíveis" },
              { label: "Precisam de atenção", value: pendingDiagnostics.length, detail: pendingDiagnostics.length ? "Confira as pendências dos diagnósticos" : "Nenhuma ação identificada" },
            ].map((item) => (
              <article key={item.label} style={{ padding: 23, background: "#fff", border: "1px solid #dfe5ec", borderRadius: 11 }}>
                <p style={{ color: "#617084", fontSize: 13, margin: "0 0 10px" }}>{item.label}</p>
                <strong style={{ fontSize: 32, color: "#0d1b2a" }}>{item.value}</strong>
                <p style={{ color: "#617084", fontSize: 12, margin: "8px 0 0" }}>{item.detail}</p>
              </article>
            ))}
          </section>

          {pendingDiagnostics.length > 0 && (
            <section aria-label="Pendências" style={{ background: "#fffaf0", border: "1px solid #e9d4a3", borderLeft: "5px solid #c9a227", borderRadius: 9, padding: "18px 22px", marginBottom: 32 }}>
              <h2 style={{ color: "#0d1b2a", fontSize: 19, margin: "0 0 7px" }}>Sua atenção é necessária</h2>
              <p style={{ color: "#516071", margin: "0 0 12px" }}>Você tem {pendingDiagnostics.length} diagnóstico(s) aguardando informações ou providências.</p>
              <Link href="/painel/diagnosticos" style={{ fontWeight: 800, color: "#86630b" }}>Ver pendências →</Link>
            </section>
          )}

          <section id="produtos-servicos" aria-label="Produtos e serviços" style={{ margin: "28px 0 36px", scrollMarginTop: 24 }}>
            <p className={styles.eyebrow}>ACESSOS DA SUA CONTA</p>
            <h2 style={{ margin: "8px 0 18px" }}>Seus produtos e serviços</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <article style={{ padding: 28, border: "1px solid #dfe5ec", borderTop: "4px solid #c9a227", borderRadius: 12, background: "#fff", boxShadow: "0 5px 18px rgba(13,27,42,.04)" }}>
                <p style={{ color: diagnostics.length ? "#187044" : "#64748b", fontWeight: 800, fontSize: 12, margin: "0 0 15px" }}>{diagnostics.length ? "ACESSO DISPONÍVEL" : "CONHEÇA O SERVIÇO"}</p>
                <h3 style={{ marginTop: 0 }}>Diagnósticos</h3>
                <p>{diagnostics.length > 0 ? `Você tem ${diagnostics.length} diagnóstico(s) para acompanhar.` : "Acompanhe análises e resultados ou conheça o Diagnóstico Expresso."}</p>
                <a href={diagnostics.length > 0 ? "/painel/diagnosticos" : "https://dianavoltolini.com.br/diagnostico-ibs-cbs"} style={{ color: "#856511", fontWeight: 700 }}>{diagnostics.length > 0 ? "Ver meus diagnósticos →" : "Conhecer o diagnóstico →"}</a>
              </article>
              <article style={{ padding: 24, border: "1px solid #dfe5ec", borderTop: "4px solid #c9a227", borderRadius: 10, background: "#fff" }}>
                <p style={{ color: ebookPurchased ? "#187044" : "#64748b", fontWeight: 800, fontSize: 12, margin: "0 0 15px" }}>{ebookPurchased ? "ACESSO DISPONÍVEL" : "CONHEÇA O MATERIAL"}</p>
                <h3 style={{ marginTop: 0 }}>E-books</h3>
                <p>{ebookPurchased ? "Seu e-book IBS e CBS na Prática está disponível." : "Conheça o material IBS e CBS na Prática."}</p>
                <Link href={ebookPurchased ? "/painel/ebooks" : "https://dianavoltolini.com.br/ibs-cbs-na-pratica"} style={{ color: "#856511", fontWeight: 700 }}>
                  {ebookPurchased ? "Acessar meu e-book →" : "Conhecer o e-book →"}
                </Link>
              </article>
              <article style={{ padding: 24, border: "1px solid #dfe5ec", borderTop: "4px solid #c9a227", borderRadius: 10, background: "#fff" }}>
                <p style={{ color: "#64748b", fontWeight: 800, fontSize: 12, margin: "0 0 15px" }}>CONTEÚDO POR ASSINATURA</p>
                <h3 style={{ marginTop: 0 }}>Fiscal na Prática</h3>
                <p>Análises fiscais e materiais exclusivos. O acesso depende de uma assinatura vigente.</p>
                <Link href="/painel/assinatura" style={{ color: "#856511", fontWeight: 700 }}>Acessar biblioteca →</Link>
              </article>
              <article style={{ padding: 24, border: "1px solid #dfe5ec", borderTop: "4px solid #c9a227", borderRadius: 10, background: "#fff" }}>
                <p style={{ color: "#64748b", fontWeight: 800, fontSize: 12, margin: "0 0 15px" }}>EM PREPARAÇÃO</p>
                <h3 style={{ marginTop: 0 }}>Mentorias e encontros</h3>
                <p>Em breve, suas participações e materiais estarão reunidos aqui.</p>
                <span style={{ color: "#64748b", fontWeight: 600 }}>Área em preparação</span>
              </article>
            </div>
          </section>

          {latestDiagnostics.length > 0 && (
            <section aria-label="Acompanhamento recente" style={{ margin: "38px 0 22px" }}>
              <p className={styles.eyebrow}>ACOMPANHAMENTO</p>
              <h2 style={{ margin: "8px 0 18px", color: "#0d1b2a" }}>Diagnósticos recentes</h2>
              <div style={{ display: "grid", gap: 12 }}>
                {latestDiagnostics.map((item) => (
                  <article key={item.id} style={{ display: "flex", gap: 15, justifyContent: "space-between", flexWrap: "wrap", alignItems: "center", border: "1px solid #dfe5ec", background: "#fff", borderRadius: 9, padding: "17px 22px" }}>
                    <div>
                      <strong style={{ color: "#0d1b2a" }}>{item.code}</strong>
                      <p style={{ color: "#64748b", fontSize: 13, margin: "6px 0 0" }}>Situação: {getGeneralStatus(item.status)}</p>
                    </div>
                    <Link href={`/painel/diagnosticos/${item.id}`} style={{ color: "#856511", fontWeight: 800 }}>{item.status === "completed" ? "Ver resultado →" : pendingDiagnostics.some((pending) => pending.id === item.id) ? "Resolver pendência →" : "Acompanhar →"}</Link>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}