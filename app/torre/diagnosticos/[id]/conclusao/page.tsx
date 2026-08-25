// app/torre/diagnosticos/[id]/conclusao/page.tsx

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
  saveConclusion,
  sendForApproval,
} from "../actions";

import styles from "../diagnostico.module.css";

export const metadata: Metadata = {
  title:
    "Conclusão do diagnóstico",
};

export const dynamic =
  "force-dynamic";

type ConclusionPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    erro?: string;
    sucesso?: string;
  }>;
};

type JsonRecord =
  Record<string, unknown>;

const classificationLabels:
  Record<
    string,
    string
  > = {
  prepared:
    "Preparada",

  partially_prepared:
    "Parcialmente preparada",

  not_prepared:
    "Não preparada",
};

const resultLabels:
  Record<
    string,
    string
  > = {
  compliant:
    "Conforme",

  attention:
    "Requer atenção",

  critical:
    "Risco crítico",

  pending:
    "Não analisada",
};

const errorMessages:
  Record<
    string,
    string
  > = {
  "avaliacao-geral-obrigatoria":
    "Preencha a avaliação geral do diagnóstico.",

  "classificacao-obrigatoria":
    "Selecione a classificação final.",

  "parecer-final-obrigatorio":
    "Preencha o parecer final.",

  "analise-xml-incompleta":
    "Todos os XMLs precisam ser analisados antes da conclusão.",

  "nao-foi-possivel-salvar-conclusao":
    "Não foi possível salvar a conclusão. Tente novamente.",

  "analise-incompleta":
    "Complete e salve a conclusão antes de enviar para revisão final.",

  "nao-foi-possivel-enviar-revisao":
    "Não foi possível encaminhar o diagnóstico para revisão final.",
};

const successMessages:
  Record<
    string,
    string
  > = {
  "xmls-analisados":
    "Todos os XMLs foram analisados. Agora faça a conclusão do diagnóstico.",

  "conclusao-salva":
    "Conclusão salva com sucesso. O diagnóstico pode seguir para revisão final.",
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

export default async function ConclusionPage({
  params,
  searchParams,
}: ConclusionPageProps) {
  const {
    id,
  } =
    await params;

  const {
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

  /*
   * A conclusão pertence à etapa de
   * análise.
   *
   * Se já estiver em revisão final,
   * segue para o diagnóstico.
   */
  if (
    diagnostic.status ===
      "awaiting_approval"
  ) {
    redirect(
      `/torre/diagnosticos/${diagnostic.id}`,
    );
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
          "diagnostic_documents",
        )
        .select(
          `
            id,
            file_name,
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

  const operations =
    asArray(
      analysis?.operations,
    ).map(
      asRecord,
    );

  /*
   * Verifica XML por XML.
   *
   * Nenhuma conclusão pode ser feita
   * antes de todas as NF-e estarem
   * efetivamente analisadas.
   */
  const analyses =
    xmlDocuments.map(
      (
        document,
        index,
      ) => {
        const operation =
          operations.find(
            (
              item,
            ) =>
              asString(
                item.document_id,
              ) ===
              document.id,
          ) ??
          operations[
            index
          ] ??
          {};

        return {
          documentId:
            document.id,

          fileName:
            document.file_name,

          operation:
            asString(
              operation.operation,
            ) ||
            "Operação não informada",

          cfop:
            asString(
              operation.cfop,
            ),

          result:
            asString(
              operation.result,
            ) ||
            "pending",

          technicalAnalysis:
            asString(
              operation.technical_analysis,
            ),

          recommendation:
            asString(
              operation.recommendation,
            ),

          complete:
            Boolean(
              asString(
                operation.result,
              ) &&
                asString(
                  operation.result,
                ) !==
                  "pending" &&
                asString(
                  operation.technical_analysis,
                ),
            ),
        };
      },
    );

  const incompleteIndex =
    analyses.findIndex(
      (
        item,
      ) =>
        !item.complete,
    );

  /*
   * Se alguma NF-e ainda estiver
   * incompleta, retorna exatamente para
   * ela.
   */
  if (
    incompleteIndex >=
    0
  ) {
    redirect(
      `/torre/diagnosticos/${diagnostic.id}/analise?xml=${incompleteIndex}&erro=analise-xml-incompleta`,
    );
  }

  const generalAssessment =
    analysis?.general_assessment ??
    "";

  const strengths =
    analysis?.strengths ??
    "";

  const risks =
    analysis?.risks ??
    "";

  const actionPlan =
    analysis?.action_plan ??
    "";

  const finalOpinion =
    analysis?.final_opinion ??
    "";

  const finalClassification =
    analysis?.final_classification ??
    "";

  const conclusionReady =
    Boolean(
      generalAssessment.trim() &&
        finalClassification &&
        finalOpinion.trim(),
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
              Conclusão
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
                Etapa 3
              </p>

              <h1>
                Conclusão do diagnóstico
              </h1>

              <p>
                Todos os XMLs já foram
                analisados individualmente.
                Agora consolide os achados
                em uma conclusão única para
                o cliente.
              </p>
            </div>

            <div
              className={
                styles.analysisProgress
              }
            >
              <strong>
                {
                  analyses.length
                }{" "}
                {analyses.length ===
                1
                  ? "XML analisado"
                  : "XMLs analisados"}
              </strong>

              <div>
                <span
                  style={{
                    width:
                      "100%",
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
            style={{
              marginBottom:
                "22px",
            }}
          >
            <header
              className={
                styles.xmlAnalysisHeader
              }
            >
              <div>
                <span>
                  Resumo técnico
                </span>

                <h2>
                  XMLs analisados
                </h2>

                <p>
                  Revise os principais
                  resultados antes de
                  elaborar a conclusão.
                </p>
              </div>
            </header>

            <section
              className={
                styles.clientXmlContext
              }
            >
              {analyses.map(
                (
                  item,
                  index,
                ) => (
                  <div
                    key={
                      item.documentId
                    }
                    className={
                      styles.wideContext
                    }
                  >
                    <span>
                      NF-e{" "}
                      {
                        index +
                        1
                      }{" "}
                      —{" "}
                      {
                        item.fileName
                      }
                    </span>

                    <p>
                      <strong>
                        Operação:
                      </strong>{" "}
                      {
                        item.operation
                      }
                    </p>

                    <p
                      style={{
                        marginTop:
                          "6px",
                      }}
                    >
                      <strong>
                        CFOP:
                      </strong>{" "}
                      {item.cfop ||
                        "Não informado"}
                    </p>

                    <p
                      style={{
                        marginTop:
                          "6px",
                      }}
                    >
                      <strong>
                        Resultado:
                      </strong>{" "}
                      {resultLabels[
                        item.result
                      ] ??
                        item.result}
                    </p>

                    <p
                      style={{
                        marginTop:
                          "10px",
                      }}
                    >
                      <strong>
                        Análise:
                      </strong>{" "}
                      {
                        item.technicalAnalysis
                      }
                    </p>

                    {item.recommendation ? (
                      <p
                        style={{
                          marginTop:
                            "10px",
                        }}
                      >
                        <strong>
                          Recomendação:
                        </strong>{" "}
                        {
                          item.recommendation
                        }
                      </p>
                    ) : null}

                    <Link
                      href={`/torre/diagnosticos/${diagnostic.id}/analise?xml=${index}`}
                      style={{
                        display:
                          "inline-block",

                        marginTop:
                          "12px",

                        color:
                          "#0d1b2a",

                        fontSize:
                          "0.82rem",

                        fontWeight:
                          750,

                        textDecoration:
                          "underline",
                      }}
                    >
                      Revisar esta NF-e
                    </Link>
                  </div>
                ),
              )}
            </section>
          </article>

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
                  Etapa 3
                </span>

                <h2>
                  Resultado consolidado
                </h2>

                <p>
                  Esta parte representa a
                  conclusão profissional do
                  Diagnóstico Expresso
                  IBS/CBS.
                </p>
              </div>
            </header>

            <form
              className={
                styles.xmlAnalysisForm
              }
              action={
                saveConclusion
              }
            >
              <input
                type="hidden"
                name="diagnosticId"
                value={
                  diagnostic.id
                }
              />

              <div
                className={
                  styles.analysisFormGrid
                }
              >
                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    Avaliação geral *
                  </span>

                  <textarea
                    name="generalAssessment"
                    defaultValue={
                      generalAssessment
                    }
                    required
                    placeholder="Resuma a situação geral encontrada considerando os XMLs analisados, a preparação informada pelo cliente e os pontos identificados durante a conferência."
                  />

                  <small>
                    Aqui você apresenta a
                    visão geral do
                    diagnóstico, sem repetir
                    toda a análise de cada
                    XML.
                  </small>
                </label>

                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    Pontos positivos
                  </span>

                  <textarea
                    name="strengths"
                    defaultValue={
                      strengths
                    }
                    placeholder="Registre o que já está correto, organizado ou adequadamente preparado."
                  />
                </label>

                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    Riscos identificados
                  </span>

                  <textarea
                    name="risks"
                    defaultValue={
                      risks
                    }
                    placeholder="Liste os principais riscos técnicos, fiscais ou operacionais identificados."
                  />
                </label>

                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    Plano de ação
                  </span>

                  <textarea
                    name="actionPlan"
                    defaultValue={
                      actionPlan
                    }
                    placeholder="Liste as ações recomendadas em ordem de prioridade."
                  />

                  <small>
                    Prefira orientações
                    práticas: o que precisa
                    ser confirmado, ajustado,
                    testado ou documentado.
                  </small>
                </label>

                <label>
                  <span>
                    Classificação final *
                  </span>

                  <select
                    name="finalClassification"
                    defaultValue={
                      finalClassification
                    }
                    required
                  >
                    <option value="">
                      Selecione
                    </option>

                    {Object.entries(
                      classificationLabels,
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
                    Preparada,
                    parcialmente preparada
                    ou não preparada.
                  </small>
                </label>

                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    Parecer final *
                  </span>

                  <textarea
                    name="finalOpinion"
                    defaultValue={
                      finalOpinion
                    }
                    required
                    placeholder="Escreva a conclusão profissional que será apresentada ao cliente, respeitando o escopo dos XMLs e informações analisados."
                  />

                  <small>
                    Este é o fechamento
                    profissional do
                    diagnóstico.
                  </small>
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
                  <Link
                    href={`/torre/diagnosticos/${diagnostic.id}/analise?xml=${Math.max(
                      0,
                      analyses.length -
                        1,
                    )}`}
                  >
                    ← Voltar aos XMLs
                  </Link>
                </div>

                <button
                  type="submit"
                >
                  Salvar conclusão
                </button>
              </footer>
            </form>
          </article>

          <article
            className={
              styles.xmlAnalysisCard
            }
            style={{
              marginTop:
                "22px",
            }}
          >
            <header
              className={
                styles.xmlAnalysisHeader
              }
            >
              <div>
                <span>
                  Etapa 4
                </span>

                <h2>
                  Revisão final
                </h2>

                <p>
                  Depois de salvar a
                  conclusão, envie o
                  diagnóstico para a última
                  conferência antes da
                  entrega ao cliente.
                </p>
              </div>
            </header>

            <div
              style={{
                padding:
                  "24px 27px",
              }}
            >
              {conclusionReady ? (
                <>
                  <div
                    className={
                      styles.successMessage
                    }
                    style={{
                      marginBottom:
                        "18px",
                    }}
                  >
                    A conclusão está salva
                    com os campos mínimos
                    necessários para a
                    revisão final.
                  </div>

                  <form
                    action={
                      sendForApproval
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
                        styles.downloadButton
                      }
                    >
                      Enviar para revisão final
                    </button>
                  </form>
                </>
              ) : (
                <div
                  className={
                    styles.errorMessage
                  }
                  style={{
                    marginBottom:
                      0,
                  }}
                >
                  Salve primeiro a avaliação
                  geral, a classificação
                  final e o parecer final.
                  Depois a revisão será
                  liberada.
                </div>
              )}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}