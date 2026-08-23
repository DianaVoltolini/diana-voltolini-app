// app/painel/diagnosticos/[id]/questionario-expresso/preparacao/page.tsx

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
  savePreparationStep,
} from "../actions";

import styles from "../questionario-expresso.module.css";

export const metadata: Metadata = {
  title:
    "Preparação | Questionário Expresso",
};

export const dynamic =
  "force-dynamic";

type PreparationStepPageProps = {
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

const errorMessages: Record<
  string,
  string
> = {
  "campos-obrigatorios":
    "Preencha todos os campos obrigatórios antes de continuar.",

  "nao-foi-possivel-carregar":
    "Não foi possível carregar as respostas já salvas.",

  "nao-foi-possivel-salvar":
    "Não foi possível salvar esta etapa. Tente novamente.",
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
    ? value
    : "";
}

export default async function PreparationStepPage({
  params,
  searchParams,
}: PreparationStepPageProps) {
  const { id } = await params;

  const {
    erro,
    sucesso,
  } = await searchParams;

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
        company_id,
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

  const [
    { data: company },
    { data: questionnaire },
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("erp_name")
      .eq(
        "id",
        diagnostic.company_id,
      )
      .maybeSingle(),

    supabase
      .from(
        "diagnostic_questionnaires",
      )
      .select("answers")
      .eq(
        "diagnostic_id",
        diagnostic.id,
      )
      .maybeSingle(),
  ]);

  const answers =
    asRecord(
      questionnaire?.answers,
    );

  const express =
    asRecord(
      answers.express,
    );

  const preparation =
    asRecord(
      express.preparation,
    );

  return (
    <article
      className={styles.formCard}
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
          Etapa 2 de 5
        </div>

        <h2>
          Preparação para IBS/CBS
        </h2>

        <p>
          Informe qual sistema é utilizado
          e a situação atual da configuração
          do IBS/CBS e das orientações
          recebidas da contabilidade.
        </p>
      </header>

      {erro ? (
        <div
          className={
            styles.errorMessage
          }
        >
          {errorMessages[erro] ??
            "Não foi possível concluir a operação."}
        </div>
      ) : null}

      {sucesso ===
      "etapa-salva" ? (
        <div
          className={
            styles.successMessage
          }
        >
          Etapa salva. As informações já
          estão registradas no diagnóstico.
        </div>
      ) : null}

      <form
        className={styles.form}
        action={savePreparationStep}
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
          <label>
            <span>
              ERP ou sistema emissor *
            </span>

            <input
              type="text"
              name="erpName"
              required
              defaultValue={
                asString(
                  preparation.erpName,
                ) ||
                company?.erp_name ||
                ""
              }
              placeholder="Exemplo: Bling, Nomus, Protheus..."
            />
          </label>

          <label>
            <span>
              Versão do sistema
            </span>

            <input
              type="text"
              name="erpVersion"
              defaultValue={
                asString(
                  preparation.erpVersion,
                )
              }
              placeholder="Opcional"
            />

            <small>
              Informe somente caso saiba
              identificar a versão.
            </small>
          </label>

          <label
            className={
              styles.fullField
            }
          >
            <span>
              O sistema já está configurado
              para gerar IBS e CBS? *
            </span>

            <select
              name="ibsCbsConfiguration"
              required
              defaultValue={
                asString(
                  preparation.ibsCbsConfiguration,
                )
              }
            >
              <option value="">
                Selecione
              </option>

              <option value="sim">
                Sim
              </option>

              <option value="nao">
                Não
              </option>

              <option value="parcialmente">
                Parcialmente
              </option>

              <option value="nao_sei">
                Não sei
              </option>
            </select>
          </label>

          <label
            className={
              styles.fullField
            }
          >
            <span>
              A contabilidade já orientou a
              empresa sobre CST, cClassTrib
              e tratamentos tributários? *
            </span>

            <select
              name="accountingGuidance"
              required
              defaultValue={
                asString(
                  preparation.accountingGuidance,
                )
              }
            >
              <option value="">
                Selecione
              </option>

              <option value="sim_por_escrito">
                Sim, por escrito
              </option>

              <option value="sim_verbalmente">
                Sim, verbalmente
              </option>

              <option value="parcialmente">
                Parcialmente
              </option>

              <option value="ainda_nao">
                Ainda não
              </option>

              <option value="nao_sei">
                Não sei
              </option>
            </select>
          </label>

          <label
            className={
              styles.fullField
            }
          >
            <span>
              Observações sobre a preparação
              atual
            </span>

            <textarea
              name="preparationNotes"
              defaultValue={
                asString(
                  preparation.preparationNotes,
                )
              }
              placeholder="Informe testes já realizados, dificuldades encontradas ou alguma informação relevante sobre a configuração atual."
            />
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
            href={`/painel/diagnosticos/${diagnostic.id}/questionario-expresso/empresa`}
          >
            Voltar
          </Link>

          <button type="submit">
            Salvar etapa
          </button>
        </footer>
      </form>
    </article>
  );
}