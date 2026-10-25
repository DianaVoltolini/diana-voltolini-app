// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\painel\page.tsx

import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { logout } from "../actions";

import styles from "../painel.module.css";
import ProductPage from "../product-page";
import ProductOffer from "../product-offer";

export const metadata: Metadata = {
  title: "Meus Diagnósticos",
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

export default async function DiagnosticosPage() {
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

  const displayName =
    profile?.full_name?.trim() ||
    userEmail?.split(
      "@",
    )[0] ||
    "Cliente";

  if(diagnostics.length===0) return <ProductPage title="Diagnóstico Expresso IBS/CBS" description="Uma análise técnica para verificar a preparação do faturamento para IBS e CBS.">
    <ProductOffer eyebrow="DIAGNÓSTICO EXPRESSO IBS/CBS" headline="Descubra se seu faturamento está preparado para IBS e CBS" lead="Identifique inconsistências e pontos de atenção nos documentos fiscais selecionados, com recomendações e plano de ação." price="R$ 169,90 · pagamento único" checkout="https://dianavoltolini.com.br/checkout/diagnostico-ibs-cbs" cta="Quero meu diagnóstico" features={["Análise de até cinco documentos fiscais (XMLs)","Conferência individual dos XMLs selecionados","Avaliação das informações sobre ERP e operações","Riscos, pontos positivos e providências","Plano de ação e parecer final","Entrega em até cinco dias úteis após receber todos os documentos necessários"]}>
      <section style={{background:"#fff",border:"1px solid #e0e7ed",borderRadius:14,padding:30}}>
        <p style={{color:"#987318",fontWeight:850,fontSize:12}}>COMO FUNCIONA</p><h2>Do questionário à entrega</h2>
        <p style={{lineHeight:1.9,color:"#536678"}}1. Contratação e confirmação do pagamento. 2. Questionário com informações da empresa. 3. Envio de um a cinco XMLs. 4. Análise técnica. 5. Entrega do relatório com riscos, recomendações e plano de ação na Área do Cliente.</p>
        <p style={{fontSize:13,color:"#647586"}}O escopo não inclui execução de parametrização no ERP; a classificação tributária deverá ser validada pelo responsável fiscal ou contábil.</p>
      </section>
    </ProductOffer>
  </ProductPage>;
  return (
    <ProductPage title="Meus Diagnósticos" description="Acompanhe suas análises, documentos enviados, andamento e resultados.">
          <section
            id="diagnosticos"
            style={{ marginTop: 0 }}
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
                  Seus serviços
                </p>

                <h2>
                  Seus diagnósticos
                </h2>

                <p>
                  Cada diagnóstico possui
                  um acompanhamento
                  independente.
                </p>
              </div>

              <span
                className={
                  styles.diagnosticCount
                }
              >
                {
                  diagnostics.length
                }{" "}
                {diagnostics.length ===
                1
                  ? "diagnóstico"
                  : "diagnósticos"}
              </span>
            </header>

            {diagnostics.length >
            0 ? (
              <div
                className={
                  styles.diagnosticList
                }
              >
                {diagnostics.map(
                  (
                    diagnostic,
                  ) => {
                    const order =
                      diagnostic.order_id
                        ? orderById.get(
                            diagnostic.order_id,
                          ) ??
                          null
                        : null;

                    const documentCount =
                      documentCountByDiagnostic.get(
                        diagnostic.id,
                      ) ?? 0;

                    const forecast =
                      getCompletionForecast(
                        diagnostic,
                      );

                    const journeyStep =
                      getJourneyStep(
                        diagnostic.status,
                      );

                    return (
                      <article
                        key={
                          diagnostic.id
                        }
                        className={
                          styles.diagnosticCard
                        }
                      >
                        <header
                          className={
                            styles.diagnosticHeader
                          }
                        >
                          <div>
                            <p>
                              Diagnóstico
                              Expresso IBS/CBS
                            </p>

                            <h3>
                              {
                                diagnostic.code
                              }
                            </h3>
                          </div>

                          <Link
                            className={
                              styles.accessButton
                            }
                            href={`/painel/diagnosticos/${diagnostic.id}`}
                          >
                            <span>
                              Acessar diagnóstico
                            </span>

                            <b
                              aria-hidden="true"
                            >
                              →
                            </b>
                          </Link>
                        </header>

                        <div
                          className={
                            styles.factGrid
                          }
                        >
                          <div
                            className={
                              styles.factCard
                            }
                          >
                            <span>
                              Contratado em
                            </span>

                            <strong>
                              {formatDate(
                                diagnostic.created_at,
                              )}
                            </strong>
                          </div>

                          <div
                            className={
                              styles.factCard
                            }
                          >
                            <span>
                              Pagamento
                            </span>

                            <strong>
                              {paymentStatusLabel(
                                order?.status,
                              )}
                            </strong>
                          </div>

                          <div
                            className={
                              styles.factCard
                            }
                          >
                            <span>
                              Arquivos enviados
                            </span>

                            <strong>
                              {
                                documentCount
                              }{" "}
                              de{" "}
                              {
                                diagnostic.document_limit
                              }
                            </strong>
                          </div>

                          <div
                            className={
                              styles.factCard
                            }
                          >
                            <span>
                              Previsão de conclusão
                            </span>

                            <strong>
                              {
                                forecast.value
                              }
                            </strong>

                            <small>
                              {
                                forecast.helper
                              }
                            </small>
                          </div>

                          <div
                            className={`${styles.factCard} ${styles.statusFact}`}
                          >
                            <span>
                              Status
                            </span>

                            <strong
                              className={`${styles.statusBadge} ${getStatusClass(
                                diagnostic.status,
                              )}`}
                            >
                              {getGeneralStatus(
                                diagnostic.status,
                              )}
                            </strong>
                          </div>
                        </div>

                        <section
                          className={
                            styles.journeyBlock
                          }
                        >
                          <header
                            className={
                              styles.journeyHeader
                            }
                          >
                            <div>
                              <span>
                                Acompanhamento
                              </span>

                              <strong>
                                Jornada do
                                diagnóstico
                              </strong>
                            </div>

                            <small>
                              Acompanhe a evolução
                              até a entrega do
                              resultado.
                            </small>
                          </header>

                          <div
                            className={
                              styles.journey
                            }
                          >
                            {journeySteps.map(
                              (
                                step,
                                index,
                              ) => {
                                const number =
                                  index +
                                  1;

                                const completed =
                                  diagnostic.status ===
                                    "completed" ||
                                  (
                                    journeyStep >
                                      0 &&
                                    number <
                                      journeyStep
                                  );

                                const current =
                                  diagnostic.status !==
                                    "completed" &&
                                  number ===
                                    journeyStep;

                                return (
                                  <div
                                    key={
                                      step
                                    }
                                    className={`${styles.journeyStep} ${
                                      completed
                                        ? styles.journeyCompleted
                                        : current
                                          ? styles.journeyCurrent
                                          : ""
                                    }`}
                                  >
                                    <span>
                                      {completed
                                        ? "✓"
                                        : number}
                                    </span>

                                    <strong>
                                      {step}
                                    </strong>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </section>
                      </article>
                    );
                  },
                )}
              </div>
            ) : (
              <section
                className={
                  styles.emptyState
                }
              >
                <div>
                  <h2>
                    Nenhum diagnóstico
                    disponível
                  </h2>

                  <p>
                    Quando uma contratação
                    for confirmada, ela
                    aparecerá nesta área.
                  </p>
                </div>
              </section>
            )}
          </section>

          <section
            className={
              styles.purchaseStrip
            }
          >
            <div>
              <span>
                Nova contratação
              </span>

              <strong>
                Gostaria de realizar uma
                nova contratação?
              </strong>

              <p>
                Você pode adquirir outro
                Diagnóstico Expresso e
                acompanhá-lo separadamente
                nesta mesma área.
              </p>
            </div>

            <a
              href="https://dianavoltolini.com.br/checkout/diagnostico-ibs-cbs"
              className={
                styles.purchaseButton
              }
            >
              Contratar novo diagnóstico
              <b aria-hidden="true">
                →
              </b>
            </a>
          </section>
    </ProductPage>
  );
}