// app/painel/diagnosticos/[id]/resultado/page.tsx

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
  createClient,
} from "@/lib/supabase/server";

import {
  logout,
} from "../../../actions";

import styles from "./resultado.module.css";

export const metadata: Metadata = {
  title:
    "Resultado do diagnóstico",
};

export const dynamic =
  "force-dynamic";

type ResultPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type JsonRecord =
  Record<string, unknown>;

type ResultPayload = {
  version?: number;

  classification?: string;

  generalAssessment?:
    | string
    | null;

  strengths?:
    | string
    | null;

  risks?:
    | string
    | null;

  actionPlan?:
    | string
    | null;

  finalOpinion?:
    | string
    | null;

  operations?: unknown[];

  limitation?: string;
};

const classificationLabels:
  Record<string, string> = {
  prepared:
    "Preparação IBS/CBS comprovada",

  partially_prepared:
    "Preparação IBS/CBS parcialmente comprovada",

  not_prepared:
    "Preparação IBS/CBS não comprovada",
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

const defaultLimitation =
  "O diagnóstico possui natureza operacional e documental, limitado aos arquivos, operações e informações fornecidos pela empresa. Não substitui parecer jurídico, auditoria fiscal completa, responsabilidade técnica da contabilidade ou responsabilidade do fornecedor do ERP.";

function stripDuplicatedLimitation(
  value:
    | string
    | null
    | undefined,
  limitation:
    string,
) {
  let text =
    asString(
      value,
    );

  const normalizedLimitation =
    asString(
      limitation,
    );

  if (
    text &&
    normalizedLimitation &&
    text.endsWith(
      normalizedLimitation,
    )
  ) {
    text =
      text
        .slice(
          0,
          -normalizedLimitation.length,
        )
        .trim();

    text =
      text
        .replace(
          /Limitação do diagnóstico:\s*$/i,
          "",
        )
        .trim();
  }

  return text;
}

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
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function parseResult(
  value:
    | string
    | null
    | undefined,
): ResultPayload {
  if (!value) {
    return {};
  }

  try {
    const parsed =
      JSON.parse(value);

    if (
      typeof parsed ===
        "object" &&
      parsed !== null &&
      !Array.isArray(
        parsed,
      )
    ) {
      return parsed as ResultPayload;
    }
  } catch {
    return {
      generalAssessment:
        value,
    };
  }

  return {};
}

function formatDate(
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
  ).format(
    new Date(value),
  );
}

function formatCnpj(
  value:
    | string
    | null
    | undefined,
) {
  const digits =
    (
      value ||
      ""
    ).replace(
      /\D/g,
      "",
    );

  if (
    digits.length !==
    14
  ) {
    return (
      value ||
      "Não informado"
    );
  }

  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

function extractIdentifiedOperation(
  operationIdentification:
    string,
) {
  if (
    !operationIdentification
  ) {
    return "";
  }

  const lines =
    operationIdentification
      .split(
        /\r?\n/,
      )
      .map(
        (
          line,
        ) =>
          line.trim(),
      )
      .filter(
        Boolean,
      );

  const natureLine =
    lines.find(
      (
        line,
      ) =>
        line
          .toLocaleLowerCase(
            "pt-BR",
          )
          .startsWith(
            "natureza da operação:",
          ),
    );

  if (!natureLine) {
    return "";
  }

  return natureLine
    .replace(
      /^natureza da operação:\s*/i,
      "",
    )
    .trim();
}

export default async function ResultPage({
  params,
}: ResultPageProps) {
  const {
    id,
  } =
    await params;

  const supabase =
    await createClient();

  const {
    data:
      claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    typeof claimsData
      ?.claims
      ?.sub ===
      "string"
      ? claimsData.claims.sub
      : null;

  if (!userId) {
    redirect(
      "/login",
    );
  }

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
          final_classification,
          public_summary,
          completed_at,
          created_at
        `,
      )
      .eq(
        "id",
        id,
      )
      .eq(
        "user_id",
        userId,
      )
      .maybeSingle();

  if (
    diagnosticError ||
    !diagnostic
  ) {
    notFound();
  }

  if (
    diagnostic.status !==
      "completed"
  ) {
    redirect(
      `/painel/diagnosticos/${diagnostic.id}`,
    );
  }

  const {
    data:
      company,
  } =
    await supabase
      .from(
        "companies",
      )
      .select(
        `
          legal_name,
          trade_name,
          cnpj,
          city,
          state,
          tax_regime,
          erp_name
        `,
      )
      .eq(
        "id",
        diagnostic.company_id,
      )
      .maybeSingle();

  const result =
    parseResult(
      diagnostic.public_summary,
    );

  const operations =
    Array.isArray(
      result.operations,
    )
      ? result.operations
          .map(
            asRecord,
          )
          .filter(
            (
              operation,
            ) =>
              asString(
                operation.file_name,
              ).length > 0 ||
              asString(
                operation.operation,
              ).length > 0,
          )
      : [];

  const classification =
    result.classification ||
    diagnostic.final_classification ||
    "";

  const companyName =
    company?.trade_name ||
    company?.legal_name ||
    "Empresa não informada";

  const limitation =
    result.limitation ||
    defaultLimitation;

  const finalOpinion =
    stripDuplicatedLimitation(
      result.finalOpinion,
      limitation,
    );

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

          <div
            className={
              styles.headerActions
            }
          >
            <Link
              className={
                styles.backButton
              }
              href={`/painel/diagnosticos/${diagnostic.id}`}
            >
              Voltar ao diagnóstico
            </Link>

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
              href="/painel"
            >
              Meu painel
            </Link>

            <span>
              /
            </span>

            <Link
              href={`/painel/diagnosticos/${diagnostic.id}`}
            >
              {
                diagnostic.code
              }
            </Link>

            <span>
              /
            </span>

            <strong>
              Resultado
            </strong>
          </nav>

          <article
            className={
              styles.report
            }
          >
            <header
              className={
                styles.reportHeader
              }
            >
              <div>
                <p
                  className={
                    styles.eyebrow
                  }
                >
                  Diagnóstico Expresso
                  IBS/CBS
                </p>

                <h1>
                  Resultado do diagnóstico
                </h1>

                <p>
                  Avaliação operacional e
                  documental realizada a
                  partir das informações e
                  dos documentos incluídos
                  no escopo contratado.
                </p>
              </div>

              <span
                className={
                  styles.completedStatus
                }
              >
                Concluído
              </span>
            </header>

            <section
              className={
                styles.identification
              }
            >
              <div>
                <span>
                  Diagnóstico
                </span>

                <strong>
                  {
                    diagnostic.code
                  }
                </strong>
              </div>

              <div>
                <span>
                  Empresa
                </span>

                <strong>
                  {
                    companyName
                  }
                </strong>
              </div>

              <div>
                <span>
                  CNPJ
                </span>

                <strong>
                  {formatCnpj(
                    company?.cnpj,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Concluído em
                </span>

                <strong>
                  {formatDate(
                    diagnostic.completed_at,
                  )}
                </strong>
              </div>
            </section>

            <section
              className={
                styles.classification
              }
            >
              <p
                className={
                  styles.eyebrow
                }
              >
                Classificação geral
              </p>

              <h2>
                {classificationLabels[
                  classification
                ] ||
                  "Classificação não informada"}
              </h2>

              <p>
                A conclusão está limitada
                às operações, documentos e
                confirmações incluídos no
                diagnóstico.
              </p>
            </section>

            <section
              className={
                styles.reportSection
              }
            >
              <h2>
                Resumo executivo
              </h2>

              <p>
                {result.generalAssessment ||
                  "Resumo não informado."}
              </p>
            </section>

            <section
              className={
                styles.reportSection
              }
            >
              <div
                className={
                  styles.sectionHeading
                }
              >
                <div>
                  <h2>
                    XMLs analisados
                  </h2>

                  <p>
                    {
                      operations.length
                    }{" "}
                    {operations.length ===
                    1
                      ? "arquivo incluído na análise."
                      : "arquivos incluídos na análise."}
                  </p>
                </div>
              </div>

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

                      const resultValue =
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

                      const operationIdentification =
                        asString(
                          operation.operation_identification,
                        );

                      const evidenceFound =
                        asString(
                          operation.evidence_found,
                        );

                      const calculationReview =
                        asString(
                          operation.calculation_review,
                        );

                      const technicalFinding =
                        asString(
                          operation.technical_finding,
                        );

                      const technicalBasis =
                        asString(
                          operation.technical_basis,
                        );

                      const riskImpact =
                        asString(
                          operation.risk_impact,
                        );

                      const recommendedAction =
                        asString(
                          operation.recommended_action,
                        );

                      const responsibleParty =
                        asString(
                          operation.responsible_party,
                        );

                      const closureEvidence =
                        asString(
                          operation.closure_evidence,
                        );

                      const identifiedOperation =
                        extractIdentifiedOperation(
                          operationIdentification,
                        );

                      const hasDetailedAnalysis =
                        Boolean(
                          operationIdentification ||
                          evidenceFound ||
                          calculationReview ||
                          technicalFinding ||
                          technicalBasis ||
                          riskImpact ||
                          recommendedAction ||
                          responsibleParty ||
                          closureEvidence,
                        );

                      return (
                        <article
                          key={
                            asString(
                              operation.document_id,
                            ) ||
                            `xml-${index}`
                          }
                        >
                          <header>
                            <div>
                              <span>
                                XML{" "}
                                {
                                  index +
                                  1
                                }
                              </span>

                              <h3>
                                {fileName ||
                                  `Documento ${index + 1}`}
                              </h3>

                              {operationName ? (
                                <p
                                  className={
                                    styles.operationName
                                  }
                                >
                                  <strong>
                                    Operação informada pelo cliente:
                                  </strong>{" "}
                                  {
                                    operationName
                                  }
                                </p>
                              ) : null}

                              {identifiedOperation ? (
                                <p
                                  className={
                                    styles.operationName
                                  }
                                >
                                  <strong>
                                    Operação identificada no XML:
                                  </strong>{" "}
                                  {
                                    identifiedOperation
                                  }
                                </p>
                              ) : null}
                            </div>

                            <strong>
                              {operationResultLabels[
                                resultValue
                              ] ||
                                resultValue ||
                                "Não informado"}
                            </strong>
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
                                Conformidade do documento
                              </dt>

                              <dd>
                                {operationResultLabels[
                                  resultValue
                                ] ||
                                  resultValue ||
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

                          {hasDetailedAnalysis ? (
                            <section>
                              <h4>
                                1. Identificação da operação
                              </h4>

                              <p>
                                {operationIdentification ||
                                  "Não informada."}
                              </p>

                              <h4>
                                2. Evidências encontradas
                              </h4>

                              <p>
                                {evidenceFound ||
                                  "Não informadas."}
                              </p>

                              <h4>
                                3. Conferência dos cálculos
                              </h4>

                              <p>
                                {calculationReview ||
                                  "Não informada."}
                              </p>

                              <h4>
                                4. Achado técnico
                              </h4>

                              <p>
                                {technicalFinding ||
                                  "Não informado."}
                              </p>

                              {technicalBasis ? (
                                <>
                                  <h4>
                                    5. Fundamentação técnica
                                  </h4>

                                  <p>
                                    {
                                      technicalBasis
                                    }
                                  </p>
                                </>
                              ) : null}

                              <h4>
                                6. Risco ou impacto
                              </h4>

                              <p>
                                {riskImpact ||
                                  "Não informado."}
                              </p>

                              <h4>
                                7. Ação recomendada
                              </h4>

                              <p>
                                {recommendedAction ||
                                  "Não informada."}
                              </p>

                              <h4>
                                8. Responsável sugerido
                              </h4>

                              <p>
                                {responsibleParty ||
                                  "Não informado."}
                              </p>

                              <h4>
                                9. Evidência para encerramento
                              </h4>

                              <p>
                                {closureEvidence ||
                                  "Não informada."}
                              </p>
                            </section>
                          ) : (
                            <section>
                              <h4>
                                Análise técnica
                              </h4>

                              <p>
                                {asString(
                                  operation.technical_analysis,
                                ) ||
                                  "Não informada."}
                              </p>

                              <h4>
                                Recomendação
                              </h4>

                              <p>
                                {asString(
                                  operation.recommendation,
                                ) ||
                                  "Não foi registrada recomendação específica para este XML."}
                              </p>
                            </section>
                          )}
                        </article>
                      );
                    },
                  )}
                </div>
              ) : (
                <p>
                  Nenhum XML foi
                  apresentado no resultado.
                </p>
              )}
            </section>

            <div
              className={
                styles.twoColumns
              }
            >
              <section
                className={
                  styles.reportSection
                }
              >
                <h2>
                  Pontos positivos
                </h2>

                <p>
                  {result.strengths ||
                    "Não informado."}
                </p>
              </section>

              <section
                className={
                  styles.reportSection
                }
              >
                <h2>
                  Riscos identificados
                </h2>

                <p>
                  {result.risks ||
                    "Não informado."}
                </p>
              </section>
            </div>

            <section
              className={
                styles.reportSection
              }
            >
              <h2>
                Plano de ação
              </h2>

              <p>
                {result.actionPlan ||
                  "Não informado."}
              </p>
            </section>

            <section
              className={
                styles.finalOpinion
              }
            >
              <p
                className={
                  styles.eyebrow
                }
              >
                Conclusão profissional
              </p>

              <h2>
                Parecer final
              </h2>

              <p>
                {finalOpinion ||
                  "Parecer não informado."}
              </p>
            </section>

            <section
              className={
                styles.limitation
              }
            >
              <h2>
                Escopo e limitações
              </h2>

              <p>
                {
                  limitation
                }
              </p>
            </section>

            <footer
              className={
                styles.reportFooter
              }
            >
              <strong>
                Diana Voltolini
              </strong>

              <span>
                Faturamento e Inteligência
                Fiscal
              </span>

              <p>
                Transformando complexidade
                fiscal em segurança
                empresarial.
              </p>
            </footer>
          </article>
        </div>
      </section>
    </main>
  );
}