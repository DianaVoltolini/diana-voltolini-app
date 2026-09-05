// app/torre/diagnosticos/[id]/finalizar/page.tsx

import type {
  Metadata,
} from "next";

import Image from "next/image";
import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  logout,
} from "../../../actions";

import {
  returnToAnalysis,
} from "../actions";

import {
  finalizeDiagnostic,
} from "./actions";

import styles from "./finalizar.module.css";

export const metadata: Metadata = {
  title:
    "Revisão final do diagnóstico",
};

export const dynamic =
  "force-dynamic";

type FinalizationPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    erro?: string;
  }>;
};

type JsonRecord =
  Record<string, unknown>;

const limitationText =
  "O diagnóstico possui natureza operacional e documental, limitado aos arquivos, operações e informações fornecidos pela empresa. Não substitui parecer jurídico, auditoria fiscal completa, responsabilidade técnica da contabilidade ou responsabilidade do fornecedor do ERP.";

const classificationLabels:
  Record<string, string> = {
  prepared:
    "Preparada",

  partially_prepared:
    "Parcialmente preparada",

  not_prepared:
    "Não preparada",
};

const operationResultLabels:
  Record<string, string> = {
  pending:
    "Não analisada",

  compliant:
    "Conforme",

  attention:
    "Requer atenção",

  critical:
    "Risco crítico",
};

const preparationStatusLabels:
  Record<string, string> = {
  pending:
    "Não avaliada",

  proven:
    "Comprovada para esta operação",

  partially_proven:
    "Parcialmente comprovada",

  not_proven:
    "Não comprovada",

  not_applicable:
    "Não aplicável para o cenário/data analisado",
};

const errorMessages:
  Record<string, string> = {
  "diagnostico-nao-encontrado":
    "O diagnóstico não foi encontrado.",

  "status-invalido":
    "O diagnóstico não está na etapa de revisão final.",

  "analise-nao-encontrada":
    "Nenhuma análise técnica foi encontrada.",

  "analise-incompleta":
    "A análise está incompleta. Retorne para ajustes antes de liberar o resultado.",

  "nao-foi-possivel-aprovar":
    "Não foi possível aprovar a análise.",

  "nao-foi-possivel-finalizar":
    "Não foi possível concluir e liberar o diagnóstico.",
};

function asRecord(
  value: unknown,
): JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
    ? value as JsonRecord
    : {};
}

function asString(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function formatDateTime(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(
    new Date(value),
  );
}

export default async function FinalizationPage({
  params,
  searchParams,
}: FinalizationPageProps) {
  const {
    id,
  } =
    await params;

  const {
    erro,
  } =
    await searchParams;

  const {
    supabase,
    profile,
  } =
    await requireAdmin();

  const {
    data:
      diagnostic,
    error:
      diagnosticError,
  } =
    await supabase
      .from(
        "diagnostics",
      )
      .select(
        `
          id,
          code,
          status,
          company_id,
          analysis_started_at,
          client_deadline_at
        `,
      )
      .eq(
        "id",
        id,
      )
      .maybeSingle();

  if (
    diagnosticError ||
    !diagnostic
  ) {
    notFound();
  }

  if (
    diagnostic.status ===
      "completed"
  ) {
    redirect(
      `/torre/diagnosticos/${diagnostic.id}`,
    );
  }

  if (
    diagnostic.status !==
      "awaiting_approval"
  ) {
    redirect(
      `/torre/diagnosticos/${diagnostic.id}`,
    );
  }

  const [
    {
      data:
        company,
    },

    {
      data:
        analysis,
      error:
        analysisError,
    },
  ] =
    await Promise.all([
      supabase
        .from(
          "companies",
        )
        .select(
          `
            legal_name,
            trade_name,
            cnpj
          `,
        )
        .eq(
          "id",
          diagnostic.company_id,
        )
        .maybeSingle(),

      supabase
        .from(
          "diagnostic_analysis",
        )
        .select(
          `
            operations,
            general_assessment,
            strengths,
            risks,
            action_plan,
            final_opinion,
            final_classification,
            analysis_status,
            updated_at
          `,
        )
        .eq(
          "diagnostic_id",
          diagnostic.id,
        )
        .maybeSingle(),
    ]);

  if (
    analysisError ||
    !analysis
  ) {
    notFound();
  }

  const operations =
    Array.isArray(
      analysis.operations,
    )
      ? analysis.operations
          .map(
            asRecord,
          )
          .filter(
            (
              operation,
            ) =>
              asString(
                operation.operation,
              ).length > 0 ||
              asString(
                operation.file_name,
              ).length > 0,
          )
      : [];

  const operationsComplete =
    operations.length > 0 &&
    operations.every(
      (
        operation,
      ) => {
        const result =
          asString(
            operation.document_conformity,
          ) ||
          asString(
            operation.result,
          );

        const preparationStatus =
          asString(
            operation.preparation_status,
          );

        return (
          result.length > 0 &&
          result !== "pending" &&
          preparationStatus.length > 0 &&
          preparationStatus !==
            "pending" &&
          asString(
            operation.operation_identification,
          ).length > 0 &&
          asString(
            operation.evidence_found,
          ).length > 0 &&
          asString(
            operation.calculation_review,
          ).length > 0 &&
          asString(
            operation.technical_finding,
          ).length > 0 &&
          asString(
            operation.risk_impact,
          ).length > 0 &&
          asString(
            operation.recommended_action,
          ).length > 0 &&
          asString(
            operation.responsible_party,
          ).length > 0 &&
          asString(
            operation.closure_evidence,
          ).length > 0
        );
      },
    );

  const canFinalize =
    Boolean(
      diagnostic.status ===
        "awaiting_approval" &&
      analysis.analysis_status ===
        "ready_for_review" &&
      analysis.final_classification &&
      analysis.general_assessment
        ?.trim() &&
      analysis.final_opinion
        ?.trim() &&
      operationsComplete
    );

  const companyName =
    company?.trade_name ||
    company?.legal_name ||
    "Empresa não informada";

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
          <div
            className={
              styles.brandArea
            }
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

            <span>
              Torre de Controle
            </span>
          </div>

          <div
            className={
              styles.headerActions
            }
          >
            <Link
              className={
                styles.backButton
              }
              href={`/torre/diagnosticos/${diagnostic.id}`}
            >
              Voltar ao diagnóstico
            </Link>

            <div
              className={
                styles.adminIdentity
              }
            >
              <strong>
                {
                  profile.full_name
                }
              </strong>

              <span>
                Administradora
              </span>
            </div>

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
        </div>
      </header>

      <section
        className={
          styles.content
        }
      >
        <div className="container">
          <nav
            className={
              styles.breadcrumb
            }
          >
            <Link
              href="/torre"
            >
              Painel
            </Link>

            <span>
              /
            </span>

            <Link
              href={`/torre/diagnosticos/${diagnostic.id}`}
            >
              {
                diagnostic.code
              }
            </Link>

            <span>
              /
            </span>

            <strong>
              Revisão final
            </strong>
          </nav>

          <header
            className={
              styles.hero
            }
          >
            <div>
              <p
                className={
                  styles.eyebrow
                }
              >
                Etapa 4
              </p>

              <h1>
                Revisão final
              </h1>

              <p>
                Confira exatamente o
                conteúdo técnico que será
                disponibilizado ao cliente.
                Nesta etapa você não edita
                o diagnóstico: aprova ou
                retorna para ajustes.
              </p>
            </div>

            <div
              className={
                styles.companySummary
              }
            >
              <span>
                Empresa analisada
              </span>

              <strong>
                {
                  companyName
                }
              </strong>

              <small>
                {company?.cnpj ||
                  "CNPJ não informado"}
              </small>
            </div>
          </header>

          {erro ? (
            <div
              className={
                styles.errorMessage
              }
            >
              {errorMessages[
                erro
              ] ||
                "Não foi possível concluir a operação."}
            </div>
          ) : null}

          {!canFinalize ? (
            <section
              className={
                styles.incompleteNotice
              }
            >
              <strong>
                A análise não está pronta
                para liberação
              </strong>

              <p>
                Existe algum campo obrigatório
                da análise individual, da
                conclusão ou do status da
                análise que ainda precisa ser
                ajustado antes da liberação.
              </p>

              <form
                action={
                  returnToAnalysis
                }
              >
                <input
                  type="hidden"
                  name="diagnosticId"
                  value={
                    diagnostic.id
                  }
                />

                <button
                  type="submit"
                >
                  Voltar para ajustes
                </button>
              </form>
            </section>
          ) : null}

          <section
            className={
              styles.identificationGrid
            }
          >
            <article>
              <span>
                Diagnóstico
              </span>

              <strong>
                {
                  diagnostic.code
                }
              </strong>
            </article>

            <article>
              <span>
                Classificação final
              </span>

              <strong>
                {analysis.final_classification
                  ? classificationLabels[
                      analysis.final_classification
                    ] ||
                    analysis.final_classification
                  : "Não definida"}
              </strong>
            </article>

            <article>
              <span>
                XMLs analisados
              </span>

              <strong>
                {
                  operations.length
                }
              </strong>
            </article>

            <article>
              <span>
                Última atualização
              </span>

              <strong>
                {formatDateTime(
                  analysis.updated_at,
                )}
              </strong>
            </article>
          </section>

          <section
            className={
              styles.document
            }
          >
            <header
              className={
                styles.documentHeader
              }
            >
              <p
                className={
                  styles.eyebrow
                }
              >
                Prévia da entrega
              </p>

              <h2>
                Diagnóstico Expresso IBS/CBS
              </h2>

              <p>
                Resultado consolidado da
                análise dos documentos e
                informações fornecidos pela
                empresa.
              </p>
            </header>

            <section
              className={
                styles.resultSection
              }
            >
              <h3>
                1. Classificação
              </h3>

              <div
                className={
                  styles.classificationBox
                }
              >
                <strong>
                  {analysis.final_classification
                    ? classificationLabels[
                        analysis.final_classification
                      ] ||
                      analysis.final_classification
                    : "Não definida"}
                </strong>
              </div>
            </section>

            <section
              className={
                styles.resultSection
              }
            >
              <h3>
                2. Avaliação geral
              </h3>

              <p>
                {analysis.general_assessment ||
                  "Não informado."}
              </p>
            </section>

            <section
              className={
                styles.resultSection
              }
            >
              <h3>
                3. XMLs analisados
              </h3>

              {operations.length >
              0 ? (
                <div
                  className={
                    styles.operationList
                  }
                >
                  {operations.map(
                    (
                      operation,
                      index,
                    ) => {
                      const fileName =
                        asString(
                          operation.file_name,
                        );

                      const operationName =
                        asString(
                          operation.operation,
                        );

                      const result =
                        asString(
                          operation.document_conformity,
                        ) ||
                        asString(
                          operation.result,
                        );

                      const preparationStatus =
                        asString(
                          operation.preparation_status,
                        );

                      const technicalBasis =
                        asString(
                          operation.technical_basis,
                        );

                      return (
                        <article
                          key={
                            asString(
                              operation.document_id,
                            ) ||
                            `operation-${index}`
                          }
                        >
                          <header>
                            <span>
                              XML{" "}
                              {
                                index +
                                1
                              }
                            </span>

                            <strong>
                              {fileName ||
                                `Documento ${index + 1}`}
                            </strong>

                            {operationName ? (
                              <small>
                                <b>
                                  Operação informada
                                  pelo cliente:
                                </b>{" "}
                                {
                                  operationName
                                }
                              </small>
                            ) : null}
                          </header>

                          <dl>
                            <div>
                              <dt>
                                CFOP identificado
                              </dt>

                              <dd>
                                {asString(
                                  operation.cfop,
                                ) ||
                                  "Não informado"}
                              </dd>
                            </div>

                            <div>
                              <dt>
                                Conformidade do
                                documento
                              </dt>

                              <dd>
                                {operationResultLabels[
                                  result
                                ] ||
                                  result ||
                                  "Não informado"}
                              </dd>
                            </div>

                            <div>
                              <dt>
                                Preparação IBS/CBS
                              </dt>

                              <dd>
                                {preparationStatusLabels[
                                  preparationStatus
                                ] ||
                                  preparationStatus ||
                                  "Não informado"}
                              </dd>
                            </div>
                          </dl>

                          <div
                            className={
                              styles.operationDetailList
                            }
                          >
                            <section
                              className={
                                styles.operationDetail
                              }
                            >
                              <h4>
                                1. Identificação da
                                operação
                              </h4>

                              <p>
                                {asString(
                                  operation.operation_identification,
                                ) ||
                                  "Não informada."}
                              </p>
                            </section>

                            <section
                              className={
                                styles.operationDetail
                              }
                            >
                              <h4>
                                2. Evidências
                                encontradas
                              </h4>

                              <p>
                                {asString(
                                  operation.evidence_found,
                                ) ||
                                  "Não informadas."}
                              </p>
                            </section>

                            <section
                              className={
                                styles.operationDetail
                              }
                            >
                              <h4>
                                3. Conferência dos
                                cálculos
                              </h4>

                              <p>
                                {asString(
                                  operation.calculation_review,
                                ) ||
                                  "Não informada."}
                              </p>
                            </section>

                            <section
                              className={
                                styles.operationDetail
                              }
                            >
                              <h4>
                                4. Achado técnico
                              </h4>

                              <p>
                                {asString(
                                  operation.technical_finding,
                                ) ||
                                  "Não informado."}
                              </p>
                            </section>

                            {technicalBasis ? (
                              <section
                                className={
                                  styles.operationDetail
                                }
                              >
                                <h4>
                                  5. Fundamentação
                                  técnica
                                </h4>

                                <p>
                                  {
                                    technicalBasis
                                  }
                                </p>
                              </section>
                            ) : null}

                            <section
                              className={
                                styles.operationDetail
                              }
                            >
                              <h4>
                                6. Risco ou impacto
                              </h4>

                              <p>
                                {asString(
                                  operation.risk_impact,
                                ) ||
                                  "Não informado."}
                              </p>
                            </section>

                            <section
                              className={
                                styles.operationDetail
                              }
                            >
                              <h4>
                                7. Ação recomendada
                              </h4>

                              <p>
                                {asString(
                                  operation.recommended_action,
                                ) ||
                                  "Não informada."}
                              </p>
                            </section>

                            <section
                              className={
                                styles.operationDetail
                              }
                            >
                              <h4>
                                8. Responsável
                                sugerido
                              </h4>

                              <p>
                                {asString(
                                  operation.responsible_party,
                                ) ||
                                  "Não informado."}
                              </p>
                            </section>

                            <section
                              className={
                                styles.operationDetail
                              }
                            >
                              <h4>
                                9. Evidência para
                                encerramento
                              </h4>

                              <p>
                                {asString(
                                  operation.closure_evidence,
                                ) ||
                                  "Não informada."}
                              </p>
                            </section>
                          </div>
                        </article>
                      );
                    },
                  )}
                </div>
              ) : (
                <p>
                  Nenhum XML analisado.
                </p>
              )}
            </section>

            <div
              className={
                styles.resultColumns
              }
            >
              <section
                className={
                  styles.resultSection
                }
              >
                <h3>
                  4. Pontos positivos
                </h3>

                <p>
                  {analysis.strengths ||
                    "Não foram registrados pontos positivos específicos."}
                </p>
              </section>

              <section
                className={
                  styles.resultSection
                }
              >
                <h3>
                  5. Riscos identificados
                </h3>

                <p>
                  {analysis.risks ||
                    "Não foram registrados riscos específicos."}
                </p>
              </section>
            </div>

            <section
              className={
                styles.resultSection
              }
            >
              <h3>
                6. Plano de ação
              </h3>

              <p>
                {analysis.action_plan ||
                  "Não foram registradas ações adicionais."}
              </p>
            </section>

            <section
              className={
                styles.finalOpinion
              }
            >
              <h3>
                7. Parecer final
              </h3>

              <p>
                {analysis.final_opinion ||
                  "Não informado."}
              </p>
            </section>

            <section
              className={
                styles.limitationSection
              }
            >
              <h3>
                8. Escopo e limitações
              </h3>

              <p>
                {
                  limitationText
                }
              </p>
            </section>
          </section>

          <section
            className={
              styles.confirmationCard
            }
          >
            <div>
              <p
                className={
                  styles.eyebrow
                }
              >
                Liberação ao cliente
              </p>

              <h2>
                O conteúdo está correto?
              </h2>

              <p>
                Se precisar alterar qualquer
                análise, recomendação ou
                conclusão, retorne para
                ajustes. Ao confirmar, o
                diagnóstico será concluído
                e liberado imediatamente na
                área do cliente.
              </p>
            </div>

            <div
              className={
                styles.confirmationActions
              }
            >
              <form
                action={
                  returnToAnalysis
                }
              >
                <input
                  type="hidden"
                  name="diagnosticId"
                  value={
                    diagnostic.id
                  }
                />

                <button
                  type="submit"
                  className={
                    styles.adjustButton
                  }
                >
                  Voltar para ajustes
                </button>
              </form>

              <form
                action={
                  finalizeDiagnostic
                }
              >
                <input
                  type="hidden"
                  name="diagnosticId"
                  value={
                    diagnostic.id
                  }
                />

                <button
                  type="submit"
                  className={
                    styles.finalizeButton
                  }
                  disabled={
                    !canFinalize
                  }
                >
                  Confirmar e liberar
                  ao cliente
                </button>
              </form>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}