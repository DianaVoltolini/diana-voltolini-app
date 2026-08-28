// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\painel\diagnosticos\[id]\questionario-expresso\orientacao\page.tsx

import type { Metadata } from "next";

import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { saveGuidanceStep } from "../actions";

import styles from "../questionario-expresso.module.css";

export const metadata: Metadata = {
  title:
    "Dúvidas e orientação | Questionário Expresso",
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

/*
 * Compatibilidade com respostas que possam
 * ter sido gravadas em uma estrutura anterior
 * do questionário.
 *
 * Primeiro usamos express.guidance, que é a
 * estrutura atual. Caso o campo não esteja ali,
 * procuramos a mesma chave dentro do JSON salvo.
 */
function findStringByKey(
  value: unknown,
  key: string,
): string {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found =
        findStringByKey(
          item,
          key,
        );

      if (found) {
        return found;
      }
    }

    return "";
  }

  const record =
    value as JsonRecord;

  const directValue =
    record[key];

  if (
    typeof directValue ===
      "string" &&
    directValue.trim()
  ) {
    return directValue;
  }

  for (
    const child
    of Object.values(record)
  ) {
    const found =
      findStringByKey(
        child,
        key,
      );

    if (found) {
      return found;
    }
  }

  return "";
}

function findBooleanByKey(
  value: unknown,
  key: string,
): boolean | null {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found =
        findBooleanByKey(
          item,
          key,
        );

      if (found !== null) {
        return found;
      }
    }

    return null;
  }

  const record =
    value as JsonRecord;

  const directValue =
    record[key];

  if (
    typeof directValue ===
    "boolean"
  ) {
    return directValue;
  }

  for (
    const child
    of Object.values(record)
  ) {
    const found =
      findBooleanByKey(
        child,
        key,
      );

    if (found !== null) {
      return found;
    }
  }

  return null;
}

const errorMessages: Record<
  string,
  string
> = {
  "confirmacao-obrigatoria":
    "Confirme que as informações estão corretas antes de continuar.",

  "nao-foi-possivel-carregar":
    "Não foi possível carregar as informações desta etapa.",

  "nao-foi-possivel-salvar":
    "Não foi possível salvar esta etapa. Tente novamente.",

  "etapa-incompleta":
    "Conclua esta etapa antes de continuar.",
};

export default async function GuidancePage({
  params,
  searchParams,
}: PageProps) {
  const { id } =
    await params;

  const { erro } =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
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
    .eq(
      "id",
      id,
    )
    .eq(
      "user_id",
      userId,
    )
    .maybeSingle();

  if (
    diagnosticError ||
    !diagnostic
  ) {
    notFound();
  }

  if (
    ![
      "awaiting_questionnaire",
      "awaiting_documents",
    ].includes(
      diagnostic.status,
    )
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
    .select("answers")
    .eq(
      "diagnostic_id",
      diagnostic.id,
    )
    .maybeSingle();

  if (questionnaireError) {
    console.error(
      "Erro ao carregar o questionário expresso:",
      questionnaireError,
    );

    redirect(
      `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/documentos`,
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

  const guidance =
    asRecord(
      express.guidance,
    );

  /*
   * Estrutura atual:
   * answers.express.guidance
   *
   * Se o conteúdo não estiver nela,
   * procuramos a mesma informação no
   * questionário já salvo.
   */
  const mainQuestion =
    asString(
      guidance.mainQuestion,
    ).trim() ||
    findStringByKey(
      answers,
      "mainQuestion",
    );

  const practicalDecision =
    asString(
      guidance.practicalDecision,
    ).trim() ||
    findStringByKey(
      answers,
      "practicalDecision",
    );

  const additionalInformation =
    asString(
      guidance.additionalInformation,
    ).trim() ||
    findStringByKey(
      answers,
      "additionalInformation",
    );

  const informationConfirmation =
    guidance.informationConfirmation ===
      true ||
    findBooleanByKey(
      answers,
      "informationConfirmation",
    ) === true;

  return (
    <article
      className={styles.card}
    >
      <header
        className={
          styles.cardHeader
        }
      >
        <span>
          Etapa 4 de 5
        </span>

        <h2>
          Dúvidas e orientação
        </h2>

        <p>
          Informe as principais dúvidas,
          decisões ou pontos que você
          deseja esclarecer na análise.
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

      <form
        action={
          saveGuidanceStep
        }
        className={
          styles.form
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
            styles.formGrid
          }
        >
          <label
            className={
              styles.fullField
            }
          >
            <span>
              Qual é a principal dúvida
              que você deseja esclarecer?
            </span>

            <textarea
              name="mainQuestion"
              defaultValue={
                mainQuestion
              }
              placeholder="Descreva a principal dúvida relacionada às operações, ao faturamento ou à preparação para IBS/CBS."
            />
          </label>

          <label
            className={
              styles.fullField
            }
          >
            <span>
              Existe alguma decisão
              prática que precisa ser
              tomada?
            </span>

            <textarea
              name="practicalDecision"
              defaultValue={
                practicalDecision
              }
              placeholder="Exemplo: definir como parametrizar determinada operação, validar um procedimento ou decidir como faturar uma situação específica."
            />
          </label>

          <label
            className={
              styles.fullField
            }
          >
            <span>
              Informação adicional
            </span>

            <textarea
              name="additionalInformation"
              defaultValue={
                additionalInformation
              }
              placeholder="Inclua aqui qualquer contexto adicional que possa ajudar na análise. Campo opcional."
            />
          </label>
        </div>

        <label
          style={{
            display:
              "flex",

            alignItems:
              "flex-start",

            gap:
              "14px",

            marginTop:
              "26px",

            border:
              "1px solid #dce3e9",

            borderRadius:
              "10px",

            background:
              "#f8fafc",

            padding:
              "18px 20px",

            color:
              "#0d1b2a",

            fontSize:
              "0.92rem",

            fontWeight:
              "650",

            lineHeight:
              "1.55",

            cursor:
              "pointer",
          }}
        >
          <input
            type="checkbox"
            name="informationConfirmation"
            defaultChecked={
              informationConfirmation
            }
            required
            style={{
              width:
                "19px",

              height:
                "19px",

              minWidth:
                "19px",

              flex:
                "0 0 19px",

              margin:
                "2px 0 0",

              padding:
                "0",

              accentColor:
                "#c9a227",

              cursor:
                "pointer",
            }}
          />

          <span>
            Confirmo que revisei as
            informações desta etapa e que
            elas representam o contexto
            que desejo considerar no
            diagnóstico.
          </span>
        </label>

        <footer
          style={{
            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            gap:
              "20px",

            flexWrap:
              "wrap",

            marginTop:
              "30px",

            borderTop:
              "1px solid #d6e0e8",

            paddingTop:
              "28px",
          }}
        >
          <Link
            href={`/painel/diagnosticos/${diagnostic.id}/questionario-expresso/documentos`}
            style={{
              display:
                "inline-flex",

              minWidth:
                "150px",

              minHeight:
                "58px",

              alignItems:
                "center",

              justifyContent:
                "center",

              border:
                "1px solid #cbd6df",

              borderRadius:
                "9px",

              background:
                "#ffffff",

              color:
                "#0d1b2a",

              padding:
                "0 34px",

              fontSize:
                "0.92rem",

              fontWeight:
                "800",

              lineHeight:
                "1",

              textDecoration:
                "none",

              whiteSpace:
                "nowrap",
            }}
          >
            Voltar
          </Link>

          <button
            type="submit"
            style={{
              appearance:
                "none",

              display:
                "inline-flex",

              minWidth:
                "218px",

              minHeight:
                "58px",

              alignItems:
                "center",

              justifyContent:
                "center",

              border:
                "1px solid #c9a227",

              borderRadius:
                "9px",

              background:
                "#c9a227",

              color:
                "#0d1b2a",

              padding:
                "0 34px",

              fontFamily:
                "inherit",

              fontSize:
                "0.92rem",

              fontWeight:
                "800",

              lineHeight:
                "1",

              cursor:
                "pointer",

              whiteSpace:
                "nowrap",
            }}
          >
            Salvar etapa
          </button>
        </footer>
      </form>
    </article>
  );
}