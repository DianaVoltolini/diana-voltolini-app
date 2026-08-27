// app/painel/diagnosticos/[id]/questionario-expresso/revisao/page.tsx

import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  submitExpressQuestionnaire,
} from "../actions";

import styles from "./revisao.module.css";

export const metadata: Metadata = {
  title:
    "Revisão e envio | Questionário Expresso",
};

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    erro?: string;
  }>;
};

type JsonRecord =
  Record<string, unknown>;

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
    ? value
    : "";
}

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

const configurationLabels: Record<
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

const accountingLabels: Record<
  string,
  string
> = {
  sim_por_escrito:
    "Sim, por escrito",
  sim_verbalmente:
    "Sim, verbalmente",
  parcialmente:
    "Parcialmente",
  ainda_nao:
    "Ainda não",
  nao_sei:
    "Não sei",
};

const operationLabels: Record<
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
    "Venda ou entrega futura",
  outra:
    "Outra operação",
};

const testLabels: Record<
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

const errorMessages: Record<
  string,
  string
> = {
  "confirmacao-obrigatoria":
    "Confirme a revisão das informações antes de enviar.",

  "nao-foi-possivel-carregar":
    "Não foi possível carregar o questionário.",

  "nao-foi-possivel-validar-documentos":
    "Não foi possível validar os XMLs enviados.",

  "contexto-documento-incompleto":
    "Existe um XML sem as informações da operação. Volte à etapa de NF-e e revise os documentos.",

  "nao-foi-possivel-enviar":
    "Não foi possível concluir o envio. Nenhuma nova análise foi iniciada.",
};

export default async function ReviewPage({
  params,
  searchParams,
}: PageProps) {
  const { id } =
    await params;

  const { erro } =
    await searchParams;

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
        user_id
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

  if (
    diagnostic.status !==
    "awaiting_questionnaire"
  ) {
    redirect(
      `/painel/diagnosticos/${diagnostic.id}`,
    );
  }

  const {
    data: questionnaire,
  } = await supabase
    .from(
      "diagnostic_questionnaires",
    )
    .select("answers")
    .eq(
      "diagnostic_id",
      diagnostic.id,
    )
    .maybeSingle();

  const answers =
    asRecord(
      questionnaire?.answers,
    );

  const express =
    asRecord(
      answers.express,
    );

  const company =
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

  const documents =
    Array.isArray(
      express.documents,
    )
      ? express.documents.map(
          asRecord,
        )
      : [];

  if (
    !asString(
      company.legalName,
    ) ||
    !asString(
      company.cnpj,
    )
  ) {
    redirect(
      `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/empresa`,
    );
  }

  if (
    !asString(
      preparation.erpName,
    )
  ) {
    redirect(
      `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/preparacao`,
    );
  }

  if (
    documents.length === 0
  ) {
    redirect(
      `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/documentos`,
    );
  }

  if (
    guidance.completed !== true
  ) {
    redirect(
      `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/orientacao`,
    );
  }

  return (
    <article
      className={styles.card}
    >
      <header
        className={
          styles.header
        }
      >
        <span>
          Etapa 5 de 5
        </span>

        <h2>
          Revisão do questionário
        </h2>

        <p>
          Confira as informações antes
          de concluir o questionário.
          Depois, você poderá revisar,
          complementar ou substituir os
          documentos antes de liberá-los
          para análise.
        </p>
      </header>

      {erro ? (
        <div
          className={
            styles.error
          }
        >
          {errorMessages[erro] ??
            "Não foi possível concluir a operação."}
        </div>
      ) : null}

      <section
        className={
          styles.section
        }
      >
        <header>
          <div>
            <span>01</span>

            <div>
              <h3>
                Empresa
              </h3>

              <p>
                Identificação e contexto
              </p>
            </div>
          </div>

          <Link
            href={`/painel/diagnosticos/${diagnostic.id}/questionario-expresso/empresa`}
          >
            Editar
          </Link>
        </header>

        <dl
          className={
            styles.dataGrid
          }
        >
          <div>
            <dt>
              Razão social
            </dt>

            <dd>
              {asString(
                company.legalName,
              )}
            </dd>
          </div>

          <div>
            <dt>CNPJ</dt>

            <dd>
              {asString(
                company.cnpj,
              )}
            </dd>
          </div>

          <div>
            <dt>
              Município / UF
            </dt>

            <dd>
              {asString(
                company.city,
              )}
              {" / "}
              {asString(
                company.state,
              )}
            </dd>
          </div>

          <div>
            <dt>
              Regime tributário
            </dt>

            <dd>
              {taxRegimeLabels[
                asString(
                  company.taxRegime,
                )
              ] ??
                asString(
                  company.taxRegime,
                )}
            </dd>
          </div>

          <div
            className={
              styles.full
            }
          >
            <dt>
              Atividade principal
            </dt>

            <dd>
              {asString(
                company.mainActivity,
              )}
            </dd>
          </div>

          <div
            className={
              styles.full
            }
          >
            <dt>
              Contexto informado
            </dt>

            <dd>
              {asString(
                company.businessContext,
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section
        className={
          styles.section
        }
      >
        <header>
          <div>
            <span>02</span>

            <div>
              <h3>
                Preparação para IBS/CBS
              </h3>

              <p>
                Sistema e orientação
                tributária
              </p>
            </div>
          </div>

          <Link
            href={`/painel/diagnosticos/${diagnostic.id}/questionario-expresso/preparacao`}
          >
            Editar
          </Link>
        </header>

        <dl
          className={
            styles.dataGrid
          }
        >
          <div>
            <dt>
              ERP / sistema
            </dt>

            <dd>
              {asString(
                preparation.erpName,
              )}
            </dd>
          </div>

          <div>
            <dt>
              Versão
            </dt>

            <dd>
              {asString(
                preparation.erpVersion,
              ) ||
                "Não informada"}
            </dd>
          </div>

          <div>
            <dt>
              Configuração IBS/CBS
            </dt>

            <dd>
              {configurationLabels[
                asString(
                  preparation.ibsCbsConfiguration,
                )
              ] ??
                asString(
                  preparation.ibsCbsConfiguration,
                )}
            </dd>
          </div>

          <div>
            <dt>
              Orientação da contabilidade
            </dt>

            <dd>
              {accountingLabels[
                asString(
                  preparation.accountingGuidance,
                )
              ] ??
                asString(
                  preparation.accountingGuidance,
                )}
            </dd>
          </div>

          {asString(
            preparation.preparationNotes,
          ) ? (
            <div
              className={
                styles.full
              }
            >
              <dt>
                Observações
              </dt>

              <dd>
                {asString(
                  preparation.preparationNotes,
                )}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section
        className={
          styles.section
        }
      >
        <header>
          <div>
            <span>03</span>

            <div>
              <h3>
                NF-e para análise
              </h3>

              <p>
                {documents.length}{" "}
                {documents.length === 1
                  ? "XML selecionado"
                  : "XMLs selecionados"}
              </p>
            </div>
          </div>

          <Link
            href={`/painel/diagnosticos/${diagnostic.id}/questionario-expresso/documentos`}
          >
            Editar
          </Link>
        </header>

        <div
          className={
            styles.documents
          }
        >
          {documents.map(
            (
              document,
              index,
            ) => (
              <article
                key={
                  asString(
                    document.documentId,
                  ) ||
                  `${index}`
                }
              >
                <span>
                  NF-e {index + 1}
                </span>

                <strong>
                  {asString(
                    document.fileName,
                  )}
                </strong>

                <dl>
                  <div>
                    <dt>
                      Operação
                    </dt>

                    <dd>
                      {operationLabels[
                        asString(
                          document.operationType,
                        )
                      ] ??
                        asString(
                          document.operationType,
                        )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Testada com
                      IBS/CBS
                    </dt>

                    <dd>
                      {testLabels[
                        asString(
                          document.ibsCbsTested,
                        )
                      ] ??
                        asString(
                          document.ibsCbsTested,
                        )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Motivo da escolha
                    </dt>

                    <dd>
                      {asString(
                        document.whySelected,
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            ),
          )}
        </div>
      </section>

      <section
        className={
          styles.section
        }
      >
        <header>
          <div>
            <span>04</span>

            <div>
              <h3>
                Dúvidas e orientação
              </h3>

              <p>
                Pontos apresentados pelo
                cliente
              </p>
            </div>
          </div>

          <Link
            href={`/painel/diagnosticos/${diagnostic.id}/questionario-expresso/orientacao`}
          >
            Editar
          </Link>
        </header>

        <dl
          className={
            styles.dataGrid
          }
        >
          <div
            className={
              styles.full
            }
          >
            <dt>
              Principal dúvida
            </dt>

            <dd>
              {asString(
                guidance.mainQuestion,
              ) ||
                "Nenhuma dúvida específica informada."}
            </dd>
          </div>

          <div
            className={
              styles.full
            }
          >
            <dt>
              Decisão prática
            </dt>

            <dd>
              {asString(
                guidance.practicalDecision,
              ) ||
                "Não informada."}
            </dd>
          </div>

          {asString(
            guidance.additionalInformation,
          ) ? (
            <div
              className={
                styles.full
              }
            >
              <dt>
                Informação adicional
              </dt>

              <dd>
                {asString(
                  guidance.additionalInformation,
                )}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section
        className={
          styles.scope
        }
      >
        <h3>
          Escopo do Diagnóstico
          Expresso
        </h3>

        <p>
          A análise será limitada às
          informações, operações e XMLs
          enviados neste diagnóstico.
          A orientação profissional
          complementar não substitui a
          definição tributária da
          contabilidade, parecer jurídico
          ou auditoria fiscal.
        </p>
      </section>

      <form
        className={
          styles.submitArea
        }
        action={
          submitExpressQuestionnaire
        }
      >
        <input
          type="hidden"
          name="diagnosticId"
          value={diagnostic.id}
        />

        <label>
          <input
            type="checkbox"
            name="confirmSubmission"
            required
          />

          <span>
            Revisei as informações acima
            e confirmo o envio do
            questionário. Na próxima
            etapa, poderei revisar e
            complementar os documentos
            antes de liberá-los para
            análise.
          </span>
        </label>

        <div>
          <Link
            href={`/painel/diagnosticos/${diagnostic.id}/questionario-expresso/orientacao`}
          >
            Voltar
          </Link>

          <button type="submit">
            Concluir questionário e revisar documentos
          </button>
        </div>
      </form>
    </article>
  );
}