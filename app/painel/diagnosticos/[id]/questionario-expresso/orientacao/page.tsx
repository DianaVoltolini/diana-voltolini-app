// app/painel/diagnosticos/[id]/questionario-expresso/orientacao/page.tsx

import type { Metadata } from "next";

import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  saveGuidanceStep,
} from "../actions";

import styles from "../questionario-expresso.module.css";

export const metadata: Metadata = {
  title:
    "Dúvidas e orientação | Diagnóstico Expresso IBS/CBS",
};

export const dynamic =
  "force-dynamic";

type GuidancePageProps = {
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

const errorMessages: Record<
  string,
  string
> = {
  "confirmacao-obrigatoria":
    "Confirme as informações antes de continuar.",

  "etapa-incompleta":
    "Conclua esta etapa antes de continuar.",

  "nao-foi-possivel-carregar":
    "Não foi possível carregar as informações salvas.",

  "nao-foi-possivel-salvar":
    "Não foi possível salvar esta etapa. Tente novamente.",
};

export default async function GuidancePage({
  params,
  searchParams,
}: GuidancePageProps) {
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

  if (
    diagnostic.service_type &&
    diagnostic.service_type !==
      "express"
  ) {
    redirect(
      `/painel/diagnosticos/${diagnostic.id}`,
    );
  }

  const {
    data: questionnaire,
    error: questionnaireError,
  } = await supabase
    .from(
      "diagnostic_questionnaires",
    )
    .select(
      `
        answers,
        submitted_at
      `,
    )
    .eq(
      "diagnostic_id",
      diagnostic.id,
    )
    .maybeSingle();

  if (questionnaireError) {
    console.error(
      "Erro ao carregar o questionário:",
      questionnaireError,
    );

    redirect(
      `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/documentos`,
    );
  }

  if (
    questionnaire?.submitted_at
  ) {
    redirect(
      `/painel/diagnosticos/${diagnostic.id}`,
    );
  }

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

  const documents =
    Array.isArray(
      express.documents,
    )
      ? express.documents
      : [];

  const guidance =
    asRecord(
      express.guidance,
    );

  /*
   * A Etapa 4 só deve ser acessada
   * depois de Empresa, Preparação
   * e pelo menos um XML.
   */

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
    ) ||
    !asString(
      preparation.ibsCbsConfiguration,
    ) ||
    !asString(
      preparation.accountingGuidance,
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

  return (
    <article
      className={
        styles.formCard
      }
    >
      <header
        className={
          styles.formHeader
        }
      >
        <div
          className={
            styles.formStep
          }
        >
          Etapa 4 de 5
        </div>

        <h2>
          Dúvidas e orientação
        </h2>

        <p>
          Informe dúvidas específicas
          sobre as operações enviadas ou
          situações em que deseja uma
          orientação profissional
          complementar.
        </p>
      </header>

      {erro ? (
        <div
          className={
            styles.errorMessage
          }
          role="alert"
        >
          {errorMessages[erro] ??
            "Não foi possível concluir a operação."}
        </div>
      ) : null}

      <form
        className={styles.form}
        action={saveGuidanceStep}
      >
        <input
          type="hidden"
          name="diagnosticId"
          value={diagnostic.id}
        />

        <div
          className={
            styles.formGrid
          }
        >
          <label
            className={
              styles.fullField
            }
          >
            <span>
              Qual é sua principal
              dúvida?
            </span>

            <textarea
              name="mainQuestion"
              defaultValue={
                asString(
                  guidance.mainQuestion,
                )
              }
              placeholder="Exemplo: tenho dúvida sobre a tributação desta operação, sobre o preenchimento do IBS/CBS ou sobre a parametrização utilizada."
            />

            <small>
              Caso não tenha uma dúvida
              específica, este campo pode
              ficar em branco.
            </small>
          </label>

          <label
            className={
              styles.fullField
            }
          >
            <span>
              Existe alguma decisão
              prática em que você precisa
              de orientação?
            </span>

            <textarea
              name="practicalDecision"
              defaultValue={
                asString(
                  guidance.practicalDecision,
                )
              }
              placeholder="Exemplo: preciso saber quais pontos devo solicitar à contabilidade, ao ERP ou revisar antes de continuar emitindo esta operação."
            />
          </label>

          <label
            className={
              styles.fullField
            }
          >
            <span>
              Outra informação importante
            </span>

            <textarea
              name="additionalInformation"
              defaultValue={
                asString(
                  guidance.additionalInformation,
                )
              }
              placeholder="Informe qualquer outro ponto que considere relevante para a análise."
            />

            <small>
              Campo opcional.
            </small>
          </label>

          <label
            className={
              styles.fullField
            }
          >
            <span>
              Confirmação *
            </span>

            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "flex-start",
                gap:
                  "12px",
                border:
                  "1px solid #d6e0e8",
                borderRadius:
                  "9px",
                background:
                  "#f8fafc",
                padding:
                  "16px",
              }}
            >
              <input
                type="checkbox"
                name="informationConfirmation"
                defaultChecked={
                  guidance.informationConfirmation ===
                  true
                }
                required
                style={{
                  width:
                    "18px",
                  height:
                    "18px",
                  minHeight:
                    "18px",
                  flex:
                    "0 0 auto",
                  marginTop:
                    "2px",
                }}
              />

              <span
                style={{
                  color:
                    "#3f4e5c",
                  fontSize:
                    "0.9rem",
                  lineHeight:
                    "1.55",
                }}
              >
                Confirmo que os XMLs e
                informações enviados
                correspondem às operações
                que desejo incluir neste
                Diagnóstico Expresso
                IBS/CBS.
              </span>
            </div>
          </label>
        </div>

        <footer
          className={
            styles.formActions
          }
        >
          <Link
            className={
              styles.secondaryButton
            }
            href={`/painel/diagnosticos/${diagnostic.id}/questionario-expresso/documentos`}
          >
            Voltar
          </Link>

          <button
            type="submit"
          >
            Salvar e revisar
          </button>
        </footer>
      </form>
    </article>
  );
}