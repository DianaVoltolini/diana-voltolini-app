// app/torre/page.tsx

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";

import { logout } from "./actions";
import styles from "./painel.module.css";

export const metadata: Metadata = {
  title: "Painel administrativo",
};

export const dynamic =
  "force-dynamic";

type DiagnosticRow = {
  id: string;
  code: string;
  status: string;
  document_limit: number;
  created_at: string;
  submitted_at: string | null;
  analysis_started_at: string | null;
  completed_at: string | null;
  company_id: string;
};

const statusLabels: Record<
  string,
  string
> = {
  awaiting_questionnaire:
    "Aguardando questionário",

  awaiting_documents:
    "Aguardando documentos",

  documents_received:
    "Documentos recebidos",

  under_review:
    "Em análise",

  client_action_required:
    "Ação do cliente",

  awaiting_approval:
    "Revisão final",

  completed:
    "Concluído",

  cancelled:
    "Cancelado",
};

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
  ).format(new Date(value));
}

export default async function PainelPage() {
  const {
    supabase,
    profile,
  } = await requireAdmin();

  const {
    data: diagnosticsData,
    error: diagnosticsError,
  } = await supabase
    .from("diagnostics")
    .select(
      `
        id,
        code,
        status,
        document_limit,
        created_at,
        submitted_at,
        analysis_started_at,
        completed_at,
        company_id
      `,
    )
    .order("created_at", {
      ascending: false,
    });

  const diagnostics =
    (diagnosticsData ??
      []) as DiagnosticRow[];

  const diagnosticIds =
    diagnostics.map(
      (diagnostic) =>
        diagnostic.id,
    );

  const companyIds = [
    ...new Set(
      diagnostics.map(
        (diagnostic) =>
          diagnostic.company_id,
      ),
    ),
  ];

  let companies: Array<{
    id: string;
    legal_name: string;
    trade_name: string | null;
    cnpj: string | null;
  }> = [];

  let questionnaires: Array<{
    diagnostic_id: string;
    submitted_at: string | null;
  }> = [];

  let documents: Array<{
    diagnostic_id: string;
    counts_toward_limit: boolean;
    status: string;
  }> = [];

  if (companyIds.length > 0) {
    const { data } = await supabase
      .from("companies")
      .select(
        "id, legal_name, trade_name, cnpj",
      )
      .in("id", companyIds);

    companies = data ?? [];
  }

  if (diagnosticIds.length > 0) {
    const [
      { data: questionnaireData },
      { data: documentData },
    ] = await Promise.all([
      supabase
        .from(
          "diagnostic_questionnaires",
        )
        .select(
          "diagnostic_id, submitted_at",
        )
        .in(
          "diagnostic_id",
          diagnosticIds,
        ),

      supabase
        .from(
          "diagnostic_documents",
        )
        .select(
          "diagnostic_id, counts_toward_limit, status",
        )
        .in(
          "diagnostic_id",
          diagnosticIds,
        ),
    ]);

    questionnaires =
      questionnaireData ?? [];

    documents =
      documentData ?? [];
  }

  const companyMap = new Map(
    companies.map((company) => [
      company.id,
      company,
    ]),
  );

  const questionnaireMap =
    new Map(
      questionnaires.map(
        (questionnaire) => [
          questionnaire.diagnostic_id,
          questionnaire,
        ],
      ),
    );

  const documentCountMap =
    new Map<string, number>();

  documents.forEach((document) => {
    if (
      document.status !== "rejected" &&
      document.counts_toward_limit
    ) {
      documentCountMap.set(
        document.diagnostic_id,
        (documentCountMap.get(
          document.diagnostic_id,
        ) ?? 0) + 1,
      );
    }
  });

  const waitingInternal =
    diagnostics.filter(
      (diagnostic) =>
        [
          "documents_received",
          "under_review",
          "awaiting_approval",
        ].includes(
          diagnostic.status,
        ),
    ).length;

  const waitingClient =
    diagnostics.filter(
      (diagnostic) =>
        [
          "awaiting_questionnaire",
          "awaiting_documents",
          "client_action_required",
        ].includes(
          diagnostic.status,
        ),
    ).length;

  const completed =
    diagnostics.filter(
      (diagnostic) =>
        diagnostic.status ===
        "completed",
    ).length;

  const urgentDiagnostics =
    diagnostics.filter(
      (diagnostic) =>
        diagnostic.status ===
          "documents_received" ||
        diagnostic.status ===
          "client_action_required",
    );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div
          className={`container ${styles.headerContent}`}
        >
          <div
            className={
              styles.brandArea
            }
          >
            <Image
              className={styles.logo}
              src="/brand/logo-light.png"
              alt="Diana Voltolini"
              width={1535}
              height={538}
              priority
            />

            <span>
              Torre de Controle
            </span>
          </div>

          <div
            className={
              styles.headerActions
            }
          >
            <div
              className={
                styles.adminIdentity
              }
            >
              <strong>
                {profile.full_name}
              </strong>

              <span>Administradora</span>
            </div>

            <form action={logout}>
              <button type="submit">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <section
        className={styles.content}
      >
        <div className="container">
          <header
            className={styles.pageHeader}
          >
            <div>
              <p
                className={styles.eyebrow}
              >
                Gestão administrativa
              </p>

              <h1>
                Visão geral dos
                diagnósticos
              </h1>

              <p>
                Acompanhe vendas,
                questionários, documentos,
                análises e entregas.
              </p>
            </div>
          </header>

          <section
            className={styles.summaryGrid}
          >
            <article>
              <span>
                Diagnósticos totais
              </span>

              <strong>
                {diagnostics.length}
              </strong>

              <small>
                Todos os serviços
                registrados
              </small>
            </article>

            <article>
              <span>
                Aguardando atuação interna
              </span>

              <strong>
                {waitingInternal}
              </strong>

              <small>
                Conferência, análise ou
                revisão
              </small>
            </article>

            <article>
              <span>
                Aguardando cliente
              </span>

              <strong>
                {waitingClient}
              </strong>

              <small>
                Questionário, documentos
                ou complemento
              </small>
            </article>

            <article>
              <span>Concluídos</span>

              <strong>
                {completed}
              </strong>

              <small>
                Diagnósticos entregues
              </small>
            </article>
          </section>

          {urgentDiagnostics.length >
          0 ? (
            <section
              className={
                styles.attentionSection
              }
            >
              <header
                className={
                  styles.sectionHeader
                }
              >
                <div>
                  <p
                    className={
                      styles.eyebrow
                    }
                  >
                    Prioridade
                  </p>

                  <h2>
                    Diagnósticos que
                    precisam de atenção
                  </h2>
                </div>

                <span>
                  {
                    urgentDiagnostics.length
                  }{" "}
                  {urgentDiagnostics.length ===
                  1
                    ? "item"
                    : "itens"}
                </span>
              </header>

              <div
                className={
                  styles.attentionGrid
                }
              >
                {urgentDiagnostics.map(
                  (diagnostic) => {
                    const company =
                      companyMap.get(
                        diagnostic.company_id,
                      );

                    return (
                      <Link
                        key={
                          diagnostic.id
                        }
                        className={
                          styles.attentionCard
                        }
                        href={`/torre/diagnosticos/${diagnostic.id}`}
                      >
                        <div>
                          <span>
                            {statusLabels[
                              diagnostic.status
                            ] ??
                              diagnostic.status}
                          </span>

                          <strong>
                            {
                              diagnostic.code
                            }
                          </strong>

                          <small>
                            {company?.trade_name ||
                              company?.legal_name ||
                              "Empresa não informada"}
                          </small>
                        </div>

                        <b>→</b>
                      </Link>
                    );
                  },
                )}
              </div>
            </section>
          ) : null}

          <section
            className={
              styles.diagnosticsSection
            }
          >
            <header
              className={
                styles.sectionHeader
              }
            >
              <div>
                <p
                  className={
                    styles.eyebrow
                  }
                >
                  Operação completa
                </p>

                <h2>
                  Todos os diagnósticos
                </h2>
              </div>

              <span>
                {diagnostics.length}{" "}
                {diagnostics.length === 1
                  ? "registro"
                  : "registros"}
              </span>
            </header>

            {diagnosticsError ? (
              <div
                className={
                  styles.errorMessage
                }
              >
                Não foi possível carregar
                os diagnósticos.
              </div>
            ) : diagnostics.length >
              0 ? (
              <div
                className={
                  styles.tableWrapper
                }
              >
                <table
                  className={
                    styles.table
                  }
                >
                  <thead>
                    <tr>
                      <th>Diagnóstico</th>
                      <th>Empresa</th>
                      <th>Status</th>
                      <th>Questionário</th>
                      <th>XMLs</th>
                      <th>Contratado em</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {diagnostics.map(
                      (diagnostic) => {
                        const company =
                          companyMap.get(
                            diagnostic.company_id,
                          );

                        const questionnaire =
                          questionnaireMap.get(
                            diagnostic.id,
                          );

                        const documentCount =
                          documentCountMap.get(
                            diagnostic.id,
                          ) ?? 0;

                        return (
                          <tr
                            key={
                              diagnostic.id
                            }
                          >
                            <td>
                              <strong>
                                {
                                  diagnostic.code
                                }
                              </strong>
                            </td>

                            <td>
                              <strong>
                                {company?.trade_name ||
                                  company?.legal_name ||
                                  "Não informada"}
                              </strong>

                              <small>
                                {company?.cnpj ||
                                  "CNPJ não informado"}
                              </small>
                            </td>

                            <td>
                              <span
                                className={`${styles.status} ${
                                  styles[
                                    `status_${diagnostic.status}`
                                  ] ?? ""
                                }`}
                              >
                                {statusLabels[
                                  diagnostic.status
                                ] ??
                                  diagnostic.status}
                              </span>
                            </td>

                            <td>
                              {questionnaire?.submitted_at
                                ? "Enviado"
                                : "Pendente"}
                            </td>

                            <td>
                              {documentCount} de{" "}
                              {
                                diagnostic.document_limit
                              }
                            </td>

                            <td>
                              {formatDate(
                                diagnostic.created_at,
                              )}
                            </td>

                            <td>
                              <Link
                                className={
                                  styles.openLink
                                }
                                href={`/torre/diagnosticos/${diagnostic.id}`}
                              >
                                Abrir
                              </Link>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                className={
                  styles.emptyState
                }
              >
                <h3>
                  Nenhum diagnóstico
                  registrado
                </h3>

                <p>
                  Os serviços contratados
                  aparecerão aqui.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}