// app/painel/diagnosticos/[id]/page.tsx

import type {
  Metadata,
} from "next";

import Image from "next/image";
import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { logout } from "../../actions";

import MessageForm from "./mensagens/message-form";

import styles from "./diagnostico.module.css";

export const metadata: Metadata = {
  title:
    "Detalhes do diagnóstico",
};

export const dynamic =
  "force-dynamic";

type DiagnosticPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ActionPath =
  | "questionario-expresso"
  | "documentos"
  | null;

type StatusInformation = {
  label: string;
  description: string;
  step: number;
  percentage: number;

  nextAction: string;
  nextDescription: string;

  actionLabel: string;
  actionPath: ActionPath;

  note: string;
};

const statusInformation: Record<
  string,
  StatusInformation
> = {
  awaiting_questionnaire: {
    label:
      "Aguardando questionário",

    description:
      "O diagnóstico foi liberado. A próxima etapa é preencher as informações necessárias para a análise.",

    step:
      1,

    percentage:
      15,

    nextAction:
      "Responder ao questionário",

    nextDescription:
      "Preencha os dados da empresa, a preparação para IBS/CBS, envie os XMLs selecionados e informe suas principais dúvidas.",

    actionLabel:
      "Preencher questionário",

    actionPath:
      "questionario-expresso",

    note:
      "O prazo começará após o envio completo das informações e dos documentos.",
  },

  awaiting_documents: {
    label:
      "Aguardando documentos",

    description:
      "O questionário foi recebido. Existem documentos que ainda precisam ser confirmados.",

    step:
      2,

    percentage:
      35,

    nextAction:
      "Enviar documentos e XMLs",

    nextDescription:
      "Envie os documentos complementares necessários para continuidade da análise.",

    actionLabel:
      "Enviar documentos e XMLs",

    actionPath:
      "documentos",

    note:
      "O prazo começará após a confirmação do envio completo dos documentos.",
  },

  documents_received: {
    label:
      "Documentos recebidos",

    description:
      "As informações e os documentos foram recebidos e aguardam o início da conferência técnica.",

    step:
      3,

    percentage:
      55,

    nextAction:
      "Aguardar o início da análise",

    nextDescription:
      "O questionário e os XMLs do diagnóstico foram recebidos.",

    actionLabel:
      "Nenhuma ação necessária",

    actionPath:
      null,

    note:
      "O prazo será definido após a conferência inicial do material.",
  },

  under_review: {
    label:
      "Em análise",

    description:
      "As informações e os documentos enviados estão em análise técnica.",

    step:
      4,

    percentage:
      75,

    nextAction:
      "Acompanhar o andamento da análise",

    nextDescription:
      "A conferência técnica está em andamento. Caso seja necessário algum complemento, uma solicitação será apresentada nesta área.",

    actionLabel:
      "Análise em andamento",

    actionPath:
      null,

    note:
      "Não é necessário realizar nenhuma ação enquanto não houver uma solicitação.",
  },

  client_action_required: {
    label:
      "Ação necessária",

    description:
      "Foi identificada uma pendência que precisa ser atendida para a continuidade da análise.",

    step:
      3,

    percentage:
      55,

    nextAction:
      "Atender à solicitação",

    nextDescription:
      "Consulte as mensagens, responda à solicitação e envie ou substitua documentos quando necessário.",

    actionLabel:
      "Acessar documentos",

    actionPath:
      "documentos",

    note:
      "A análise será retomada após a conferência do complemento enviado.",
  },

  awaiting_approval: {
    label:
      "Revisão final",

    description:
      "A análise foi concluída e está em revisão antes da liberação.",

    step:
      4,

    percentage:
      90,

    nextAction:
      "Aguardar a liberação do relatório",

    nextDescription:
      "O resultado está passando pela conferência final antes de ser disponibilizado.",

    actionLabel:
      "Resultado em revisão",

    actionPath:
      null,

    note:
      "Nenhuma ação é necessária durante a revisão.",
  },

  completed: {
    label:
      "Concluído",

    description:
      "O diagnóstico foi finalizado e o resultado está disponível.",

    step:
      5,

    percentage:
      100,

    nextAction:
      "Consultar o resultado",

    nextDescription:
      "A análise foi concluída e o resultado final foi liberado.",

    actionLabel:
      "Diagnóstico concluído",

    actionPath:
      null,

    note:
      "Os documentos permanecem disponíveis na área do cliente.",
  },

  cancelled: {
    label:
      "Cancelado",

    description:
      "Este diagnóstico foi cancelado.",

    step:
      0,

    percentage:
      0,

    nextAction:
      "Entrar em contato",

    nextDescription:
      "Entre em contato para verificar a situação do diagnóstico.",

    actionLabel:
      "Diagnóstico cancelado",

    actionPath:
      null,

    note:
      "Atendimento: contato@dianavoltolini.com.br.",
  },
};

const taxRegimeLabels: Record<
  string,
  string
> = {
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
      dateStyle:
        "short",

      timeStyle:
        "short",
    },
  ).format(
    new Date(value),
  );
}

function formatCurrency(
  valueInCents:
    | number
    | null
    | undefined,
) {
  if (
    valueInCents === null ||
    valueInCents === undefined
  ) {
    return "Não informado";
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style:
        "currency",

      currency:
        "BRL",
    },
  ).format(
    valueInCents / 100,
  );
}

export default async function DiagnosticPage({
  params,
}: DiagnosticPageProps) {
  const { id } =
    await params;

  const supabase =
    await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId =
    typeof claimsData?.claims?.sub ===
    "string"
      ? claimsData.claims.sub
      : null;

  if (!userId) {
    redirect("/login");
  }

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
        client_deadline_at,
        analysis_started_at,
        created_at,
        company_id,
        order_id
      `,
    )
    .eq("id", id)
    .eq("user_id", userId)
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
      count: documentCount,
    },

    {
      data: messages,
      error: messagesError,
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
          main_activity
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
          id,
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
        "id",
        {
          count:
            "exact",

          head:
            true,
        },
      )
      .eq(
        "diagnostic_id",
        diagnostic.id,
      )
      .eq(
        "counts_toward_limit",
        true,
      )
      .neq(
        "status",
        "rejected",
      ),

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
      .eq(
        "visible_to_client",
        true,
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        },
      ),
  ]);

  let order: {
    amount_cents:
      number;

    status:
      string;

    product_id:
      string;
  } | null =
    null;

  if (
    diagnostic.order_id
  ) {
    const {
      data: orderData,
    } = await supabase
      .from("orders")
      .select(
        `
          amount_cents,
          status,
          product_id
        `,
      )
      .eq(
        "id",
        diagnostic.order_id,
      )
      .maybeSingle();

    order =
      orderData;
  }

  let productName =
    "Diagnóstico Expresso IBS/CBS";

  if (
    order?.product_id
  ) {
    const {
      data: product,
    } = await supabase
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

  const currentStatus =
    statusInformation[
      diagnostic.status
    ] ??
    statusInformation
      .awaiting_questionnaire;

  const visibleMessages =
    messages ?? [];

  const latestAdminMessage =
    [
      ...visibleMessages,
    ]
      .reverse()
      .find(
        (message) =>
          message.sender_role ===
          "admin",
      );

  const actionRequired =
    diagnostic.status ===
    "client_action_required";

  const actionHref =
    currentStatus.actionPath
      ? `/painel/diagnosticos/${diagnostic.id}/${currentStatus.actionPath}`
      : null;

  const questionnaireStatus =
    questionnaire?.submitted_at
      ? "Enviado"
      : questionnaire
        ? "Em preenchimento"
        : "Não iniciado";

  const canSendMessage =
    ![
      "completed",
      "cancelled",
    ].includes(
      diagnostic.status,
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
              href="/painel"
            >
              Voltar ao painel
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
            <Link href="/painel">
              Meu painel
            </Link>

            <span>/</span>

            <strong>
              {diagnostic.code}
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
                {productName}
              </p>

              <h1>
                {diagnostic.code}
              </h1>

              <p
                className={
                  styles.heroDescription
                }
              >
                Acompanhe o andamento,
                os documentos, as
                mensagens e as próximas
                etapas do diagnóstico.
              </p>
            </div>

            <span
              className={`${styles.status} ${
                styles[
                  `status_${diagnostic.status}`
                ] ?? ""
              }`}
            >
              {
                currentStatus.label
              }
            </span>
          </section>

          {actionRequired ? (
            <section
              className={
                styles.pendingBanner
              }
            >
              <div>
                <p
                  className={
                    styles.pendingEyebrow
                  }
                >
                  Sua atenção é
                  necessária
                </p>

                <h2>
                  Existe uma solicitação
                  pendente
                </h2>

                <p>
                  {latestAdminMessage?.body ??
                    "Consulte as mensagens e envie o complemento solicitado."}
                </p>
              </div>

              <div
                className={
                  styles.pendingBannerActions
                }
              >
                <a href="#mensagens">
                  Responder solicitação
                </a>

                <Link
                  href={`/painel/diagnosticos/${diagnostic.id}/documentos`}
                >
                  Acessar documentos
                </Link>
              </div>
            </section>
          ) : null}

          <section
            className={
              styles.progressCard
            }
          >
            <div
              className={
                styles.progressHeader
              }
            >
              <div>
                <span>
                  Etapa{" "}
                  {
                    currentStatus.step
                  }{" "}
                  de 5
                </span>

                <strong>
                  {
                    currentStatus.label
                  }
                </strong>
              </div>

              <b>
                {
                  currentStatus.percentage
                }
                %
              </b>
            </div>

            <div
              className={
                styles.progressTrack
              }
            >
              <span
                style={{
                  width:
                    `${currentStatus.percentage}%`,
                }}
              />
            </div>

            <p>
              {
                currentStatus.description
              }
            </p>
          </section>

          <div
            className={
              styles.summaryGrid
            }
          >
            <article>
              <span>
                Empresa analisada
              </span>

              <strong>
                {company?.trade_name ||
                  company?.legal_name ||
                  "Não informada"}
              </strong>

              <small>
                {company?.cnpj ||
                  "CNPJ não informado"}
              </small>
            </article>

            <article>
              <span>
                Questionário
              </span>

              <strong>
                {
                  questionnaireStatus
                }
              </strong>

              <small>
                {questionnaire?.updated_at
                  ? `Atualizado em ${formatDate(
                      questionnaire.updated_at,
                    )}`
                  : "Aguardando preenchimento"}
              </small>
            </article>

            <article>
              <span>
                XMLs principais
              </span>

              <strong>
                {documentCount ??
                  0}{" "}
                de{" "}
                {
                  diagnostic.document_limit
                }
              </strong>

              <small>
                Documentos do escopo
                principal
              </small>
            </article>

            <article>
              <span>
                Prazo da análise
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
                  : "Análise não iniciada"}
              </small>
            </article>
          </div>

          <div
            className={
              styles.mainGrid
            }
          >
            <section
              className={
                styles.informationCard
              }
            >
              <header
                className={
                  styles.cardHeader
                }
              >
                <p
                  className={
                    styles.eyebrow
                  }
                >
                  Dados do serviço
                </p>

                <h2>
                  Informações do
                  diagnóstico
                </h2>
              </header>

              <dl
                className={
                  styles.informationList
                }
              >
                <div>
                  <dt>
                    Produto
                  </dt>

                  <dd>
                    {productName}
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
                    Investimento
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
                    Regime tributário
                  </dt>

                  <dd>
                    {company?.tax_regime
                      ? taxRegimeLabels[
                          company.tax_regime
                        ] ??
                        company.tax_regime
                      : "Não informado"}
                  </dd>
                </div>

                <div>
                  <dt>
                    Localização
                  </dt>

                  <dd>
                    {company?.city &&
                    company?.state
                      ? `${company.city} – ${company.state}`
                      : "Não informada"}
                  </dd>
                </div>

                <div>
                  <dt>
                    Sistema ERP
                  </dt>

                  <dd>
                    {company?.erp_name ||
                      "Não informado"}
                  </dd>
                </div>

                <div>
                  <dt>
                    Atividade principal
                  </dt>

                  <dd>
                    {company?.main_activity ||
                      "Não informada"}
                  </dd>
                </div>
              </dl>
            </section>

            <aside
              className={
                styles.nextStepCard
              }
            >
              <p
                className={
                  styles.eyebrow
                }
              >
                Próxima etapa
              </p>

              <h2>
                {
                  currentStatus.nextAction
                }
              </h2>

              <p>
                {
                  currentStatus.nextDescription
                }
              </p>

              {actionHref ? (
                <Link
                  className={
                    styles.pendingAction
                  }
                  href={
                    actionHref
                  }
                >
                  {
                    currentStatus.actionLabel
                  }
                </Link>
              ) : (
                <span
                  className={
                    styles.disabledAction
                  }
                >
                  {
                    currentStatus.actionLabel
                  }
                </span>
              )}

              <small>
                {
                  currentStatus.note
                }
              </small>
            </aside>
          </div>

          <section
            id="mensagens"
            className={
              styles.communicationCard
            }
          >
            <header
              className={
                styles.communicationHeader
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
                  Mensagens do
                  diagnóstico
                </h2>

                <p>
                  Consulte solicitações,
                  orientações e respostas
                  registradas durante a
                  análise.
                </p>
              </div>

              <span>
                {
                  visibleMessages.length
                }{" "}
                {visibleMessages.length ===
                1
                  ? "mensagem"
                  : "mensagens"}
              </span>
            </header>

            {messagesError ? (
              <div
                className={
                  styles.errorNotice
                }
              >
                As mensagens não puderam
                ser carregadas. Código:{" "}
                {messagesError.code ||
                  "não informado"}.
              </div>
            ) : visibleMessages.length >
              0 ? (
              <div
                className={
                  styles.messageList
                }
              >
                {visibleMessages.map(
                  (message) => {
                    const isClient =
                      message.sender_role ===
                      "client";

                    return (
                      <article
                        key={
                          message.id
                        }
                        className={`${styles.messageItem} ${
                          isClient
                            ? styles.clientMessage
                            : styles.adminMessage
                        }`}
                      >
                        <header>
                          <strong>
                            {isClient
                              ? "Você"
                              : "Equipe Diana Voltolini"}
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
                      </article>
                    );
                  },
                )}
              </div>
            ) : (
              <div
                className={
                  styles.emptyMessages
                }
              >
                <strong>
                  Nenhuma mensagem
                  registrada
                </strong>

                <p>
                  As comunicações sobre
                  o diagnóstico aparecerão
                  nesta área.
                </p>
              </div>
            )}

            {canSendMessage ? (
              <MessageForm
                diagnosticId={
                  diagnostic.id
                }
                actionRequired={
                  actionRequired
                }
              />
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}