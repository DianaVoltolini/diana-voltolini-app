// app/torre/diagnosticos/[id]/analise/page.tsx

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
  saveOperationAnalysis,
} from "../actions";

import styles from "../diagnostico.module.css";

export const metadata: Metadata = {
  title:
    "Análise dos XMLs",
};

export const dynamic =
  "force-dynamic";

type AnalysisPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    xml?: string;
    erro?: string;
    sucesso?: string;
  }>;
};

type JsonRecord =
  Record<string, unknown>;

const operationLabels:
  Record<
    string,
    string
  > = {
  venda_mercadoria:
    "Venda de mercadoria",

  venda_producao_propria:
    "Venda de produção própria",

  devolucao_venda:
    "Devolução de venda",

  devolucao_compra:
    "Devolução de compra",

  remessa_conserto:
    "Remessa para conserto",

  retorno_conserto:
    "Retorno de conserto",

  demonstracao:
    "Demonstração",

  industrializacao:
    "Industrialização",

  entrega_futura:
    "Entrega futura",

  outra:
    "Outra operação",
};

const resultLabels:
  Record<
    string,
    string
  > = {
  pending:
    "Não analisada",

  compliant:
    "Conforme",

  attention:
    "Requer atenção",

  critical:
    "Risco crítico",
};

const testedLabels:
  Record<
    string,
    string
  > = {
  sim:
    "Sim",

  nao:
    "Não",

  parcialmente:
    "Parcialmente",

  nao_sei:
    "Não sei",
};

const errorMessages:
  Record<
    string,
    string
  > = {
  "resultado-obrigatorio":
    "Selecione o resultado da análise desta NF-e.",

  "analise-tecnica-obrigatoria":
    "Preencha o que foi encontrado nesta NF-e.",

  "analise-xml-incompleta":
    "Conclua a análise desta NF-e antes de seguir para a conclusão.",

  "nao-foi-possivel-salvar-analise":
    "Não foi possível salvar a análise. Tente novamente.",

  "documento-nao-encontrado":
    "O XML não foi encontrado no diagnóstico.",
};

const successMessages:
  Record<
    string,
    string
  > = {
  "xml-analisado":
    "A análise da NF-e anterior foi salva.",

  "analise-iniciada":
    "A análise foi iniciada. Comece pela primeira NF-e.",

  "analise-retomada":
    "A análise foi retomada.",

  "retornado-para-analise":
    "O diagnóstico voltou para análise.",
};

function asRecord(
  value: unknown,
): JsonRecord {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asArray(
  value: unknown,
) {
  return Array.isArray(value)
    ? value
    : [];
}

function asString(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function asBoolean(
  value: unknown,
) {
  return value === true;
}

function translateValue(
  value: string,
  labels: Record<
    string,
    string
  >,
) {
  if (!value) {
    return "Não informado";
  }

  return (
    labels[value] ??
    value
  );
}

export default async function AnalysisPage({
  params,
  searchParams,
}: AnalysisPageProps) {
  const {
    id,
  } =
    await params;

  const {
    xml,
    erro,
    sucesso,
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
          document_limit
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
    diagnostic.status !==
      "under_review"
  ) {
    redirect(
      `/torre/diagnosticos/${diagnostic.id}`,
    );
  }

  const [
    {
      data:
        questionnaire,
    },

    {
      data:
        documents,
    },

    {
      data:
        analysis,
    },
  ] =
    await Promise.all([
      supabase
        .from(
          "diagnostic_questionnaires",
        )
        .select(
          "answers",
        )
        .eq(
          "diagnostic_id",
          diagnostic.id,
        )
        .maybeSingle(),

      supabase
        .from(
          "diagnostic_documents",
        )
        .select(
          `
            id,
            file_name,
            storage_path,
            category,
            counts_toward_limit,
            status,
            created_at
          `,
        )
        .eq(
          "diagnostic_id",
          diagnostic.id,
        )
        .eq(
          "category",
          "xml",
        )
        .eq(
          "counts_toward_limit",
          true,
        )
        .neq(
          "status",
          "rejected",
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        ),

      supabase
        .from(
          "diagnostic_analysis",
        )
        .select(
          "operations",
        )
        .eq(
          "diagnostic_id",
          diagnostic.id,
        )
        .maybeSingle(),
    ]);

  const xmlDocuments =
    documents ?? [];

  if (
    xmlDocuments.length ===
    0
  ) {
    redirect(
      `/torre/diagnosticos/${diagnostic.id}`,
    );
  }

  const requestedIndex =
    Number(xml ?? "0");

  const currentIndex =
    Number.isInteger(
      requestedIndex,
    )
      ? Math.min(
          Math.max(
            requestedIndex,
            0,
          ),
          xmlDocuments.length -
            1,
        )
      : 0;

  const document =
    xmlDocuments[
      currentIndex
    ];

  /*
   * IMPORTANTE:
   *
   * A URL assinada é criada para download
   * utilizando explicitamente o nome
   * original registrado no banco.
   *
   * Exemplo:
   * Autorizacao.xml
   *
   * Dessa forma o navegador não precisa
   * inferir a extensão do arquivo.
   */
  const {
    data:
      downloadData,
  } =
    await supabase.storage
      .from(
        "diagnostic-documents",
      )
      .createSignedUrl(
        document.storage_path,
        600,
        {
          download:
            document.file_name,
        },
      );

  const answers =
    asRecord(
      questionnaire?.answers,
    );

  const express =
    asRecord(
      answers.express,
    );

  const contexts =
    asArray(
      express.documents,
    ).map(
      asRecord,
    );

  const context =
    contexts.find(
      (
        item,
      ) =>
        asString(
          item.documentId,
        ) ===
        document.id,
    ) ?? {};

  const operations =
    asArray(
      analysis?.operations,
    ).map(
      asRecord,
    );

  const savedOperation =
    operations.find(
      (
        operation,
      ) =>
        asString(
          operation.document_id,
        ) ===
        document.id,
    ) ??
    operations[
      currentIndex
    ] ??
    {};

  const operationType =
    asString(
      context.operationType,
    );

  const operationName =
    translateValue(
      operationType,
      operationLabels,
    );

  const result =
    asString(
      savedOperation.result,
    ) ||
    "pending";

  const isSaved =
    result !==
      "pending" &&
    Boolean(
      asString(
        savedOperation.technical_analysis,
      ),
    );

  const previousIndex =
    currentIndex - 1;

  const nextIndex =
    currentIndex + 1;

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
          styles.analysisPage
        }
      >
        <div
          className={
            styles.analysisContainer
          }
        >
          <nav
            className={
              styles.breadcrumb
            }
          >
            <Link href="/torre">
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
              Análise dos XMLs
            </strong>
          </nav>

          <section
            className={
              styles.analysisHero
            }
          >
            <div>
              <p
                className={
                  styles.eyebrow
                }
              >
                Etapa 2
              </p>

              <h1>
                Análise técnica dos XMLs
              </h1>

              <p>
                Analise uma NF-e por vez.
                Salve a análise e avance
                até concluir todos os
                arquivos.
              </p>
            </div>

            <div
              className={
                styles.analysisProgress
              }
            >
              <strong>
                XML{" "}
                {
                  currentIndex +
                  1
                }{" "}
                de{" "}
                {
                  xmlDocuments.length
                }
              </strong>

              <div>
                <span
                  style={{
                    width:
                      `${
                        ((currentIndex +
                          1) /
                          xmlDocuments.length) *
                        100
                      }%`,
                  }}
                />
              </div>
            </div>
          </section>

          {erro ? (
            <div
              className={
                styles.errorMessage
              }
            >
              {errorMessages[
                erro
              ] ??
                "Não foi possível concluir a operação."}
            </div>
          ) : null}

          {sucesso ? (
            <div
              className={
                styles.successMessage
              }
            >
              {successMessages[
                sucesso
              ] ??
                "Operação concluída."}
            </div>
          ) : null}

          <article
            className={
              styles.xmlAnalysisCard
            }
          >
            <header
              className={
                styles.xmlAnalysisHeader
              }
            >
              <div>
                <span>
                  NF-e{" "}
                  {
                    currentIndex +
                    1
                  }{" "}
                  de{" "}
                  {
                    xmlDocuments.length
                  }
                </span>

                <h2>
                  {
                    document.file_name
                  }
                </h2>

                <p>
                  {
                    operationName
                  }
                </p>
              </div>

              {downloadData?.signedUrl ? (
                <a
                  className={
                    styles.downloadButton
                  }
                  href={
                    downloadData.signedUrl
                  }
                >
                  Baixar XML
                </a>
              ) : (
                <span
                  className={
                    styles.downloadUnavailable
                  }
                >
                  Download indisponível
                </span>
              )}
            </header>

            <section
              className={
                styles.clientXmlContext
              }
            >
              <div>
                <span>
                  Por que o cliente
                  escolheu esta NF-e?
                </span>

                <p>
                  {asString(
                    context.whySelected,
                  ) ||
                    "Não informado"}
                </p>
              </div>

              <div>
                <span>
                  IBS/CBS já foi
                  testado?
                </span>

                <p>
                  {translateValue(
                    asString(
                      context.ibsCbsTested,
                    ),
                    testedLabels,
                  )}
                </p>
              </div>

              {asString(
                context.importantNotes,
              ) ? (
                <div
                  className={
                    styles.wideContext
                  }
                >
                  <span>
                    Observação do cliente
                  </span>

                  <p>
                    {asString(
                      context.importantNotes,
                    )}
                  </p>
                </div>
              ) : null}

              {asBoolean(
                context.hasRejection,
              ) ? (
                <div
                  className={
                    styles.wideContext
                  }
                >
                  <span>
                    Erro ou rejeição
                  </span>

                  <p>
                    {asString(
                      context.rejectionDescription,
                    ) ||
                      "O cliente informou que houve erro ou rejeição."}
                  </p>
                </div>
              ) : null}
            </section>

            <form
              className={
                styles.xmlAnalysisForm
              }
              action={
                saveOperationAnalysis
              }
            >
              <input
                type="hidden"
                name="diagnosticId"
                value={
                  diagnostic.id
                }
              />

              <input
                type="hidden"
                name="documentId"
                value={
                  document.id
                }
              />

              <input
                type="hidden"
                name="fileName"
                value={
                  document.file_name
                }
              />

              <input
                type="hidden"
                name="operationName"
                value={
                  operationName
                }
              />

              <input
                type="hidden"
                name="currentIndex"
                value={
                  currentIndex
                }
              />

              <input
                type="hidden"
                name="totalDocuments"
                value={
                  xmlDocuments.length
                }
              />

              <div
                className={
                  styles.analysisFormGrid
                }
              >
                <label>
                  <span>
                    CFOP identificado
                  </span>

                  <input
                    type="text"
                    name="cfop"
                    defaultValue={
                      asString(
                        savedOperation.cfop,
                      )
                    }
                    placeholder="Ex.: 5.102"
                  />

                  <small>
                    Informe o CFOP
                    conferido no XML.
                    Se houver mais de um,
                    informe todos.
                  </small>
                </label>

                <label>
                  <span>
                    Resultado da NF-e *
                  </span>

                  <select
                    name="result"
                    defaultValue={
                      result
                    }
                    required
                  >
                    {Object.entries(
                      resultLabels,
                    ).map(
                      ([
                        value,
                        label,
                      ]) => (
                        <option
                          key={
                            value
                          }
                          value={
                            value
                          }
                        >
                          {
                            label
                          }
                        </option>
                      ),
                    )}
                  </select>

                  <small>
                    Classifique após
                    conferir o arquivo.
                  </small>
                </label>

                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    O que foi encontrado
                    nesta NF-e? *
                  </span>

                  <textarea
                    name="technicalAnalysis"
                    defaultValue={
                      asString(
                        savedOperation.technical_analysis,
                      )
                    }
                    required
                    placeholder="Registre os pontos efetivamente conferidos no XML: CFOP, CST, cClassTrib, IBS, CBS, base de cálculo, alíquotas, valores, totalização, rejeições e parametrizações relevantes."
                  />

                  <small>
                    Este é o registro
                    técnico desta NF-e.
                  </small>
                </label>

                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    O que o cliente deve
                    fazer?
                  </span>

                  <textarea
                    name="recommendation"
                    defaultValue={
                      asString(
                        savedOperation.recommendation,
                      )
                    }
                    placeholder="Registre a recomendação prática decorrente desta NF-e. Se estiver conforme, informe que não foi identificado ajuste específico no escopo analisado."
                  />
                </label>
              </div>

              <footer
                className={
                  styles.analysisFooter
                }
              >
                <div
                  className={
                    styles.analysisNavigation
                  }
                >
                  {previousIndex >=
                  0 ? (
                    <Link
                      href={`/torre/diagnosticos/${diagnostic.id}/analise?xml=${previousIndex}`}
                    >
                      ← XML anterior
                    </Link>
                  ) : (
                    <Link
                      href={`/torre/diagnosticos/${diagnostic.id}`}
                    >
                      ← Voltar
                    </Link>
                  )}

                  {isSaved &&
                  nextIndex <
                    xmlDocuments.length ? (
                    <Link
                      href={`/torre/diagnosticos/${diagnostic.id}/analise?xml=${nextIndex}`}
                    >
                      Próximo XML →
                    </Link>
                  ) : null}
                </div>

                <button
                  type="submit"
                >
                  {nextIndex <
                  xmlDocuments.length
                    ? "Salvar e analisar próximo XML"
                    : "Salvar e ir para conclusão"}
                </button>
              </footer>
            </form>
          </article>
        </div>
      </section>
    </main>
  );
}