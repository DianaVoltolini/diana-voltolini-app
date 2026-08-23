// app/painel/diagnosticos/[id]/questionario-expresso/empresa/page.tsx

import type {
  Metadata,
} from "next";

import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  saveCompanyStep,
} from "../actions";

import styles from "../questionario-expresso.module.css";

export const metadata: Metadata = {
  title:
    "Empresa | Questionário Expresso",
};

export const dynamic =
  "force-dynamic";

type CompanyStepPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    erro?: string;
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

export default async function CompanyStepPage({
  params,
  searchParams,
}: CompanyStepPageProps) {
  const { id } = await params;

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
      .select(
        `
          legal_name,
          cnpj,
          city,
          state,
          main_activity,
          tax_regime
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

  const companyAnswers =
    asRecord(
      express.company,
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
          Etapa 1 de 5
        </div>

        <h2>
          Empresa e contexto
        </h2>

        <p>
          Informe os dados principais e
          apresente brevemente como funciona
          o faturamento e quais dificuldades
          existem atualmente.
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

      <form
        className={styles.form}
        action={saveCompanyStep}
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
              Razão social *
            </span>

            <input
              type="text"
              name="legalName"
              required
              defaultValue={
                asString(
                  companyAnswers.legalName,
                ) ||
                company?.legal_name ||
                ""
              }
            />
          </label>

          <label>
            <span>CNPJ *</span>

            <input
              type="text"
              name="cnpj"
              required
              defaultValue={
                asString(
                  companyAnswers.cnpj,
                ) ||
                company?.cnpj ||
                ""
              }
              placeholder="00.000.000/0000-00"
            />
          </label>

          <label>
            <span>
              Regime tributário *
            </span>

            <select
              name="taxRegime"
              required
              defaultValue={
                asString(
                  companyAnswers.taxRegime,
                ) ||
                company?.tax_regime ||
                ""
              }
            >
              <option value="">
                Selecione
              </option>

              <option value="mei">
                MEI
              </option>

              <option value="simples_nacional">
                Simples Nacional
              </option>

              <option value="lucro_presumido">
                Lucro Presumido
              </option>

              <option value="lucro_real">
                Lucro Real
              </option>

              <option value="outro">
                Outro
              </option>
            </select>
          </label>

          <label>
            <span>Município *</span>

            <input
              type="text"
              name="city"
              required
              defaultValue={
                asString(
                  companyAnswers.city,
                ) ||
                company?.city ||
                ""
              }
            />
          </label>

          <label>
            <span>Estado *</span>

            <input
              type="text"
              name="state"
              required
              maxLength={2}
              defaultValue={
                asString(
                  companyAnswers.state,
                ) ||
                company?.state ||
                ""
              }
              placeholder="SC"
            />
          </label>

          <label
            className={
              styles.fullField
            }
          >
            <span>
              Atividade principal *
            </span>

            <input
              type="text"
              name="mainActivity"
              required
              defaultValue={
                asString(
                  companyAnswers.mainActivity,
                ) ||
                company?.main_activity ||
                ""
              }
              placeholder="Exemplo: comércio de equipamentos, indústria, prestação de serviços..."
            />
          </label>

          <label>
            <span>
              Responsável pelo envio *
            </span>

            <input
              type="text"
              name="contactName"
              required
              defaultValue={
                asString(
                  companyAnswers.contactName,
                )
              }
              placeholder="Nome do responsável"
            />
          </label>

          <label>
            <span>
              E-mail ou WhatsApp *
            </span>

            <input
              type="text"
              name="contactValue"
              required
              defaultValue={
                asString(
                  companyAnswers.contactValue,
                )
              }
              placeholder="Contato para esclarecimentos"
            />
          </label>

          <label
            className={
              styles.fullField
            }
          >
            <span>
              Contexto da empresa e da área
              fiscal *
            </span>

            <textarea
              name="businessContext"
              required
              defaultValue={
                asString(
                  companyAnswers.businessContext,
                )
              }
              placeholder="Conte brevemente como funciona o faturamento da empresa, quais são as principais operações e quais dificuldades ou dúvidas existem hoje em relação à emissão das NF-e e à implantação do IBS/CBS."
            />

            <small>
              Não é necessário descrever
              todos os processos. Informe
              apenas os pontos que ajudam a
              compreender a realidade da
              empresa.
            </small>
          </label>
        </div>

        <footer
          className={
            styles.formActions
          }
        >
          <span>
            Os campos marcados com * são
            obrigatórios.
          </span>

          <button type="submit">
            Salvar e continuar
          </button>
        </footer>
      </form>
    </article>
  );
}