// app/painel/diagnosticos/[id]/questionario-expresso/page.tsx

import {
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic =
  "force-dynamic";

type ExpressQuestionnairePageProps = {
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

function isCompanyComplete(
  company: JsonRecord,
) {
  return [
    company.legalName,
    company.cnpj,
    company.city,
    company.state,
    company.mainActivity,
    company.taxRegime,
    company.contactName,
    company.contactValue,
    company.businessContext,
  ].every(hasText);
}

function isPreparationComplete(
  preparation: JsonRecord,
) {
  return [
    preparation.erpName,
    preparation.ibsCbsConfiguration,
    preparation.accountingGuidance,
  ].every(hasText);
}

function isGuidanceComplete(
  guidance: JsonRecord,
) {
  return (
    guidance.completed === true &&
    guidance.informationConfirmation ===
      true
  );
}

export default async function ExpressQuestionnairePage({
  params,
}: ExpressQuestionnairePageProps) {
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
    redirect("/painel");
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
      "Erro ao carregar o questionário expresso:",
      questionnaireError,
    );

    redirect(
      `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/empresa`,
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

  const guidance =
    asRecord(
      express.guidance,
    );

  const documents =
    Array.isArray(
      express.documents,
    )
      ? express.documents
      : [];

  /*
   * ETAPA 1
   *
   * Se a identificação da empresa
   * ainda não estiver completa,
   * começa ou continua pela Empresa.
   */
  if (
    !isCompanyComplete(
      company,
    )
  ) {
    redirect(
      `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/empresa`,
    );
  }

  /*
   * ETAPA 2
   *
   * Empresa concluída, mas preparação
   * ainda incompleta.
   */
  if (
    !isPreparationComplete(
      preparation,
    )
  ) {
    redirect(
      `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/preparacao`,
    );
  }

  /*
   * ETAPA 3
   *
   * Empresa e preparação concluídas,
   * mas nenhum XML foi salvo.
   */
  if (
    documents.length === 0
  ) {
    redirect(
      `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/documentos`,
    );
  }

  /*
   * ETAPA 4
   *
   * Existe pelo menos um XML salvo,
   * mas a etapa de dúvidas e orientação
   * ainda não foi concluída.
   */
  if (
    !isGuidanceComplete(
      guidance,
    )
  ) {
    redirect(
      `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/orientacao`,
    );
  }

  /*
   * ETAPA 5
   *
   * Todas as etapas anteriores estão
   * concluídas.
   */
  redirect(
    `/painel/diagnosticos/${diagnostic.id}/questionario-expresso/revisao`,
  );
}