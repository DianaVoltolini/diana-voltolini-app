// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\painel\diagnosticos\[id]\questionario-expresso\layout.tsx

import type {
  ReactNode,
} from "react";

import Image from "next/image";
import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { logout } from "../../../actions";

import StepNavigation from "./step-navigation";

import styles from "./questionario-expresso.module.css";

export const dynamic =
  "force-dynamic";

type LayoutProps = {
  children: ReactNode;

  params: Promise<{
    id: string;
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

function hasText(
  value: unknown,
) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function calculateRatio(
  values: unknown[],
) {
  if (values.length === 0) {
    return 0;
  }

  const completed =
    values.filter(hasText).length;

  return completed /
    values.length;
}

export default async function ExpressQuestionnaireLayout({
  children,
  params,
}: LayoutProps) {
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

  const companyRatio =
    calculateRatio([
      company.legalName,
      company.cnpj,
      company.city,
      company.state,
      company.mainActivity,
      company.taxRegime,
      company.contactName,
      company.contactValue,
      company.businessContext,
    ]);

  const preparationRatio =
    calculateRatio([
      preparation.erpName,
      preparation.ibsCbsConfiguration,
      preparation.accountingGuidance,
    ]);

  const documentRatio =
    documents.length > 0
      ? 1
      : 0;

  const guidanceRatio =
    guidance.completed === true &&
    guidance.informationConfirmation ===
      true
      ? 1
      : 0;

  const companyComplete =
    companyRatio >= 1;

  const preparationComplete =
    preparationRatio >= 1;

  const documentsComplete =
    documentRatio >= 1;

  const guidanceComplete =
    guidanceRatio >= 1;

  const progress =
    Math.round(
      companyRatio * 25 +
        preparationRatio * 25 +
        documentRatio * 25 +
        guidanceRatio * 25,
    );

  const reviewReady =
    companyComplete &&
    preparationComplete &&
    documentsComplete &&
    guidanceComplete;

  const steps = [
    {
      number: "1",
      title: "Empresa",
      description:
        "Identificação e contexto",

      href:
        `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/empresa`,

      ratio:
        companyRatio,

      enabled:
        true,
    },
    {
      number: "2",
      title: "Preparação",
      description:
        "ERP, IBS/CBS e contabilidade",

      href:
        `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/preparacao`,

      ratio:
        preparationRatio,

      enabled:
        companyComplete,
    },
    {
      number: "3",
      title: "NF-e para análise",
      description:
        "XMLs e contexto de cada nota",

      href:
        `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/documentos`,

      ratio:
        documentRatio,

      enabled:
        companyComplete &&
        preparationComplete,
    },
    {
      number: "4",
      title: "Dúvidas e orientação",
      description:
        "Questões que deseja esclarecer",

      href:
        `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/orientacao`,

      ratio:
        guidanceRatio,

      enabled:
        companyComplete &&
        preparationComplete &&
        documentsComplete,
    },
    {
      number: "5",
      title: "Revisão e envio",
      description:
        "Conferência final",

      href:
        `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/revisao`,

      ratio:
        reviewReady
          ? 0.5
          : 0,

      enabled:
        reviewReady,

      reviewReady,
    },
  ];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div
          className={`container ${styles.headerContent}`}
        >
          <Link
            href="/painel"
            aria-label="Voltar ao painel"
          >
            <Image
              className={styles.logo}
              src="/brand/logo-light.png"
              alt="Diana Voltolini"
              width={1535}
              height={538}
              priority
            />
          </Link>

          <div
            className={
              styles.headerActions
            }
          >
            <Link
              className={
                styles.backButton
              }
              href={`/painel/diagnosticos/${diagnostic.id}`}
            >
              Voltar ao diagnóstico
            </Link>

            <form action={logout}>
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
        className={styles.content}
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

            <Link
              href={`/painel/diagnosticos/${diagnostic.id}`}
            >
              {diagnostic.code}
            </Link>

            <span>/</span>

            <strong>
              Questionário
            </strong>
          </nav>

          <header
            className={
              styles.wizardHeader
            }
          >
            <div>
              <p
                className={
                  styles.eyebrow
                }
              >
                Diagnóstico Expresso
                IBS/CBS
              </p>

              <h1>
                Informações para análise
              </h1>

              <p>
                Preencha uma etapa por
                vez. As informações ficam
                salvas e podem ser
                revisadas antes do envio.
              </p>
            </div>

            <div
              className={
                styles.progressSummary
              }
            >
              <span>
                Preenchimento
              </span>

              <strong>
                {progress}%
              </strong>
            </div>
          </header>

          <section
            className={
              styles.progressCard
            }
          >
            <div
              className={
                styles.progressTrack
              }
            >
              <span
                style={{
                  width:
                    `${progress}%`,
                }}
              />
            </div>

            <div
              className={
                styles.progressDetails
              }
            >
              <strong>
                {progress}% preenchido
              </strong>

              <span>
                Você pode voltar às
                etapas anteriores antes
                do envio final.
              </span>
            </div>
          </section>

          <div
            className={
              styles.wizardGrid
            }
          >
            <aside
              className={
                styles.stepSidebar
              }
            >
              <StepNavigation
                steps={steps}
              />

              <div
                className={
                  styles.sidebarNotice
                }
              >
                <strong>
                  Salvamento por etapa
                </strong>

                <p>
                  Ao clicar em salvar e
                  continuar, suas
                  informações permanecem
                  disponíveis mesmo que
                  você saia da página.
                </p>
              </div>
            </aside>

            <section
              className={
                styles.formArea
              }
            >
              {children}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
