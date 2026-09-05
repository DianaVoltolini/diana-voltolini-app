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

const preparationLabels:
  Record<
    string,
    string
  > = {
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
    "Selecione a conformidade documental deste XML.",

  "preparacao-obrigatoria":
    "Selecione a situação da preparação IBS/CBS para este XML.",

  "analise-detalhada-incompleta":
    "Preencha todos os campos obrigatórios da análise detalhada deste XML.",

  "analise-xml-incompleta":
    "Conclua a análise detalhada deste XML antes de seguir para a conclusão.",

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
    "A análise do XML anterior foi salva.",

  "analise-iniciada":
    "A análise foi iniciada. Comece pelo primeiro XML.",

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

  /*
   * Primeiro procura SEMPRE pelo
   * document_id real.
   *
   * O fallback por posição somente é
   * permitido para registros antigos
   * que ainda não possuam document_id.
   *
   * Nunca usamos por índice uma
   * operação que já pertença a outro
   * documento.
   */
  const savedOperationById =
    operations.find(
      (
        operation,
      ) =>
        asString(
          operation.document_id,
        ) ===
        document.id,
    );

  const indexedOperation =
    operations[
      currentIndex
    ] ?? {};

  const indexedOperationHasDocumentId =
    Boolean(
      asString(
        indexedOperation.document_id,
      ),
    );

  const savedOperation =
    savedOperationById ??
    (
      !indexedOperationHasDocumentId
        ? indexedOperation
        : {}
    );

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

  const preparationStatus =
    asString(
      savedOperation.preparation_status,
    ) ||
    "pending";

  const isSaved =
    result !==
      "pending" &&
    preparationStatus !==
      "pending" &&
    Boolean(
      asString(
        savedOperation.operation_identification,
      ),
    ) &&
    Boolean(
      asString(
        savedOperation.evidence_found,
      ),
    ) &&
    Boolean(
      asString(
        savedOperation.calculation_review,
      ),
    ) &&
    Boolean(
      asString(
        savedOperation.technical_finding,
      ),
    ) &&
    Boolean(
      asString(
        savedOperation.risk_impact,
      ),
    ) &&
    Boolean(
      asString(
        savedOperation.recommended_action,
      ),
    ) &&
    Boolean(
      asString(
        savedOperation.responsible_party,
      ),
    ) &&
    Boolean(
      asString(
        savedOperation.closure_evidence,
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
                Analise um XML por vez.
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

          {/*
            O key do documento força o React
            a desmontar e recriar todo o
            formulário quando muda de XML.

            Isso é essencial porque os campos
            abaixo utilizam defaultValue.
          */}
          <article
            key={
              document.id
            }
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
                  XML{" "}
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
              key={`form-${document.id}`}
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
                    Conformidade do documento *
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
                    Classifique o XML como
                    conforme, requer atenção
                    ou risco crítico.
                  </small>
                </label>

                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    Preparação IBS/CBS *
                  </span>

                  <select
                    name="preparationStatus"
                    defaultValue={
                      preparationStatus
                    }
                    required
                  >
                    {Object.entries(
                      preparationLabels,
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
                    Avalie somente a preparação
                    comprovada por esta operação
                    e pelas evidências disponíveis.
                  </small>
                </label>

                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    1. Identificação da operação *
                  </span>

                  <textarea
                    name="operationIdentification"
                    defaultValue={
                      asString(
                        savedOperation.operation_identification,
                      )
                    }
                    required
                    placeholder="Registre modelo do documento, data, regime do emitente, natureza da operação, destino, CFOP, produto/NCM quando relevante, valor e situação de autorização."
                  />

                  <small>
                    Use somente informações
                    efetivamente verificadas no XML
                    ou no contexto documentado.
                  </small>
                </label>

                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    2. Evidências encontradas *
                  </span>

                  <textarea
                    name="evidenceFound"
                    defaultValue={
                      asString(
                        savedOperation.evidence_found,
                      ) ||
                      asString(
                        savedOperation.technical_analysis,
                      )
                    }
                    required
                    placeholder="Registre os campos efetivamente localizados: CST IBS/CBS, cClassTrib, grupo IBSCBS/gIBSCBS, base, alíquotas, valores, totalizações, protocolo, rejeições e outros elementos relevantes."
                  />

                  <small>
                    Diferencie claramente
                    o que está presente,
                    ausente ou não aplicável.
                  </small>
                </label>

                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    3. Conferência dos cálculos *
                  </span>

                  <textarea
                    name="calculationReview"
                    defaultValue={
                      asString(
                        savedOperation.calculation_review,
                      )
                    }
                    required
                    placeholder="Demonstre a conferência da base, IBS, CBS e totalizações quando aplicável. Se não houver cálculo IBS/CBS aplicável ao cenário/data, registre expressamente o motivo."
                  />

                  <small>
                    Não deixe este campo vazio.
                    Quando não aplicável,
                    explique por quê.
                  </small>
                </label>

                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    4. Achado técnico *
                  </span>

                  <textarea
                    name="technicalFinding"
                    defaultValue={
                      asString(
                        savedOperation.technical_finding,
                      ) ||
                      asString(
                        savedOperation.technical_analysis,
                      )
                    }
                    required
                    placeholder="Descreva a conclusão técnica decorrente das evidências: o que está correto, o que está incorreto ou o que não pôde ser comprovado."
                  />

                  <small>
                    O achado deve ser objetivo
                    e sustentado pelas evidências
                    registradas acima.
                  </small>
                </label>

                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    5. Fundamentação técnica
                  </span>

                  <textarea
                    name="technicalBasis"
                    defaultValue={
                      asString(
                        savedOperation.technical_basis,
                      )
                    }
                    placeholder="Quando aplicável, registre regra de validação, rejeição, Nota Técnica, orientação oficial ou outro fundamento relacionado diretamente ao achado."
                  />

                  <small>
                    Campo opcional. Use quando
                    houver fundamento específico
                    pertinente ao documento.
                  </small>
                </label>

                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    6. Risco ou impacto *
                  </span>

                  <textarea
                    name="riskImpact"
                    defaultValue={
                      asString(
                        savedOperation.risk_impact,
                      )
                    }
                    required
                    placeholder="Informe a consequência prática: rejeição, inconsistência documental, parametrização inadequada, retrabalho, risco tributário, ausência de evidência ou ausência de risco identificado."
                  />
                </label>

                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    7. Ação recomendada *
                  </span>

                  <textarea
                    name="recommendedAction"
                    defaultValue={
                      asString(
                        savedOperation.recommended_action,
                      ) ||
                      asString(
                        savedOperation.recommendation,
                      )
                    }
                    required
                    placeholder="Informe exatamente o que deve ser feito. Se não houver ajuste, registre que nenhuma correção específica foi identificada no escopo analisado."
                  />
                </label>

                <label>
                  <span>
                    8. Responsável sugerido *
                  </span>

                  <input
                    type="text"
                    name="responsibleParty"
                    defaultValue={
                      asString(
                        savedOperation.responsible_party,
                      )
                    }
                    required
                    placeholder="Ex.: ERP + Faturamento"
                  />

                  <small>
                    Exemplos: Faturamento,
                    Contabilidade, ERP/TI
                    ou responsáveis combinados.
                  </small>
                </label>

                <label>
                  <span>
                    Situação para encerramento
                  </span>

                  <input
                    type="text"
                    value="Definida pela evidência abaixo"
                    disabled
                  />

                  <small>
                    O item somente deve ser
                    considerado resolvido quando
                    a evidência indicada existir.
                  </small>
                </label>

                <label
                  className={
                    styles.analysisWideField
                  }
                >
                  <span>
                    9. Evidência para encerramento *
                  </span>

                  <textarea
                    name="closureEvidence"
                    defaultValue={
                      asString(
                        savedOperation.closure_evidence,
                      )
                    }
                    required
                    placeholder="Informe o que precisa existir para considerar este ponto encerrado: novo XML de teste, confirmação formal da contabilidade, evidência do ERP, correção de parametrização ou outra comprovação objetiva."
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