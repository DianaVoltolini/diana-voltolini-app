// app/torre/diagnosticos/[id]/page.tsx

import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";

import { logout } from "../../actions";

import {
  resumeAnalysis,
  returnToAnalysis,
  saveAnalysis,
  sendForApproval,
  sendMessage,
  startAnalysis,
  updateDocumentReview,
} from "./actions";

import styles from "./diagnostico.module.css";

export const metadata: Metadata = {
  title: "Gestão do diagnóstico",
};

export const dynamic = "force-dynamic";

type DiagnosticPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    erro?: string;
    sucesso?: string;
  }>;
};

type JsonRecord = Record<string, unknown>;

const statusLabels: Record<string, string> = {
  awaiting_questionnaire: "Aguardando questionário",
  awaiting_documents: "Aguardando documentos",
  documents_received: "Documentos recebidos",
  under_review: "Em análise",
  client_action_required: "Ação do cliente",
  awaiting_approval: "Revisão final",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const categoryLabels: Record<string, string> = {
  xml: "XML principal",
  danfe: "DANFE",
  erp_evidence: "Confirmação do ERP",
  accounting_guidance: "Orientação da contabilidade",
  parameterization: "Parametrização",
  rejection_evidence: "Rejeição ou erro",
  procedure: "Procedimento interno",
  other: "Outro documento",
};

const documentStatusLabels: Record<string, string> = {
  uploaded: "Recebido",
  under_review: "Em conferência",
  approved: "Aprovado",
  rejected: "Substituição necessária",
};

const operationResultLabels: Record<string, string> = {
  pending: "Não analisada",
  compliant: "Conforme",
  attention: "Requer atenção",
  critical: "Risco crítico",
};

const classificationLabels: Record<string, string> = {
  prepared: "Preparada",
  partially_prepared: "Parcialmente preparada",
  not_prepared: "Não preparada",
};

const taxRegimeLabels: Record<string, string> = {
  mei: "MEI",
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
  outro: "Outro",
};

const operationLabels: Record<string, string> = {
  venda_mercadoria: "Venda de mercadoria",
  venda_producao_propria: "Venda de produção própria",
  devolucao_venda: "Devolução de venda",
  devolucao_compra: "Devolução de compra",
  remessa_conserto: "Remessa para conserto",
  retorno_conserto: "Retorno de conserto",
  demonstracao: "Demonstração",
  industrializacao: "Industrialização",
  entrega_futura: "Entrega futura",
  outra: "Outra operação",
};

const ibsCbsConfigurationLabels: Record<string, string> = {
  sim: "Sim",
  nao: "Não",
  parcialmente: "Parcialmente",
  nao_sei: "Não sei",
  configurado: "Configurado",
  nao_configurado: "Não configurado",
  em_configuracao: "Em configuração",
};

const accountingGuidanceLabels: Record<string, string> = {
  sim: "Sim",
  nao: "Não",
  parcialmente: "Parcialmente",
  nao_sei: "Não sei",
  sim_verbalmente: "Sim, verbalmente",
  sim_documentado: "Sim, documentado",
  ainda_nao: "Ainda não",
};

const ibsCbsTestedLabels: Record<string, string> = {
  sim: "Sim",
  nao: "Não",
  parcialmente: "Parcialmente",
  nao_sei: "Não sei",
};

const errorMessages: Record<string, string> = {
  "prazo-obrigatorio":
    "Informe o prazo previsto para conclusão.",

  "prazo-invalido":
    "O prazo informado é inválido.",

  "nao-foi-possivel-iniciar":
    "Não foi possível iniciar a análise.",

  "diagnostico-nao-encontrado":
    "O diagnóstico não foi encontrado.",

  "analise-bloqueada":
    "A análise não pode ser alterada na situação atual.",

  "nao-foi-possivel-salvar-analise":
    "Não foi possível salvar a análise técnica.",

  "status-documento-invalido":
    "A situação escolhida para o documento é inválida.",

  "motivo-substituicao-obrigatorio":
    "Informe o motivo da substituição do documento.",

  "documento-nao-encontrado":
    "O documento não foi encontrado.",

  "nao-foi-possivel-revisar-documento":
    "Não foi possível salvar a revisão do documento.",

  "mensagem-obrigatoria":
    "Digite a mensagem antes de enviar.",

  "nao-foi-possivel-enviar-mensagem":
    "Não foi possível enviar a mensagem.",

  "nao-foi-possivel-retomar":
    "Não foi possível retomar a análise.",

  "status-nao-permite-revisao-final":
    "O diagnóstico não está em análise.",

  "analise-incompleta":
    "Antes da revisão final, salve a avaliação geral, a classificação final e o parecer final.",

  "nao-foi-possivel-enviar-revisao":
    "Não foi possível encaminhar a análise para revisão final.",

  "nao-foi-possivel-retornar-analise":
    "Não foi possível devolver o diagnóstico para análise.",
};

const successMessages: Record<string, string> = {
  "analise-iniciada":
    "A análise foi iniciada com sucesso.",

  "analise-salva":
    "Rascunho da análise salvo com sucesso.",

  "documento-revisado":
    "A revisão do documento foi salva.",

  "mensagem-enviada":
    "A mensagem foi registrada.",

  "analise-retomada":
    "A análise foi retomada.",

  "enviado-para-revisao":
    "A análise foi encaminhada para revisão final.",

  "retornado-para-analise":
    "O diagnóstico retornou para a etapa de análise.",
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

function asArray(
  value: unknown,
) {
  return Array.isArray(value)
    ? value
    : [];
}

function translateValue(
  value: string,
  labels: Record<string, string>,
) {
  if (!value) {
    return "Não informado";
  }

  return (
    labels[value] ??
    value
      .replaceAll("_", " ")
      .replace(
        /^\w/,
        (character) =>
          character.toUpperCase(),
      )
  );
}

function formatDate(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "Não definido";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
  ).format(
    new Date(value),
  );
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

function formatCurrency(
  value:
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Não informado";
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(
    value / 100,
  );
}

function formatFileSize(
  sizeBytes:
    | number
    | null
    | undefined,
) {
  if (
    sizeBytes === null ||
    sizeBytes === undefined
  ) {
    return "Tamanho não informado";
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} bytes`;
  }

  if (
    sizeBytes <
    1024 * 1024
  ) {
    return `${(
      sizeBytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    sizeBytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}

export default async function DiagnosticPage({
  params,
  searchParams,
}: DiagnosticPageProps) {
  const { id } =
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
    data: diagnostic,
    error: diagnosticError,
  } = await supabase
    .from("diagnostics")
    .select(
      `
        id,
        code,
        status,
        service_type,
        document_limit,
        final_classification,
        public_summary,
        client_deadline_at,
        submitted_at,
        analysis_started_at,
        completed_at,
        released_at,
        created_at,
        company_id,
        order_id
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (
    diagnosticError ||
    !diagnostic
  ) {
    notFound();
  }

  const [
    {
      data: company,
    },

    {
      data: questionnaire,
    },

    {
      data: documents,
    },

    {
      data: analysis,
    },

    {
      data: messages,
    },

    {
      data: history,
    },
  ] = await Promise.all([
    supabase
      .from("companies")
      .select(
        `
          legal_name,
          trade_name,
          cnpj,
          tax_regime,
          city,
          state,
          erp_name,
          main_activity,
          email,
          phone
        `,
      )
      .eq(
        "id",
        diagnostic.company_id,
      )
      .maybeSingle(),

    supabase
      .from(
        "diagnostic_questionnaires",
      )
      .select(
        `
          answers,
          submitted_at,
          updated_at
        `,
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
          category,
          file_name,
          storage_path,
          mime_type,
          size_bytes,
          counts_toward_limit,
          status,
          review_note,
          created_at
        `,
      )
      .eq(
        "diagnostic_id",
        diagnostic.id,
      )
      .order(
        "created_at",
        {
          ascending: true,
        },
      ),

    supabase
      .from(
        "diagnostic_analysis",
      )
      .select(
        `
          id,
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

    supabase
      .from(
        "diagnostic_messages",
      )
      .select(
        `
          id,
          sender_role,
          body,
          visible_to_client,
          created_at
        `,
      )
      .eq(
        "diagnostic_id",
        diagnostic.id,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),

    supabase
      .from(
        "diagnostic_status_history",
      )
      .select(
        `
          id,
          old_status,
          new_status,
          note,
          created_at
        `,
      )
      .eq(
        "diagnostic_id",
        diagnostic.id,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),
  ]);

  let order: {
    amount_cents: number;
    status: string;
    paid_at: string | null;
    product_id: string;
  } | null = null;

  if (
    diagnostic.order_id
  ) {
    const {
      data,
    } =
      await supabase
        .from("orders")
        .select(
          `
            amount_cents,
            status,
            paid_at,
            product_id
          `,
        )
        .eq(
          "id",
          diagnostic.order_id,
        )
        .maybeSingle();

    order = data;
  }

  let productName =
    "Diagnóstico Expresso IBS/CBS";

  if (
    order?.product_id
  ) {
    const {
      data: product,
    } =
      await supabase
        .from("products")
        .select("name")
        .eq(
          "id",
          order.product_id,
        )
        .maybeSingle();

    if (
      product?.name
    ) {
      productName =
        product.name;
    }
  }

  const documentsWithUrls =
    await Promise.all(
      (documents ?? []).map(
        async (document) => {
          const {
            data,
          } =
            await supabase.storage
              .from(
                "diagnostic-documents",
              )
              .createSignedUrl(
                document.storage_path,
                600,
              );

          return {
            ...document,

            signedUrl:
              data?.signedUrl ??
              null,
          };
        },
      ),
    );

  const answers =
    asRecord(
      questionnaire?.answers,
    );

  const express =
    asRecord(
      answers.express,
    );

  const companyAnswers =
    asRecord(
      express.company,
    );

  const preparation =
    asRecord(
      express.preparation,
    );

  const guidance =
    asRecord(
      express.guidance,
    );

  const documentContexts =
    asArray(
      express.documents,
    )
      .map(asRecord)
      .filter(
        (context) =>
          asString(
            context.documentId,
          ).length > 0,
      );

  const contextByDocumentId =
    new Map(
      documentContexts.map(
        (context) => [
          asString(
            context.documentId,
          ),
          context,
        ],
      ),
    );

  const xmlDocuments =
    documentsWithUrls.filter(
      (document) =>
        document.category ===
          "xml" &&
        document.counts_toward_limit &&
        document.status !==
          "rejected",
    );

  const savedOperations =
    asArray(
      analysis?.operations,
    ).map(asRecord);

  const operationRows =
    xmlDocuments.map(
      (
        document,
        index,
      ) => {
        const context =
          contextByDocumentId.get(
            document.id,
          ) ?? {};

        const saved =
          savedOperations[
            index
          ] ?? {};

        const operationType =
          asString(
            context.operationType,
          );

        return {
          documentId:
            document.id,

          fileName:
            document.file_name,

          signedUrl:
            document.signedUrl,

          operationType,

          operation:
            asString(
              saved.operation,
            ) ||
            translateValue(
              operationType,
              operationLabels,
            ),

          cfop:
            asString(
              saved.cfop,
            ),

          result:
            asString(
              saved.result,
            ) ||
            "pending",

          technicalAnalysis:
            asString(
              saved.technical_analysis,
            ),

          recommendation:
            asString(
              saved.recommendation,
            ),

          whySelected:
            asString(
              context.whySelected,
            ),

          ibsCbsTested:
            asString(
              context.ibsCbsTested,
            ),

          importantNotes:
            asString(
              context.importantNotes,
            ),

          hasRejection:
            asBoolean(
              context.hasRejection,
            ),

          rejectionDescription:
            asString(
              context.rejectionDescription,
            ),
        };
      },
    );

  const legalName =
    asString(
      companyAnswers.legalName,
    ) ||
    company?.legal_name ||
    company?.trade_name ||
    "";

  const cnpj =
    asString(
      companyAnswers.cnpj,
    ) ||
    company?.cnpj ||
    "";

  const city =
    asString(
      companyAnswers.city,
    ) ||
    company?.city ||
    "";

  const state =
    asString(
      companyAnswers.state,
    ) ||
    company?.state ||
    "";

  const taxRegime =
    asString(
      companyAnswers.taxRegime,
    ) ||
    company?.tax_regime ||
    "";

  const mainActivity =
    asString(
      companyAnswers.mainActivity,
    ) ||
    company?.main_activity ||
    "";

  const businessContext =
    asString(
      companyAnswers.businessContext,
    );

  const contactName =
    asString(
      companyAnswers.contactName,
    );

  const contactValue =
    asString(
      companyAnswers.contactValue,
    ) ||
    company?.email ||
    company?.phone ||
    "";

  const erpName =
    asString(
      preparation.erpName,
    ) ||
    company?.erp_name ||
    "";

  const erpVersion =
    asString(
      preparation.erpVersion,
    );

  const ibsCbsConfiguration =
    asString(
      preparation.ibsCbsConfiguration,
    );

  const accountingGuidance =
    asString(
      preparation.accountingGuidance,
    );

  const preparationNotes =
    asString(
      preparation.preparationNotes,
    );

  const mainQuestion =
    asString(
      guidance.mainQuestion,
    );

  const practicalDecision =
    asString(
      guidance.practicalDecision,
    );

  const additionalInformation =
    asString(
      guidance.additionalInformation,
    );

  const mainDocumentCount =
    xmlDocuments.length;

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const canEditAnalysis =
    [
      "documents_received",
      "under_review",
      "client_action_required",
      "awaiting_approval",
    ].includes(
      diagnostic.status,
    );

  const reviewReady =
    Boolean(
      analysis?.final_classification &&
        analysis?.general_assessment?.trim() &&
        analysis?.final_opinion?.trim(),
    );

  const analysisSaved =
    Boolean(
      analysis?.updated_at,
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
              href="/torre"
              className={
                styles.backButton
              }
            >
              Voltar ao painel
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
            <Link href="/torre">
              Painel
            </Link>

            <span>
              /
            </span>

            <strong>
              {
                diagnostic.code
              }
            </strong>
          </nav>

          <section
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
                {
                  productName
                }
              </p>

              <h1>
                {
                  diagnostic.code
                }
              </h1>

              <p>
                Analise os XMLs enviados,
                registre suas conclusões e
                prepare o resultado para o
                cliente.
              </p>
            </div>

            <div
              className={
                styles.heroActions
              }
            >
              <Link
                className={
                  styles.secondaryAction
                }
                href={`/torre/diagnosticos/${diagnostic.id}/questionario`}
              >
                Ver informações enviadas
              </Link>

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
                "Operação concluída com sucesso."}
            </div>
          ) : null}

          <section
            className={
              styles.workflow
            }
          >
            <article
              className={
                styles.workflowDone
              }
            >
              <span>
                1
              </span>

              <div>
                <strong>
                  Material recebido
                </strong>

                <small>
                  Questionário e XMLs
                </small>
              </div>
            </article>

            <article
              className={
                diagnostic.status ===
                  "under_review"
                  ? styles.workflowCurrent
                  : styles.workflowDone
              }
            >
              <span>
                2
              </span>

              <div>
                <strong>
                  Análise técnica
                </strong>

                <small>
                  Conferência e parecer
                </small>
              </div>
            </article>

            <article
              className={
                [
                  "awaiting_approval",
                  "completed",
                ].includes(
                  diagnostic.status,
                )
                  ? styles.workflowDone
                  : styles.workflowPending
              }
            >
              <span>
                3
              </span>

              <div>
                <strong>
                  Revisão final
                </strong>

                <small>
                  Conferência antes da entrega
                </small>
              </div>
            </article>
          </section>

          <section
            className={
              styles.summaryGrid
            }
          >
            <article>
              <span>
                Empresa
              </span>

              <strong>
                {legalName ||
                  "Não informada"}
              </strong>

              <small>
                {cnpj ||
                  "CNPJ não informado"}
              </small>
            </article>

            <article>
              <span>
                XMLs para análise
              </span>

              <strong>
                {
                  mainDocumentCount
                }{" "}
                de{" "}
                {
                  diagnostic.document_limit
                }
              </strong>

              <small>
                Arquivos do escopo contratado
              </small>
            </article>

            <article>
              <span>
                Prazo previsto
              </span>

              <strong>
                {formatDate(
                  diagnostic.client_deadline_at,
                )}
              </strong>

              <small>
                {diagnostic.analysis_started_at
                  ? `Iniciada em ${formatDate(
                      diagnostic.analysis_started_at,
                    )}`
                  : "Análise ainda não iniciada"}
              </small>
            </article>

            <article>
              <span>
                Rascunho
              </span>

              <strong>
                {analysisSaved
                  ? "Salvo"
                  : "Ainda não salvo"}
              </strong>

              <small>
                {analysis?.updated_at
                  ? `Atualizado em ${formatDateTime(
                      analysis.updated_at,
                    )}`
                  : "Comece pela análise da NF-e"}
              </small>
            </article>
          </section>

          <div
            className={
              styles.mainGrid
            }
          >
            <section
              className={
                styles.primaryColumn
              }
            >
              <article
                className={
                  styles.card
                }
              >
                <header
                  className={
                    styles.cardHeader
                  }
                >
                  <div>
                    <p
                      className={
                        styles.eyebrow
                      }
                    >
                      1. Material recebido
                    </p>

                    <h2>
                      Contexto do cliente
                    </h2>

                    <p
                      className={
                        styles.cardDescription
                      }
                    >
                      Consulte as informações
                      essenciais antes de
                      iniciar a conferência dos
                      XMLs.
                    </p>
                  </div>

                  <Link
                    className={
                      styles.secondaryAction
                    }
                    href={`/torre/diagnosticos/${diagnostic.id}/questionario`}
                  >
                    Ver questionário
                  </Link>
                </header>

                <div
                  className={
                    styles.contextGrid
                  }
                >
                  <div>
                    <span>
                      Razão social
                    </span>

                    <strong>
                      {legalName ||
                        "Não informada"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Regime tributário
                    </span>

                    <strong>
                      {translateValue(
                        taxRegime,
                        taxRegimeLabels,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Localização
                    </span>

                    <strong>
                      {city &&
                      state
                        ? `${city} – ${state}`
                        : "Não informada"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      ERP
                    </span>

                    <strong>
                      {erpName ||
                        "Não informado"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Versão do ERP
                    </span>

                    <strong>
                      {erpVersion ||
                        "Não informada"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Preparação IBS/CBS
                    </span>

                    <strong>
                      {translateValue(
                        ibsCbsConfiguration,
                        ibsCbsConfigurationLabels,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Orientação contábil
                    </span>

                    <strong>
                      {translateValue(
                        accountingGuidance,
                        accountingGuidanceLabels,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Contato
                    </span>

                    <strong>
                      {contactName ||
                        contactValue ||
                        "Não informado"}
                    </strong>
                  </div>
                </div>

                <div
                  className={
                    styles.contextText
                  }
                >
                  <div>
                    <span>
                      Atividade principal
                    </span>

                    <p>
                      {mainActivity ||
                        "Não informada"}
                    </p>
                  </div>

                  <div>
                    <span>
                      Contexto do negócio
                    </span>

                    <p>
                      {businessContext ||
                        "Não informado"}
                    </p>
                  </div>

                  {preparationNotes ? (
                    <div>
                      <span>
                        Observações da preparação
                      </span>

                      <p>
                        {
                          preparationNotes
                        }
                      </p>
                    </div>
                  ) : null}

                  {mainQuestion ||
                  practicalDecision ||
                  additionalInformation ? (
                    <div>
                      <span>
                        Dúvidas ou orientação
                        solicitada
                      </span>

                      {mainQuestion ? (
                        <p>
                          <strong>
                            Dúvida:
                          </strong>{" "}
                          {
                            mainQuestion
                          }
                        </p>
                      ) : null}

                      {practicalDecision ? (
                        <p>
                          <strong>
                            Decisão prática:
                          </strong>{" "}
                          {
                            practicalDecision
                          }
                        </p>
                      ) : null}

                      {additionalInformation ? (
                        <p>
                          <strong>
                            Informação adicional:
                          </strong>{" "}
                          {
                            additionalInformation
                          }
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>

              <article
                className={
                  styles.analysisCard
                }
              >
                <header
                  className={
                    styles.cardHeader
                  }
                >
                  <div>
                    <p
                      className={
                        styles.eyebrow
                      }
                    >
                      2. Análise técnica
                    </p>

                    <h2>
                      Conferência das NF-e
                    </h2>

                    <p
                      className={
                        styles.cardDescription
                      }
                    >
                      Existe um bloco de
                      análise para cada XML
                      enviado pelo cliente.
                    </p>
                  </div>

                  <span
                    className={
                      styles.analysisCount
                    }
                  >
                    {
                      operationRows.length
                    }{" "}
                    {operationRows.length ===
                    1
                      ? "NF-e"
                      : "NF-e"}
                  </span>
                </header>

                {operationRows.length >
                0 ? (
                  <form
                    className={
                      styles.analysisForm
                    }
                    action={
                      saveAnalysis
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
                      name="operationCount"
                      value={
                        operationRows.length
                      }
                    />

                    <div
                      className={
                        styles.operationList
                      }
                    >
                      {operationRows.map(
                        (
                          operation,
                          index,
                        ) => (
                          <section
                            className={
                              styles.operationCard
                            }
                            key={
                              operation.documentId
                            }
                          >
                            <header
                              className={
                                styles.operationHeader
                              }
                            >
                              <div>
                                <span
                                  className={
                                    styles.operationNumber
                                  }
                                >
                                  NF-e{" "}
                                  {
                                    index +
                                    1
                                  }
                                </span>

                                <h3>
                                  {
                                    operation.fileName
                                  }
                                </h3>

                                <p>
                                  {
                                    operation.operation
                                  }
                                </p>
                              </div>

                              {operation.signedUrl ? (
                                <a
                                  className={
                                    styles.xmlButton
                                  }
                                  href={
                                    operation.signedUrl
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Abrir XML
                                </a>
                              ) : (
                                <span
                                  className={
                                    styles.fileUnavailable
                                  }
                                >
                                  XML indisponível
                                </span>
                              )}
                            </header>

                            <div
                              className={
                                styles.clientContext
                              }
                            >
                              <div>
                                <span>
                                  Por que o cliente
                                  escolheu esta NF-e?
                                </span>

                                <p>
                                  {operation.whySelected ||
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
                                    operation.ibsCbsTested,
                                    ibsCbsTestedLabels,
                                  )}
                                </p>
                              </div>

                              {operation.importantNotes ? (
                                <div
                                  className={
                                    styles.contextWide
                                  }
                                >
                                  <span>
                                    Observações do cliente
                                  </span>

                                  <p>
                                    {
                                      operation.importantNotes
                                    }
                                  </p>
                                </div>
                              ) : null}

                              {operation.hasRejection ? (
                                <div
                                  className={
                                    styles.contextWide
                                  }
                                >
                                  <span>
                                    Erro ou rejeição
                                  </span>

                                  <p>
                                    {operation.rejectionDescription ||
                                      "Cliente informou ocorrência de erro ou rejeição."}
                                  </p>
                                </div>
                              ) : null}
                            </div>

                            <input
                              type="hidden"
                              name={`operation_${index}_name`}
                              value={
                                operation.operation
                              }
                            />

                            <input
                              type="hidden"
                              name={`operation_${index}_frequency`}
                              value=""
                            />

                            <div
                              className={
                                styles.operationFields
                              }
                            >
                              <label>
                                <span>
                                  CFOP identificado
                                </span>

                                <input
                                  type="text"
                                  name={`operation_${index}_cfop`}
                                  defaultValue={
                                    operation.cfop
                                  }
                                  disabled={
                                    !canEditAnalysis
                                  }
                                  placeholder="Ex.: 5.102"
                                />

                                <small>
                                  Informe o CFOP que
                                  você conferiu no XML.
                                </small>
                              </label>

                              <label>
                                <span>
                                  Resultado da NF-e
                                </span>

                                <select
                                  name={`operation_${index}_result`}
                                  defaultValue={
                                    operation.result
                                  }
                                  disabled={
                                    !canEditAnalysis
                                  }
                                >
                                  {Object.entries(
                                    operationResultLabels,
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
                                  Classifique somente
                                  depois de conferir o
                                  XML.
                                </small>
                              </label>

                              <label
                                className={
                                  styles.fullField
                                }
                              >
                                <span>
                                  O que foi encontrado
                                  nesta NF-e?
                                </span>

                                <textarea
                                  name={`operation_${index}_analysis`}
                                  defaultValue={
                                    operation.technicalAnalysis
                                  }
                                  disabled={
                                    !canEditAnalysis
                                  }
                                  placeholder="Ex.: XML autorizado, porém os campos de IBS/CBS não foram preenchidos. CST e cClassTrib precisam ser confirmados com a contabilidade."
                                />

                                <small>
                                  Registre a conferência
                                  técnica: CFOP, CST,
                                  cClassTrib, IBS, CBS,
                                  base, alíquotas,
                                  totalização e
                                  parametrização.
                                </small>
                              </label>

                              <label
                                className={
                                  styles.fullField
                                }
                              >
                                <span>
                                  O que o cliente deve
                                  fazer?
                                </span>

                                <textarea
                                  name={`operation_${index}_recommendation`}
                                  defaultValue={
                                    operation.recommendation
                                  }
                                  disabled={
                                    !canEditAnalysis
                                  }
                                  placeholder="Ex.: Solicitar à contabilidade a validação do CST e cClassTrib e revisar a parametrização no ERP antes das próximas emissões."
                                />

                                <small>
                                  Escreva a recomendação
                                  de forma prática e
                                  objetiva.
                                </small>
                              </label>
                            </div>
                          </section>
                        ),
                      )}
                    </div>

                    <section
                      className={
                        styles.conclusionSection
                      }
                    >
                      <header
                        className={
                          styles.conclusionHeader
                        }
                      >
                        <p
                          className={
                            styles.eyebrow
                          }
                        >
                          3. Conclusão
                        </p>

                        <h3>
                          Resultado consolidado
                        </h3>

                        <p>
                          Depois de analisar as
                          NF-e, resuma aqui a
                          situação geral da
                          empresa.
                        </p>
                      </header>

                      <div
                        className={
                          styles.analysisFields
                        }
                      >
                        <label
                          className={
                            styles.fullField
                          }
                        >
                          <span>
                            Avaliação geral *
                          </span>

                          <textarea
                            name="generalAssessment"
                            defaultValue={
                              analysis?.general_assessment ??
                              ""
                            }
                            disabled={
                              !canEditAnalysis
                            }
                            placeholder="Resuma a situação encontrada considerando os XMLs analisados, a preparação do ERP e as informações fornecidas pelo cliente."
                          />

                          <small>
                            Este campo será usado
                            na conclusão do
                            diagnóstico.
                          </small>
                        </label>

                        <label
                          className={
                            styles.fullField
                          }
                        >
                          <span>
                            Pontos positivos
                          </span>

                          <textarea
                            name="strengths"
                            defaultValue={
                              analysis?.strengths ??
                              ""
                            }
                            disabled={
                              !canEditAnalysis
                            }
                            placeholder="Registre o que já está adequado ou representa um ponto positivo."
                          />
                        </label>

                        <label
                          className={
                            styles.fullField
                          }
                        >
                          <span>
                            Riscos identificados
                          </span>

                          <textarea
                            name="risks"
                            defaultValue={
                              analysis?.risks ??
                              ""
                            }
                            disabled={
                              !canEditAnalysis
                            }
                            placeholder="Liste os principais riscos fiscais, técnicos ou operacionais identificados."
                          />
                        </label>

                        <label
                          className={
                            styles.fullField
                          }
                        >
                          <span>
                            Plano de ação
                          </span>

                          <textarea
                            name="actionPlan"
                            defaultValue={
                              analysis?.action_plan ??
                              ""
                            }
                            disabled={
                              !canEditAnalysis
                            }
                            placeholder="Liste as ações recomendadas em ordem de prioridade."
                          />
                        </label>

                        <label
                          className={
                            styles.classificationField
                          }
                        >
                          <span>
                            Classificação final *
                          </span>

                          <select
                            name="finalClassification"
                            defaultValue={
                              analysis?.final_classification ??
                              ""
                            }
                            disabled={
                              !canEditAnalysis
                            }
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
                            styles.fullField
                          }
                        >
                          <span>
                            Parecer final *
                          </span>

                          <textarea
                            name="finalOpinion"
                            defaultValue={
                              analysis?.final_opinion ??
                              ""
                            }
                            disabled={
                              !canEditAnalysis
                            }
                            placeholder="Escreva a conclusão profissional que será apresentada ao cliente."
                          />

                          <small>
                            Deve refletir somente o
                            escopo e os documentos
                            efetivamente analisados.
                          </small>
                        </label>
                      </div>
                    </section>

                    {canEditAnalysis ? (
                      <div
                        className={
                          styles.saveArea
                        }
                      >
                        <div>
                          <strong>
                            Salve antes de sair
                          </strong>

                          <p>
                            Você pode salvar o
                            rascunho quantas vezes
                            precisar antes da
                            revisão final.
                          </p>
                        </div>

                        <button
                          type="submit"
                        >
                          Salvar rascunho
                        </button>
                      </div>
                    ) : null}
                  </form>
                ) : (
                  <div
                    className={
                      styles.emptyState
                    }
                  >
                    Nenhum XML principal
                    disponível para análise.
                  </div>
                )}
              </article>

              <article
                className={
                  styles.card
                }
              >
                <header
                  className={
                    styles.cardHeader
                  }
                >
                  <div>
                    <p
                      className={
                        styles.eyebrow
                      }
                    >
                      Apoio
                    </p>

                    <h2>
                      Controle dos arquivos
                    </h2>

                    <p
                      className={
                        styles.cardDescription
                      }
                    >
                      Use esta área apenas para
                      aprovar arquivos ou
                      solicitar substituição ao
                      cliente.
                    </p>
                  </div>

                  <span
                    className={
                      styles.analysisCount
                    }
                  >
                    {
                      documentsWithUrls.length
                    }{" "}
                    arquivo(s)
                  </span>
                </header>

                {documentsWithUrls.length >
                0 ? (
                  <div
                    className={
                      styles.documentReviewList
                    }
                  >
                    {documentsWithUrls.map(
                      (document) => (
                        <article
                          className={
                            styles.documentReviewCard
                          }
                          key={
                            document.id
                          }
                        >
                          <header>
                            <div>
                              <strong>
                                {
                                  document.file_name
                                }
                              </strong>

                              <span>
                                {categoryLabels[
                                  document.category
                                ] ??
                                  document.category}
                              </span>

                              <small>
                                {formatFileSize(
                                  document.size_bytes,
                                )}
                                {" • "}
                                {formatDateTime(
                                  document.created_at,
                                )}
                              </small>
                            </div>

                            {document.signedUrl ? (
                              <a
                                href={
                                  document.signedUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                Abrir arquivo
                              </a>
                            ) : (
                              <span>
                                Indisponível
                              </span>
                            )}
                          </header>

                          <form
                            className={
                              styles.documentReviewForm
                            }
                            action={
                              updateDocumentReview
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

                            <label>
                              <span>
                                Situação
                              </span>

                              <select
                                name="status"
                                defaultValue={
                                  document.status
                                }
                              >
                                {Object.entries(
                                  documentStatusLabels,
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
                            </label>

                            <label
                              className={
                                styles.documentNote
                              }
                            >
                              <span>
                                Observação
                              </span>

                              <textarea
                                name="reviewNote"
                                defaultValue={
                                  document.review_note ??
                                  ""
                                }
                                placeholder="Preencha somente quando precisar registrar uma observação ou solicitar substituição."
                              />
                            </label>

                            <button
                              type="submit"
                            >
                              Salvar
                            </button>
                          </form>
                        </article>
                      ),
                    )}
                  </div>
                ) : (
                  <div
                    className={
                      styles.emptyState
                    }
                  >
                    Nenhum documento enviado.
                  </div>
                )}
              </article>

              <article
                className={
                  styles.card
                }
              >
                <header
                  className={
                    styles.cardHeader
                  }
                >
                  <div>
                    <p
                      className={
                        styles.eyebrow
                      }
                    >
                      Comunicação
                    </p>

                    <h2>
                      Mensagens ao cliente
                    </h2>

                    <p
                      className={
                        styles.cardDescription
                      }
                    >
                      Use somente quando precisar
                      registrar uma orientação ou
                      solicitar alguma ação.
                    </p>
                  </div>
                </header>

                <form
                  className={
                    styles.messageForm
                  }
                  action={
                    sendMessage
                  }
                >
                  <input
                    type="hidden"
                    name="diagnosticId"
                    value={
                      diagnostic.id
                    }
                  />

                  <label>
                    <span>
                      Nova mensagem
                    </span>

                    <textarea
                      name="body"
                      required
                      placeholder="Digite a mensagem."
                    />
                  </label>

                  <div
                    className={
                      styles.messageOptions
                    }
                  >
                    <label>
                      <input
                        type="checkbox"
                        name="visibleToClient"
                        defaultChecked
                      />

                      <span>
                        Visível ao cliente
                      </span>
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        name="requiresAction"
                      />

                      <span>
                        Exige ação do cliente
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                  >
                    Registrar mensagem
                  </button>
                </form>

                {(messages ?? []).length >
                0 ? (
                  <div
                    className={
                      styles.messageList
                    }
                  >
                    {(messages ?? []).map(
                      (message) => (
                        <article
                          key={
                            message.id
                          }
                        >
                          <header>
                            <strong>
                              {message.sender_role ===
                              "admin"
                                ? "Administração"
                                : message.sender_role ===
                                    "client"
                                  ? "Cliente"
                                  : "Sistema"}
                            </strong>

                            <span>
                              {formatDateTime(
                                message.created_at,
                              )}
                            </span>
                          </header>

                          <p>
                            {
                              message.body
                            }
                          </p>

                          <small>
                            {message.visible_to_client
                              ? "Visível ao cliente"
                              : "Anotação interna"}
                          </small>
                        </article>
                      ),
                    )}
                  </div>
                ) : (
                  <div
                    className={
                      styles.emptyState
                    }
                  >
                    Nenhuma mensagem registrada.
                  </div>
                )}
              </article>
            </section>

            <aside
              className={
                styles.secondaryColumn
              }
            >
              <section
                className={
                  styles.nextStepCard
                }
              >
                <p
                  className={
                    styles.eyebrow
                  }
                >
                  Próximo passo
                </p>

                {diagnostic.status ===
                "documents_received" ? (
                  <>
                    <h2>
                      Iniciar análise
                    </h2>

                    <p>
                      Defina o prazo e inicie a
                      análise técnica.
                    </p>

                    <form
                      action={
                        startAnalysis
                      }
                    >
                      <input
                        type="hidden"
                        name="diagnosticId"
                        value={
                          diagnostic.id
                        }
                      />

                      <label>
                        <span>
                          Prazo previsto
                        </span>

                        <input
                          type="date"
                          name="deadline"
                          min={
                            today
                          }
                          required
                        />
                      </label>

                      <button
                        type="submit"
                      >
                        Iniciar análise
                      </button>
                    </form>
                  </>
                ) : diagnostic.status ===
                  "under_review" ? (
                  <>
                    <h2>
                      Finalize sua análise
                    </h2>

                    {!analysisSaved ? (
                      <div
                        className={
                          styles.nextStepNotice
                        }
                      >
                        <strong>
                          1. Analise a NF-e
                        </strong>

                        <p>
                          Preencha os campos da
                          análise e clique em
                          <b> Salvar rascunho</b>.
                        </p>
                      </div>
                    ) : !reviewReady ? (
                      <div
                        className={
                          styles.nextStepNotice
                        }
                      >
                        <strong>
                          2. Complete a conclusão
                        </strong>

                        <p>
                          Para liberar a revisão
                          final, salve:
                        </p>

                        <ul>
                          <li>
                            Avaliação geral
                          </li>

                          <li>
                            Classificação final
                          </li>

                          <li>
                            Parecer final
                          </li>
                        </ul>
                      </div>
                    ) : (
                      <div
                        className={
                          styles.readyNotice
                        }
                      >
                        <strong>
                          Análise pronta para revisão
                        </strong>

                        <p>
                          O rascunho possui os
                          campos mínimos necessários.
                        </p>
                      </div>
                    )}

                    {reviewReady ? (
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
                        >
                          Enviar para revisão final
                        </button>
                      </form>
                    ) : (
                      <button
                        className={
                          styles.disabledButton
                        }
                        type="button"
                        disabled
                      >
                        Enviar para revisão final
                      </button>
                    )}
                  </>
                ) : diagnostic.status ===
                  "client_action_required" ? (
                  <>
                    <h2>
                      Aguardando cliente
                    </h2>

                    <p>
                      Existe uma pendência que
                      precisa ser atendida antes
                      de continuar.
                    </p>

                    <form
                      action={
                        resumeAnalysis
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
                        Pendência atendida:
                        retomar análise
                      </button>
                    </form>
                  </>
                ) : diagnostic.status ===
                  "awaiting_approval" ? (
                  <>
                    <h2>
                      Revisão final
                    </h2>

                    <p>
                      O diagnóstico está aguardando
                      a conferência final antes da
                      entrega ao cliente.
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
                        Retornar para ajustes
                      </button>
                    </form>

                    <Link
                      className={
                        styles.finalizeLink
                      }
                      href={`/torre/diagnosticos/${diagnostic.id}/finalizar`}
                    >
                      Revisar e finalizar
                    </Link>
                  </>
                ) : diagnostic.status ===
                  "completed" ? (
                  <>
                    <h2>
                      Diagnóstico concluído
                    </h2>

                    <p>
                      O resultado já foi liberado
                      ao cliente.
                    </p>
                  </>
                ) : (
                  <>
                    <h2>
                      {statusLabels[
                        diagnostic.status
                      ] ??
                        diagnostic.status}
                    </h2>

                    <p>
                      Consulte o andamento nesta
                      página.
                    </p>
                  </>
                )}
              </section>

              <section
                className={
                  styles.serviceCard
                }
              >
                <p
                  className={
                    styles.eyebrow
                  }
                >
                  Contratação
                </p>

                <dl>
                  <div>
                    <dt>
                      Produto
                    </dt>

                    <dd>
                      {
                        productName
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Valor
                    </dt>

                    <dd>
                      {formatCurrency(
                        order?.amount_cents,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Pagamento
                    </dt>

                    <dd>
                      {order?.status ===
                      "paid"
                        ? "Confirmado"
                        : order?.status ||
                          "Não informado"}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Contratado em
                    </dt>

                    <dd>
                      {formatDate(
                        diagnostic.created_at,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Classificação
                    </dt>

                    <dd>
                      {analysis?.final_classification
                        ? classificationLabels[
                            analysis.final_classification
                          ] ??
                          analysis.final_classification
                        : "Ainda não definida"}
                    </dd>
                  </div>
                </dl>
              </section>

              <section
                className={
                  styles.historyCard
                }
              >
                <p
                  className={
                    styles.eyebrow
                  }
                >
                  Histórico
                </p>

                <h2>
                  Movimentações
                </h2>

                {(history ?? []).length >
                0 ? (
                  <div
                    className={
                      styles.historyList
                    }
                  >
                    {(history ?? []).map(
                      (item) => (
                        <article
                          key={
                            item.id
                          }
                        >
                          <span />

                          <div>
                            <strong>
                              {statusLabels[
                                item.new_status
                              ] ??
                                item.new_status}
                            </strong>

                            <p>
                              {item.note ||
                                "Situação atualizada."}
                            </p>

                            <small>
                              {formatDateTime(
                                item.created_at,
                              )}
                            </small>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                ) : (
                  <p
                    className={
                      styles.noHistory
                    }
                  >
                    Nenhuma movimentação registrada.
                  </p>
                )}
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}