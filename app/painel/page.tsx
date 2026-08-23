// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\painel\page.tsx

import type {
  Metadata,
} from "next";
import Image from "next/image";
import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

import {
  logout,
} from "./actions";
import styles from "./painel.module.css";

export const metadata:
  Metadata = {
    title:
      "Meu painel",
  };

type OrderRow = {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
};

type PaymentRow = {
  id: string;
  order_id: string;
  payment_method:
    | string
    | null;
  status: string;
  due_date:
    | string
    | null;
  payment_url:
    | string
    | null;
  created_at: string;
};

type DiagnosticRow = {
  id: string;
  code: string;
  order_id:
    | string
    | null;
  status: string;
  created_at: string;
};

const diagnosticStatusLabels:
  Record<
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
    "Ação necessária",
  awaiting_approval:
    "Aguardando aprovação",
  completed:
    "Concluído",
  cancelled:
    "Cancelado",
};

const orderStatusLabels:
  Record<
    string,
    string
  > = {
  pending:
    "Aguardando pagamento",
  paid:
    "Pagamento confirmado",
  failed:
    "Pagamento não concluído",
  cancelled:
    "Cancelado",
  refunded:
    "Reembolsado",
};

const paymentMethodLabels:
  Record<
    string,
    string
  > = {
  pix:
    "PIX",
  boleto:
    "Boleto",
  credit_card:
    "Cartão",
  other:
    "Outro",
};

function formatMoney(
  amountCents: number,
  currency: string,
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style:
        "currency",
      currency:
        currency ||
        "BRL",
    },
  ).format(
    amountCents /
      100,
  );
}

function formatDate(
  value: string,
) {
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

function formatDueDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone:
        "UTC",
    },
  ).format(
    new Date(
      `${value}T12:00:00Z`,
    ),
  );
}

export default async function PainelPage() {
  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const claims =
    claimsData?.claims;

  const userId =
    typeof claims?.sub ===
      "string"
      ? claims.sub
      : null;

  const userEmail =
    typeof claims?.email ===
      "string"
      ? claims.email
      : null;

  if (!userId) {
    redirect("/login");
  }

  const [
    {
      data: profile,
      error: profileError,
    },
    {
      data: diagnosticsData,
      error: diagnosticsError,
    },
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "full_name, email, role, status",
        )
        .eq(
          "id",
          userId,
        )
        .maybeSingle(),

      supabase
        .from("diagnostics")
        .select(
          "id, code, order_id, status, created_at",
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        ),
    ]);

  if (profileError) {
    console.error(
      "Erro ao carregar perfil:",
      profileError,
    );
  }

  if (diagnosticsError) {
    console.error(
      "Erro ao carregar diagnósticos:",
      diagnosticsError,
    );
  }

  const admin =
    getSupabaseAdmin();

  const {
    data: ordersData,
    error: ordersError,
  } =
    await admin
      .from("orders")
      .select(
        "id, status, amount_cents, currency, created_at",
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
      );

  if (ordersError) {
    throw new Error(
      `Não foi possível carregar as compras: ${ordersError.message}`,
    );
  }

  const orders =
    (ordersData ??
      []) as OrderRow[];

  const orderIds =
    orders.map(
      (order) =>
        order.id,
    );

  let payments:
    PaymentRow[] = [];

  if (
    orderIds.length > 0
  ) {
    const {
      data: paymentsData,
      error: paymentsError,
    } =
      await admin
        .from("payments")
        .select(
          "id, order_id, payment_method, status, due_date, payment_url, created_at",
        )
        .in(
          "order_id",
          orderIds,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        );

    if (paymentsError) {
      throw new Error(
        `Não foi possível carregar os pagamentos: ${paymentsError.message}`,
      );
    }

    payments =
      (paymentsData ??
        []) as PaymentRow[];
  }

  const diagnostics =
    (diagnosticsData ??
      []) as DiagnosticRow[];

  const paymentByOrder =
    new Map<
      string,
      PaymentRow
    >();

  for (
    const payment
    of payments
  ) {
    if (
      !paymentByOrder.has(
        payment.order_id,
      )
    ) {
      paymentByOrder.set(
        payment.order_id,
        payment,
      );
    }
  }

  const diagnosticByOrder =
    new Map<
      string,
      DiagnosticRow
    >();

  for (
    const diagnostic
    of diagnostics
  ) {
    if (
      diagnostic.order_id
    ) {
      diagnosticByOrder.set(
        diagnostic.order_id,
        diagnostic,
      );
    }
  }

  const displayName =
    profile?.full_name
      ?.trim() ||
    userEmail
      ?.split("@")[0] ||
    "Cliente";

  const activeDiagnostics =
    diagnostics.filter(
      (item) =>
        item.status !==
          "completed" &&
        item.status !==
          "cancelled",
    );

  const awaitingPayment =
    orders.filter(
      (item) =>
        item.status ===
        "pending",
    );

  const hasPaidOrder =
    orders.some(
      (item) =>
        item.status ===
        "paid",
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
      </header>

      <section
        className={
          styles.content
        }
      >
        <div className="container">
          <header
            className={
              styles.welcome
            }
          >
            <p
              className={
                styles.eyebrow
              }
            >
              Área do cliente
            </p>

            <h1>
              Olá,{" "}
              {displayName}.
            </h1>

            <p>
              Acompanhe suas
              cobranças,
              pagamentos,
              diagnósticos,
              documentos e
              pendências.
            </p>
          </header>

          <div
            className={
              styles.summaryGrid
            }
          >
            <article>
              <span>
                Contratações
              </span>

              <strong>
                {orders.length}
              </strong>
            </article>

            <article>
              <span>
                Aguardando
                pagamento
              </span>

              <strong>
                {
                  awaitingPayment.length
                }
              </strong>
            </article>

            <article>
              <span>
                Diagnósticos em
                andamento
              </span>

              <strong>
                {
                  activeDiagnostics.length
                }
              </strong>
            </article>
          </div>

          <section
            className={
              styles.purchasesSection
            }
          >
            <div
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
                  Financeiro
                </p>

                <h2>
                  Compras e
                  pagamentos
                </h2>
              </div>
            </div>

            {orders.length >
            0 ? (
              <div
                className={
                  styles.purchaseList
                }
              >
                {orders.map(
                  (order) => {
                    const payment =
                      paymentByOrder.get(
                        order.id,
                      );

                    const diagnostic =
                      diagnosticByOrder.get(
                        order.id,
                      );

                    const paymentMethod =
                      payment
                        ?.payment_method
                        ? paymentMethodLabels[
                            payment
                              .payment_method
                          ] ??
                          payment
                            .payment_method
                        : "—";

                    return (
                      <article
                        className={
                          styles.purchaseCard
                        }
                        key={
                          order.id
                        }
                      >
                        <div
                          className={
                            styles.purchaseMain
                          }
                        >
                          <span
                            className={
                              styles.purchaseType
                            }
                          >
                            Diagnóstico
                            Expresso
                            IBS/CBS
                          </span>

                          <strong>
                            {formatMoney(
                              order.amount_cents,
                              order.currency,
                            )}
                          </strong>

                          <div
                            className={
                              styles.purchaseMeta
                            }
                          >
                            <span>
                              Contratado
                              em{" "}
                              {formatDate(
                                order.created_at,
                              )}
                            </span>

                            <span>
                              Forma:{" "}
                              {
                                paymentMethod
                              }
                            </span>

                            {payment
                              ?.due_date &&
                            order.status ===
                              "pending" ? (
                              <span>
                                Vencimento:{" "}
                                {formatDueDate(
                                  payment.due_date,
                                )}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div
                          className={
                            styles.purchaseRight
                          }
                        >
                          <span
                            className={`${styles.purchaseStatus} ${
                              styles[
                                `purchaseStatus_${order.status}`
                              ] ??
                              ""
                            }`}
                          >
                            {orderStatusLabels[
                              order.status
                            ] ??
                              order.status}
                          </span>

                          {order.status ===
                            "pending" &&
                          payment
                            ?.payment_url ? (
                            <a
                              className={
                                styles.purchaseAction
                              }
                              href={
                                payment.payment_url
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ver cobrança
                            </a>
                          ) : null}

                          {order.status ===
                            "paid" &&
                          diagnostic ? (
                            <Link
                              className={
                                styles.purchaseAction
                              }
                              href={`/painel/diagnosticos/${diagnostic.id}`}
                            >
                              Acessar
                              diagnóstico
                            </Link>
                          ) : null}

                          {order.status ===
                            "paid" &&
                          !diagnostic ? (
                            <p
                              className={
                                styles.purchaseNote
                              }
                            >
                              Pagamento
                              confirmado.
                              Seu
                              diagnóstico
                              será
                              liberado
                              nesta área.
                            </p>
                          ) : null}

                          {order.status ===
                            "pending" ? (
                            <p
                              className={
                                styles.purchaseNote
                              }
                            >
                              O diagnóstico
                              será liberado
                              após a
                              confirmação
                              do pagamento.
                            </p>
                          ) : null}
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            ) : (
              <div
                className={
                  styles.emptyState
                }
              >
                <h3>
                  Nenhuma
                  contratação
                  vinculada
                </h3>

                <p>
                  Faça sua
                  contratação
                  pelo site
                  utilizando o
                  mesmo e-mail
                  desta conta.
                </p>

                <a href="https://dianavoltolini.com.br/diagnostico-ibs-cbs">
                  Conhecer o
                  Diagnóstico
                  Expresso
                  IBS/CBS
                </a>
              </div>
            )}
          </section>

          <section
            className={
              styles.diagnosticsSection
            }
          >
            <div
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
                  Meus serviços
                </p>

                <h2>
                  Diagnósticos
                </h2>
              </div>
            </div>

            {diagnostics.length >
            0 ? (
              <div
                className={
                  styles.diagnosticsList
                }
              >
                {diagnostics.map(
                  (
                    diagnostic,
                  ) => (
                    <Link
                      className={
                        styles.diagnosticCard
                      }
                      href={`/painel/diagnosticos/${diagnostic.id}`}
                      key={
                        diagnostic.id
                      }
                    >
                      <div>
                        <span
                          className={
                            styles.diagnosticType
                          }
                        >
                          Diagnóstico
                          Expresso
                          IBS/CBS
                        </span>

                        <strong>
                          {
                            diagnostic.code
                          }
                        </strong>

                        <small>
                          Criado em{" "}
                          {formatDate(
                            diagnostic.created_at,
                          )}
                        </small>
                      </div>

                      <div
                        className={
                          styles.diagnosticRight
                        }
                      >
                        <span
                          className={`${styles.status} ${
                            styles[
                              `status_${diagnostic.status}`
                            ] ??
                            ""
                          }`}
                        >
                          {diagnosticStatusLabels[
                            diagnostic.status
                          ] ??
                            diagnostic.status}
                        </span>

                        <span
                          className={
                            styles.cardArrow
                          }
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </div>
                    </Link>
                  ),
                )}
              </div>
            ) : (
              <div
                className={
                  styles.emptyState
                }
              >
                <h3>
                  {hasPaidOrder
                    ? "Pagamento confirmado"
                    : "Nenhum diagnóstico disponível"}
                </h3>

                <p>
                  {hasPaidOrder
                    ? "Seu pagamento já foi confirmado. Assim que o diagnóstico for liberado, ele aparecerá nesta área."
                    : "Seu diagnóstico aparecerá aqui após a confirmação do pagamento."}
                </p>

                {!hasPaidOrder ? (
                  <a href="https://dianavoltolini.com.br/diagnostico-ibs-cbs">
                    Conhecer o
                    Diagnóstico
                    Expresso
                    IBS/CBS
                  </a>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}