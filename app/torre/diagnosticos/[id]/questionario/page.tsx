// app/torre/diagnosticos/[id]/questionario/page.tsx

import type { Metadata } from "next";
import type { ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";

import { logout } from "../../../actions";

import PrintButton from "./print-button";

import styles from "./questionario.module.css";

export const metadata: Metadata = {
  title: "Questionário do diagnóstico",
};

export const dynamic = "force-dynamic";

type QuestionnairePageProps = {
  params: Promise<{
    id: string;
  }>;
};

type JsonRecord = Record<string, unknown>;

type AnswerItemProps = {
  label: string;
  value: unknown;
  wide?: boolean;
};

const statusLabels: Record<string, string> = {
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

const taxRegimeLabels: Record<string, string> = {
  mei:
    "MEI",

  simples_nacional:
    "Simples Nacional",

  lucro_presumido:
    "Lucro Presumido",

  lucro_real:
    "Lucro Real",

  outro:
    "Outro",
};

const operationLabels: Record<string, string> = {
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

const ibsCbsConfigurationLabels: Record<
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

  configurado:
    "Configurado",

  nao_configurado:
    "Não configurado",

  em_configuracao:
    "Em configuração",
};

const accountingGuidanceLabels: Record<
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

  sim_verbalmente:
    "Sim, verbalmente",

  sim_documentado:
    "Sim, com orientação documentada",

  ainda_nao:
    "Ainda não",
};

const ibsCbsTestedLabels: Record<string, string> = {
  sim:
    "Sim",

  nao:
    "Não",

  parcialmente:
    "Parcialmente",

  nao_sei:
    "Não sei",
};

const documentStatusLabels: Record<string, string> = {
  uploaded:
    "Recebido",

  under_review:
    "Em conferência",

  approved:
    "Aprovado",

  rejected:
    "Substituição necessária",
};

const sectionNavigation = [
  {
    id: "empresa",
    number: "1",
    title: "Empresa e contexto",
  },

  {
    id: "preparacao",
    number: "2",
    title: "Preparação IBS/CBS",
  },

  {
    id: "documentos",
    number: "3",
    title: "NF-e para análise",
  },

  {
    id: "orientacao",
    number: "4",
    title: "Dúvidas e orientação",
  },
];

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
): unknown[] {
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
  labels?: Record<string, string>,
) {
  if (!value) {
    return "Não informado";
  }

  if (
    labels &&
    labels[value]
  ) {
    return labels[value];
  }

  return value
    .replaceAll("_", " ")
    .replace(
      /^\w/,
      (character) =>
        character.toUpperCase(),
    );
}

function isEmptyValue(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return true;
  }

  if (
    typeof value === "string" &&
    !value.trim()
  ) {
    return true;
  }

  if (
    Array.isArray(value) &&
    value.length === 0
  ) {
    return true;
  }

  return false;
}

function formatAnswer(
  value: unknown,
): ReactNode {
  if (
    typeof value === "boolean"
  ) {
    return value
      ? "Sim"
      : "Não";
  }

  if (
    typeof value === "number"
  ) {
    return String(value);
  }

  if (
    typeof value === "string"
  ) {
    return value.trim() ||
      "Não informado";
  }

  return "Não informado";
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
      dateStyle:
        "short",

      timeStyle:
        "short",
    },
  ).format(
    new Date(value),
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

  if (
    sizeBytes < 1024
  ) {
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

function AnswerItem({
  label,
  value,
  wide = false,
}: AnswerItemProps) {
  const empty =
    isEmptyValue(value);

  return (
    <div
      className={`${styles.answerItem} ${
        wide
          ? styles.wideAnswer
          : ""
      }`}
    >
      <dt>
        {label}
      </dt>

      <dd
        className={
          empty
            ? styles.emptyAnswer
            : ""
        }
      >
        {formatAnswer(
          value,
        )}
      </dd>
    </div>
  );
}

function DocumentSection({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string;
  number: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={
        styles.documentSection
      }
    >
      <header
        className={
          styles.sectionHeader
        }
      >
        <span
          className={
            styles.sectionNumber
          }
        >
          {number}
        </span>

        <div>
          <h2>
            {title}
          </h2>

          {description ? (
            <p>
              {description}
            </p>
          ) : null}
        </div>
      </header>

      <div
        className={
          styles.sectionBody
        }
      >
        {children}
      </div>
    </section>
  );
}

export default async function QuestionnairePage({
  params,
}: QuestionnairePageProps) {
  const { id } =
    await params;

  const {
    supabase,
    profile,
  } = await requireAdmin();

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
        company_id,
        document_limit,
        created_at
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
      error: documentsError,
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
          ascending:
            true,
        },
      ),
  ]);

  if (
    documentsError
  ) {
    console.error(
      "Erro ao carregar documentos:",
      documentsError,
    );
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

  const documentById =
    new Map(
      documentsWithUrls.map(
        (document) => [
          document.id,
          document,
        ],
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

  const documentContexts =
    asArray(
      express.documents,
    )
      .map(asRecord)
      .filter(
        (document) =>
          asString(
            document.documentId,
          ).length > 0,
      );

  const guidance =
    asRecord(
      express.guidance,
    );

  const companyName =
    asString(
      companyAnswers.legalName,
    ) ||
    company?.legal_name ||
    company?.trade_name ||
    "Empresa não informada";

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

  const erpName =
    asString(
      preparation.erpName,
    ) ||
    company?.erp_name ||
    "";

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

  const businessContext =
    asString(
      companyAnswers.businessContext,
    );

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

  const informationConfirmation =
    asBoolean(
      guidance.informationConfirmation,
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
                {profile.full_name}
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

            <Link
              href={`/torre/diagnosticos/${diagnostic.id}`}
            >
              {diagnostic.code}
            </Link>

            <span>
              /
            </span>

            <strong>
              Questionário
            </strong>
          </nav>

          {!questionnaire ? (
            <section
              className={
                styles.emptyState
              }
            >
              <h1>
                Questionário não encontrado
              </h1>

              <p>
                Ainda não existem
                respostas salvas para
                este diagnóstico.
              </p>
            </section>
          ) : (
            <div
              className={
                styles.workspace
              }
            >
              <aside
                className={
                  styles.sidebar
                }
              >
                <div
                  className={
                    styles.sidebarContent
                  }
                >
                  <p
                    className={
                      styles.sidebarEyebrow
                    }
                  >
                    Navegação
                  </p>

                  <strong>
                    Informações enviadas
                    pelo cliente
                  </strong>

                  <nav
                    className={
                      styles.sectionNavigation
                    }
                    aria-label="Seções do questionário"
                  >
                    {sectionNavigation.map(
                      (section) => (
                        <a
                          key={
                            section.id
                          }
                          href={`#${section.id}`}
                        >
                          <span>
                            {
                              section.number
                            }
                          </span>

                          {
                            section.title
                          }
                        </a>
                      ),
                    )}
                  </nav>

                  <div
                    className={
                      styles.sidebarActions
                    }
                  >
                    <PrintButton />

                    <Link
                      href={`/torre/diagnosticos/${diagnostic.id}`}
                    >
                      Voltar para análise
                    </Link>
                  </div>
                </div>
              </aside>

              <article
                className={
                  styles.document
                }
              >
                <header
                  className={
                    styles.documentHeader
                  }
                >
                  <div
                    className={
                      styles.documentHeading
                    }
                  >
                    <p
                      className={
                        styles.eyebrow
                      }
                    >
                      Diagnóstico Expresso
                      IBS/CBS
                    </p>

                    <h1>
                      Informações para
                      análise
                    </h1>

                    <p>
                      Dados, contexto,
                      documentos e dúvidas
                      enviados pelo cliente
                      para realização do
                      diagnóstico.
                    </p>
                  </div>

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
                </header>

                <section
                  className={
                    styles.documentIdentification
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
                      {cnpj ||
                        "Não informado"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Enviado em
                    </span>

                    <strong>
                      {formatDateTime(
                        questionnaire.submitted_at,
                      )}
                    </strong>
                  </div>
                </section>

                <section
                  className={
                    styles.riskSummary
                  }
                >
                  <header>
                    <p
                      className={
                        styles.eyebrow
                      }
                    >
                      Resumo do diagnóstico
                    </p>

                    <h2>
                      Contexto recebido
                    </h2>
                  </header>

                  <div
                    className={
                      styles.summaryGrid
                    }
                  >
                    <article>
                      <span>
                        Regime tributário
                      </span>

                      <strong>
                        {translateValue(
                          taxRegime,
                          taxRegimeLabels,
                        )}
                      </strong>
                    </article>

                    <article>
                      <span>
                        ERP utilizado
                      </span>

                      <strong>
                        {erpName ||
                          "Não informado"}
                      </strong>
                    </article>

                    <article>
                      <span>
                        Preparação IBS/CBS
                      </span>

                      <strong>
                        {translateValue(
                          ibsCbsConfiguration,
                          ibsCbsConfigurationLabels,
                        )}
                      </strong>
                    </article>

                    <article>
                      <span>
                        XMLs principais
                      </span>

                      <strong>
                        {
                          documentContexts.length
                        }{" "}
                        de{" "}
                        {
                          diagnostic.document_limit
                        }
                      </strong>
                    </article>
                  </div>
                </section>

                <div
                  className={
                    styles.documentSections
                  }
                >
                  <DocumentSection
                    id="empresa"
                    number="1"
                    title="Empresa e contexto"
                    description="Identificação e informações gerais fornecidas pelo cliente."
                  >
                    <dl
                      className={
                        styles.answerGrid
                      }
                    >
                      <AnswerItem
                        label="Razão social"
                        value={
                          companyName
                        }
                      />

                      <AnswerItem
                        label="CNPJ"
                        value={
                          cnpj
                        }
                      />

                      <AnswerItem
                        label="Município"
                        value={
                          city
                        }
                      />

                      <AnswerItem
                        label="Estado"
                        value={
                          state
                        }
                      />

                      <AnswerItem
                        label="Regime tributário"
                        value={
                          translateValue(
                            taxRegime,
                            taxRegimeLabels,
                          )
                        }
                      />

                      <AnswerItem
                        label="Atividade principal"
                        value={
                          mainActivity
                        }
                        wide
                      />

                      <AnswerItem
                        label="Responsável pelo contato"
                        value={
                          contactName
                        }
                      />

                      <AnswerItem
                        label="Contato"
                        value={
                          contactValue
                        }
                      />

                      <AnswerItem
                        label="Contexto do negócio e do faturamento"
                        value={
                          businessContext
                        }
                        wide
                      />
                    </dl>
                  </DocumentSection>

                  <DocumentSection
                    id="preparacao"
                    number="2"
                    title="Preparação para IBS/CBS"
                    description="Situação informada pelo cliente quanto ao ERP, parametrização e orientação tributária."
                  >
                    <dl
                      className={
                        styles.answerGrid
                      }
                    >
                      <AnswerItem
                        label="ERP ou sistema emissor"
                        value={
                          erpName
                        }
                      />

                      <AnswerItem
                        label="Versão do ERP"
                        value={
                          erpVersion
                        }
                      />

                      <AnswerItem
                        label="Configuração para IBS/CBS"
                        value={
                          translateValue(
                            ibsCbsConfiguration,
                            ibsCbsConfigurationLabels,
                          )
                        }
                      />

                      <AnswerItem
                        label="Orientação da contabilidade"
                        value={
                          translateValue(
                            accountingGuidance,
                            accountingGuidanceLabels,
                          )
                        }
                      />

                      <AnswerItem
                        label="Observações sobre a preparação"
                        value={
                          preparationNotes
                        }
                        wide
                      />
                    </dl>
                  </DocumentSection>

                  <DocumentSection
                    id="documentos"
                    number="3"
                    title="NF-e para análise"
                    description="XMLs escolhidos pelo cliente e contexto informado para cada operação."
                  >
                    {documentContexts.length >
                    0 ? (
                      <div>
                        {documentContexts.map(
                          (
                            context,
                            index,
                          ) => {
                            const documentId =
                              asString(
                                context.documentId,
                              );

                            const linkedDocument =
                              documentById.get(
                                documentId,
                              );

                            const operationType =
                              asString(
                                context.operationType,
                              );

                            const whySelected =
                              asString(
                                context.whySelected,
                              );

                            const ibsCbsTested =
                              asString(
                                context.ibsCbsTested,
                              );

                            const importantNotes =
                              asString(
                                context.importantNotes,
                              );

                            const hasRejection =
                              asBoolean(
                                context.hasRejection,
                              );

                            const rejectionDescription =
                              asString(
                                context.rejectionDescription,
                              );

                            const fileName =
                              linkedDocument?.file_name ||
                              asString(
                                context.fileName,
                              ) ||
                              `XML ${index + 1}`;

                            return (
                              <section
                                key={
                                  documentId ||
                                  `document-${index}`
                                }
                                style={{
                                  marginBottom:
                                    index <
                                    documentContexts.length -
                                      1
                                      ? "32px"
                                      : "0",
                                }}
                              >
                                <h3
                                  className={
                                    styles.subsectionTitle
                                  }
                                >
                                  NF-e{" "}
                                  {
                                    index +
                                    1
                                  }{" "}
                                  —{" "}
                                  {
                                    fileName
                                  }
                                </h3>

                                <dl
                                  className={
                                    styles.answerGrid
                                  }
                                >
                                  <AnswerItem
                                    label="Arquivo"
                                    value={
                                      fileName
                                    }
                                  />

                                  <AnswerItem
                                    label="Situação do arquivo"
                                    value={
                                      linkedDocument
                                        ? documentStatusLabels[
                                            linkedDocument.status
                                          ] ??
                                          linkedDocument.status
                                        : "Arquivo não localizado"
                                    }
                                  />

                                  <AnswerItem
                                    label="Tipo da operação"
                                    value={
                                      translateValue(
                                        operationType,
                                        operationLabels,
                                      )
                                    }
                                  />

                                  <AnswerItem
                                    label="IBS/CBS já testado"
                                    value={
                                      translateValue(
                                        ibsCbsTested,
                                        ibsCbsTestedLabels,
                                      )
                                    }
                                  />

                                  <AnswerItem
                                    label="Motivo da escolha desta NF-e"
                                    value={
                                      whySelected
                                    }
                                    wide
                                  />

                                  <AnswerItem
                                    label="Observações ou dúvidas sobre a operação"
                                    value={
                                      importantNotes
                                    }
                                    wide
                                  />

                                  <AnswerItem
                                    label="Houve erro ou rejeição?"
                                    value={
                                      hasRejection
                                        ? "Sim"
                                        : "Não"
                                    }
                                  />

                                  <AnswerItem
                                    label="Descrição do erro ou rejeição"
                                    value={
                                      rejectionDescription
                                    }
                                  />

                                  <AnswerItem
                                    label="Identificador do documento"
                                    value={
                                      documentId
                                    }
                                    wide
                                  />
                                </dl>

                                {linkedDocument ? (
                                  <div
                                    style={{
                                      display:
                                        "flex",

                                      flexWrap:
                                        "wrap",

                                      gap:
                                        "10px",

                                      alignItems:
                                        "center",

                                      marginTop:
                                        "14px",
                                    }}
                                  >
                                    {linkedDocument.signedUrl ? (
                                      <a
                                        className={
                                          styles.backButton
                                        }
                                        href={
                                          linkedDocument.signedUrl
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Abrir XML
                                      </a>
                                    ) : (
                                      <span>
                                        Arquivo indisponível
                                      </span>
                                    )}

                                    <small>
                                      {formatFileSize(
                                        linkedDocument.size_bytes,
                                      )}
                                      {" • "}
                                      {formatDateTime(
                                        linkedDocument.created_at,
                                      )}
                                    </small>
                                  </div>
                                ) : (
                                  <p
                                    className={
                                      styles.noInformation
                                    }
                                    style={{
                                      marginTop:
                                        "14px",
                                    }}
                                  >
                                    O contexto
                                    deste XML foi
                                    encontrado no
                                    questionário,
                                    mas o registro
                                    correspondente
                                    não foi
                                    localizado em
                                    diagnostic_documents.
                                  </p>
                                )}
                              </section>
                            );
                          },
                        )}
                      </div>
                    ) : (
                      <p
                        className={
                          styles.noInformation
                        }
                      >
                        Nenhum XML foi
                        vinculado ao
                        questionário.
                      </p>
                    )}
                  </DocumentSection>

                  <DocumentSection
                    id="orientacao"
                    number="4"
                    title="Dúvidas e orientação"
                    description="Questões apresentadas pelo cliente para direcionamento da análise profissional."
                  >
                    <dl
                      className={
                        styles.answerGrid
                      }
                    >
                      <AnswerItem
                        label="Principal dúvida"
                        value={
                          mainQuestion
                        }
                        wide
                      />

                      <AnswerItem
                        label="Decisão prática em que precisa de orientação"
                        value={
                          practicalDecision
                        }
                        wide
                      />

                      <AnswerItem
                        label="Informações adicionais"
                        value={
                          additionalInformation
                        }
                        wide
                      />

                      <AnswerItem
                        label="Cliente confirmou as informações e XMLs enviados"
                        value={
                          informationConfirmation
                            ? "Sim"
                            : "Não"
                        }
                        wide
                      />
                    </dl>
                  </DocumentSection>
                </div>

                <footer
                  className={
                    styles.documentFooter
                  }
                >
                  <strong>
                    Uso interno — Torre de
                    Controle
                  </strong>

                  <p>
                    O diagnóstico deve ser
                    conduzido com base nas
                    informações fornecidas
                    pelo cliente e na
                    conferência efetiva dos
                    XMLs apresentados. A
                    autorização fiscal do
                    documento, isoladamente,
                    não comprova a
                    conformidade das
                    classificações ou da
                    parametrização
                    tributária utilizada.
                  </p>
                </footer>
              </article>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}