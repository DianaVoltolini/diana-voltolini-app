// app/torre/diagnosticos/[id]/actions.ts

"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

const allowedDocumentStatuses = [
  "uploaded",
  "under_review",
  "approved",
  "rejected",
];

const allowedClassifications = [
  "prepared",
  "partially_prepared",
  "not_prepared",
];

const allowedOperationResults = [
  "pending",
  "compliant",
  "attention",
  "critical",
];

const allowedPreparationStatuses = [
  "pending",
  "proven",
  "partially_proven",
  "not_proven",
  "not_applicable",
];

type JsonRecord =
  Record<string, unknown>;

function readText(
  formData: FormData,
  field: string,
) {
  return String(
    formData.get(field) ?? "",
  ).trim();
}

function readInteger(
  formData: FormData,
  field: string,
) {
  const value =
    Number(
      readText(
        formData,
        field,
      ),
    );

  return Number.isInteger(value)
    ? value
    : 0;
}

function asRecord(
  value: unknown,
): JsonRecord {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asArray(
  value: unknown,
) {
  return Array.isArray(value)
    ? value
    : [];
}

function asString(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function isDetailedOperationComplete(
  operation: JsonRecord,
) {
  return (
    allowedOperationResults.includes(
      asString(
        operation.result,
      ),
    ) &&
    asString(
      operation.result,
    ) !==
      "pending" &&
    allowedPreparationStatuses.includes(
      asString(
        operation.preparation_status,
      ),
    ) &&
    asString(
      operation.preparation_status,
    ) !==
      "pending" &&
    Boolean(
      asString(
        operation.operation_identification,
      ),
    ) &&
    Boolean(
      asString(
        operation.evidence_found,
      ),
    ) &&
    Boolean(
      asString(
        operation.calculation_review,
      ),
    ) &&
    Boolean(
      asString(
        operation.technical_finding,
      ),
    ) &&
    Boolean(
      asString(
        operation.risk_impact,
      ),
    ) &&
    Boolean(
      asString(
        operation.recommended_action,
      ),
    ) &&
    Boolean(
      asString(
        operation.responsible_party,
      ),
    ) &&
    Boolean(
      asString(
        operation.closure_evidence,
      ),
    )
  );
}

function diagnosticPath(
  diagnosticId: string,
  parameter?: string,
) {
  const base =
    `/torre/diagnosticos/${diagnosticId}`;

  return parameter
    ? `${base}?${parameter}`
    : base;
}

function analysisPath(
  diagnosticId: string,
  xmlIndex = 0,
  parameter?: string,
) {
  const params =
    new URLSearchParams();

  params.set(
    "xml",
    String(xmlIndex),
  );

  if (parameter) {
    const extra =
      new URLSearchParams(
        parameter,
      );

    extra.forEach(
      (
        value,
        key,
      ) => {
        params.set(
          key,
          value,
        );
      },
    );
  }

  return `/torre/diagnosticos/${diagnosticId}/analise?${params.toString()}`;
}

function conclusionPath(
  diagnosticId: string,
  parameter?: string,
) {
  const base =
    `/torre/diagnosticos/${diagnosticId}/conclusao`;

  return parameter
    ? `${base}?${parameter}`
    : base;
}

function revalidateWorkspace(
  diagnosticId: string,
) {
  revalidatePath(
    "/torre",
  );

  revalidatePath(
    diagnosticPath(
      diagnosticId,
    ),
  );

  revalidatePath(
    `/torre/diagnosticos/${diagnosticId}/analise`,
  );

  revalidatePath(
    `/torre/diagnosticos/${diagnosticId}/conclusao`,
  );

  revalidatePath(
    `/torre/diagnosticos/${diagnosticId}/questionario`,
  );

  revalidatePath(
    `/torre/diagnosticos/${diagnosticId}/finalizar`,
  );
}

async function registerStatusHistory(
  supabase: Awaited<
    ReturnType<
      typeof requireAdmin
    >
  >["supabase"],
  diagnosticId: string,
  oldStatus: string | null,
  newStatus: string,
  changedBy: string,
  note: string,
) {
  await supabase
    .from(
      "diagnostic_status_history",
    )
    .insert({
      diagnostic_id:
        diagnosticId,

      old_status:
        oldStatus,

      new_status:
        newStatus,

      changed_by:
        changedBy,

      note,
    });
}

async function setAnalysisDraft(
  supabase: Awaited<
    ReturnType<
      typeof requireAdmin
    >
  >["supabase"],
  diagnosticId: string,
  userId: string,
) {
  const {
    error,
  } =
    await supabase
      .from(
        "diagnostic_analysis",
      )
      .update({
        analysis_status:
          "draft",

        updated_by:
          userId,
      })
      .eq(
        "diagnostic_id",
        diagnosticId,
      );

  return error;
}

/*
 * =========================================================
 * INICIAR ANÁLISE
 * =========================================================
 */

export async function startAnalysis(
  formData: FormData,
) {
  const diagnosticId =
    readText(
      formData,
      "diagnosticId",
    );

  const deadline =
    readText(
      formData,
      "deadline",
    );

  if (!diagnosticId) {
    redirect(
      "/torre?erro=diagnostico-invalido",
    );
  }

  if (!deadline) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=prazo-obrigatorio",
      ),
    );
  }

  const deadlineDate =
    new Date(
      `${deadline}T23:59:59-03:00`,
    );

  if (
    Number.isNaN(
      deadlineDate.getTime(),
    )
  ) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=prazo-invalido",
      ),
    );
  }

  const {
    supabase,
    userId,
  } =
    await requireAdmin();

  const {
    data: diagnostic,
  } =
    await supabase
      .from("diagnostics")
      .select(
        "id, status",
      )
      .eq(
        "id",
        diagnosticId,
      )
      .maybeSingle();

  if (
    !diagnostic ||
    diagnostic.status !==
      "documents_received"
  ) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=nao-foi-possivel-iniciar",
      ),
    );
  }

  const now =
    new Date().toISOString();

  const {
    data:
      updatedDiagnostic,
    error,
  } =
    await supabase
      .from("diagnostics")
      .update({
        status:
          "under_review",

        analysis_started_at:
          now,

        client_deadline_at:
          deadlineDate.toISOString(),

        updated_at:
          now,
      })
      .eq(
        "id",
        diagnosticId,
      )
      .eq(
        "status",
        "documents_received",
      )
      .select("id")
      .maybeSingle();

  if (
    error ||
    !updatedDiagnostic
  ) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=nao-foi-possivel-iniciar",
      ),
    );
  }

  await registerStatusHistory(
    supabase,
    diagnosticId,
    "documents_received",
    "under_review",
    userId,
    "Análise técnica iniciada pela administradora.",
  );

  revalidateWorkspace(
    diagnosticId,
  );

  redirect(
    analysisPath(
      diagnosticId,
      0,
      "sucesso=analise-iniciada",
    ),
  );
}

/*
 * =========================================================
 * SALVAR UMA NF-e POR VEZ
 * =========================================================
 */

export async function saveOperationAnalysis(
  formData: FormData,
) {
  const diagnosticId =
    readText(
      formData,
      "diagnosticId",
    );

  const documentId =
    readText(
      formData,
      "documentId",
    );

  const fileName =
    readText(
      formData,
      "fileName",
    );

  const operationName =
    readText(
      formData,
      "operationName",
    );

  const cfop =
    readText(
      formData,
      "cfop",
    );

  const result =
    readText(
      formData,
      "result",
    );

  const preparationStatus =
    readText(
      formData,
      "preparationStatus",
    );

  const operationIdentification =
    readText(
      formData,
      "operationIdentification",
    );

  const evidenceFound =
    readText(
      formData,
      "evidenceFound",
    );

  const calculationReview =
    readText(
      formData,
      "calculationReview",
    );

  const technicalFinding =
    readText(
      formData,
      "technicalFinding",
    );

  const technicalBasis =
    readText(
      formData,
      "technicalBasis",
    );

  const riskImpact =
    readText(
      formData,
      "riskImpact",
    );

  const recommendedAction =
    readText(
      formData,
      "recommendedAction",
    );

  const responsibleParty =
    readText(
      formData,
      "responsibleParty",
    );

  const closureEvidence =
    readText(
      formData,
      "closureEvidence",
    );

  const currentIndex =
    Math.max(
      0,
      readInteger(
        formData,
        "currentIndex",
      ),
    );

  const totalDocuments =
    Math.max(
      1,
      readInteger(
        formData,
        "totalDocuments",
      ),
    );

  if (
    !diagnosticId ||
    !documentId
  ) {
    redirect(
      "/torre?erro=diagnostico-invalido",
    );
  }

  const normalizedResult =
    allowedOperationResults.includes(
      result,
    )
      ? result
      : "pending";

  const normalizedPreparationStatus =
    allowedPreparationStatuses.includes(
      preparationStatus,
    )
      ? preparationStatus
      : "pending";

  const {
    supabase,
    userId,
  } =
    await requireAdmin();

  const [
    {
      data:
        diagnostic,
    },

    {
      data:
        document,
    },

    {
      data:
        existingAnalysis,
    },
  ] =
    await Promise.all([
      supabase
        .from(
          "diagnostics",
        )
        .select(
          "id, status",
        )
        .eq(
          "id",
          diagnosticId,
        )
        .maybeSingle(),

      supabase
        .from(
          "diagnostic_documents",
        )
        .select(
          `
            id,
            file_name,
            category,
            counts_toward_limit,
            status
          `,
        )
        .eq(
          "id",
          documentId,
        )
        .eq(
          "diagnostic_id",
          diagnosticId,
        )
        .maybeSingle(),

      supabase
        .from(
          "diagnostic_analysis",
        )
        .select(
          `
            id,
            operations
          `,
        )
        .eq(
          "diagnostic_id",
          diagnosticId,
        )
        .maybeSingle(),
    ]);

  if (
    !diagnostic ||
    diagnostic.status !==
      "under_review"
  ) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=analise-bloqueada",
      ),
    );
  }

  if (
    !document ||
    document.category !==
      "xml" ||
    !document.counts_toward_limit ||
    document.status ===
      "rejected"
  ) {
    redirect(
      analysisPath(
        diagnosticId,
        currentIndex,
        "erro=documento-nao-encontrado",
      ),
    );
  }

  const currentOperations =
    asArray(
      existingAnalysis?.operations,
    ).map(
      asRecord,
    );

  const legacyTechnicalAnalysis =
    [
      `IDENTIFICAÇÃO DA OPERAÇÃO\n${operationIdentification}`,
      `EVIDÊNCIAS ENCONTRADAS\n${evidenceFound}`,
      `CONFERÊNCIA DOS CÁLCULOS\n${calculationReview}`,
      `ACHADO TÉCNICO\n${technicalFinding}`,
      technicalBasis
        ? `FUNDAMENTAÇÃO TÉCNICA\n${technicalBasis}`
        : "",
      `RISCO / IMPACTO\n${riskImpact}`,
    ]
      .filter(
        Boolean,
      )
      .join(
        "\n\n",
      );

  const legacyRecommendation =
    [
      `AÇÃO RECOMENDADA\n${recommendedAction}`,
      `RESPONSÁVEL SUGERIDO\n${responsibleParty}`,
      `EVIDÊNCIA PARA ENCERRAMENTO\n${closureEvidence}`,
    ].join(
      "\n\n",
    );

  const newOperation = {
    document_id:
      document.id,

    file_name:
      document.file_name ||
      fileName,

    operation:
      operationName,

    cfop:
      cfop || null,

    frequency:
      "",

    result:
      normalizedResult,

    document_conformity:
      normalizedResult,

    preparation_status:
      normalizedPreparationStatus,

    operation_identification:
      operationIdentification,

    evidence_found:
      evidenceFound,

    calculation_review:
      calculationReview,

    technical_finding:
      technicalFinding,

    technical_basis:
      technicalBasis ||
      null,

    risk_impact:
      riskImpact,

    recommended_action:
      recommendedAction,

    responsible_party:
      responsibleParty,

    closure_evidence:
      closureEvidence,

    /*
     * Campos legados mantidos enquanto
     * tela do cliente e PDF ainda usam
     * a estrutura anterior.
     */
    technical_analysis:
      legacyTechnicalAnalysis,

    recommendation:
      legacyRecommendation,
  };

  const existingIndex =
    currentOperations.findIndex(
      (
        operation,
      ) =>
        asString(
          operation.document_id,
        ) ===
        documentId,
    );

  const updatedOperations =
    [
      ...currentOperations,
    ];

  if (
    existingIndex >= 0
  ) {
    updatedOperations[
      existingIndex
    ] =
      newOperation;
  } else if (
    updatedOperations[
      currentIndex
    ] &&
    !asString(
      updatedOperations[
        currentIndex
      ].document_id,
    )
  ) {
    updatedOperations[
      currentIndex
    ] =
      newOperation;
  } else {
    updatedOperations.push(
      newOperation,
    );
  }

  let saveError:
    unknown =
    null;

  if (
    existingAnalysis
  ) {
    const {
      error,
    } =
      await supabase
        .from(
          "diagnostic_analysis",
        )
        .update({
          operations:
            updatedOperations,

          analysis_status:
            "draft",

          updated_by:
            userId,
        })
        .eq(
          "diagnostic_id",
          diagnosticId,
        );

    saveError =
      error;
  } else {
    const {
      error,
    } =
      await supabase
        .from(
          "diagnostic_analysis",
        )
        .insert({
          diagnostic_id:
            diagnosticId,

          operations:
            updatedOperations,

          general_assessment:
            null,

          strengths:
            null,

          risks:
            null,

          action_plan:
            null,

          final_opinion:
            null,

          final_classification:
            null,

          analysis_status:
            "draft",

          created_by:
            userId,

          updated_by:
            userId,
        });

    saveError =
      error;
  }

  if (saveError) {
    console.error(
      "Erro ao salvar análise do XML:",
      saveError,
    );

    redirect(
      analysisPath(
        diagnosticId,
        currentIndex,
        "erro=nao-foi-possivel-salvar-analise",
      ),
    );
  }

  revalidateWorkspace(
    diagnosticId,
  );

  /*
   * A análise é salva como rascunho antes
   * de qualquer retorno de validação.
   *
   * Assim, se algum campo obrigatório
   * estiver faltando, o conteúdo já digitado
   * permanece registrado e reaparece ao
   * retornar para este XML.
   */
  if (
    normalizedResult ===
      "pending"
  ) {
    redirect(
      analysisPath(
        diagnosticId,
        currentIndex,
        "erro=resultado-obrigatorio",
      ),
    );
  }

  if (
    normalizedPreparationStatus ===
      "pending"
  ) {
    redirect(
      analysisPath(
        diagnosticId,
        currentIndex,
        "erro=preparacao-obrigatoria",
      ),
    );
  }

  if (
    !operationIdentification ||
    !evidenceFound ||
    !calculationReview ||
    !technicalFinding ||
    !riskImpact ||
    !recommendedAction ||
    !responsibleParty ||
    !closureEvidence
  ) {
    redirect(
      analysisPath(
        diagnosticId,
        currentIndex,
        "erro=analise-detalhada-incompleta",
      ),
    );
  }

  const nextIndex =
    currentIndex + 1;

  if (
    nextIndex <
    totalDocuments
  ) {
    redirect(
      analysisPath(
        diagnosticId,
        nextIndex,
        "sucesso=xml-analisado",
      ),
    );
  }

  redirect(
    conclusionPath(
      diagnosticId,
      "sucesso=xmls-analisados",
    ),
  );
}

/*
 * =========================================================
 * SALVAR CONCLUSÃO
 * =========================================================
 */

export async function saveConclusion(
  formData: FormData,
) {
  const diagnosticId =
    readText(
      formData,
      "diagnosticId",
    );

  const generalAssessment =
    readText(
      formData,
      "generalAssessment",
    );

  const strengths =
    readText(
      formData,
      "strengths",
    );

  const risks =
    readText(
      formData,
      "risks",
    );

  const actionPlan =
    readText(
      formData,
      "actionPlan",
    );

  const finalOpinion =
    readText(
      formData,
      "finalOpinion",
    );

  const classification =
    readText(
      formData,
      "finalClassification",
    );

  if (!diagnosticId) {
    redirect(
      "/torre?erro=diagnostico-invalido",
    );
  }

  if (
    !generalAssessment
  ) {
    redirect(
      conclusionPath(
        diagnosticId,
        "erro=avaliacao-geral-obrigatoria",
      ),
    );
  }

  if (
    !allowedClassifications.includes(
      classification,
    )
  ) {
    redirect(
      conclusionPath(
        diagnosticId,
        "erro=classificacao-obrigatoria",
      ),
    );
  }

  if (
    !finalOpinion
  ) {
    redirect(
      conclusionPath(
        diagnosticId,
        "erro=parecer-final-obrigatorio",
      ),
    );
  }

  const {
    supabase,
    userId,
  } =
    await requireAdmin();

  const [
    {
      data:
        diagnostic,
    },

    {
      data:
        documents,
    },

    {
      data:
        analysis,
    },
  ] =
    await Promise.all([
      supabase
        .from(
          "diagnostics",
        )
        .select(
          "id, status",
        )
        .eq(
          "id",
          diagnosticId,
        )
        .maybeSingle(),

      supabase
        .from(
          "diagnostic_documents",
        )
        .select(
          `
            id,
            created_at
          `,
        )
        .eq(
          "diagnostic_id",
          diagnosticId,
        )
        .eq(
          "category",
          "xml",
        )
        .eq(
          "counts_toward_limit",
          true,
        )
        .neq(
          "status",
          "rejected",
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        ),

      supabase
        .from(
          "diagnostic_analysis",
        )
        .select(
          `
            id,
            operations
          `,
        )
        .eq(
          "diagnostic_id",
          diagnosticId,
        )
        .maybeSingle(),
    ]);

  if (
    !diagnostic ||
    diagnostic.status !==
      "under_review"
  ) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=analise-bloqueada",
      ),
    );
  }

  if (
    !analysis
  ) {
    redirect(
      analysisPath(
        diagnosticId,
        0,
        "erro=analise-xml-incompleta",
      ),
    );
  }

  const operations =
    asArray(
      analysis.operations,
    ).map(
      asRecord,
    );

  const xmlDocuments =
    documents ?? [];

  const firstIncompleteIndex =
    xmlDocuments.findIndex(
      (
        document,
        index,
      ) => {
        const operation =
          operations.find(
            (
              item,
            ) =>
              asString(
                item.document_id,
              ) ===
              document.id,
          ) ??
          operations[
            index
          ];

        return (
          !operation ||
          !isDetailedOperationComplete(
            operation,
          )
        );
      },
    );

  if (
    firstIncompleteIndex >=
    0
  ) {
    redirect(
      analysisPath(
        diagnosticId,
        firstIncompleteIndex,
        "erro=analise-xml-incompleta",
      ),
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "diagnostic_analysis",
      )
      .update({
        general_assessment:
          generalAssessment,

        strengths:
          strengths ||
          null,

        risks:
          risks ||
          null,

        action_plan:
          actionPlan ||
          null,

        final_opinion:
          finalOpinion,

        final_classification:
          classification,

        analysis_status:
          "draft",

        updated_by:
          userId,
      })
      .eq(
        "diagnostic_id",
        diagnosticId,
      );

  if (error) {
    console.error(
      "Erro ao salvar conclusão:",
      error,
    );

    redirect(
      conclusionPath(
        diagnosticId,
        "erro=nao-foi-possivel-salvar-conclusao",
      ),
    );
  }

  revalidateWorkspace(
    diagnosticId,
  );

  redirect(
    conclusionPath(
      diagnosticId,
      "sucesso=conclusao-salva",
    ),
  );
}

/*
 * =========================================================
 * AÇÃO ANTIGA DE SALVAMENTO
 *
 * Mantida temporariamente para não quebrar
 * nenhuma referência residual.
 * =========================================================
 */

export async function saveAnalysis(
  formData: FormData,
) {
  const diagnosticId =
    readText(
      formData,
      "diagnosticId",
    );

  if (!diagnosticId) {
    redirect(
      "/torre?erro=diagnostico-invalido",
    );
  }

  const operationCount =
    Number(
      readText(
        formData,
        "operationCount",
      ),
    );

  const normalizedOperationCount =
    Number.isInteger(
      operationCount,
    ) &&
    operationCount >= 0 &&
    operationCount <= 20
      ? operationCount
      : 0;

  const operations =
    Array.from(
      {
        length:
          normalizedOperationCount,
      },
      (_, index) => {
        const result =
          readText(
            formData,
            `operation_${index}_result`,
          );

        return {
          order:
            index + 1,

          operation:
            readText(
              formData,
              `operation_${index}_name`,
            ),

          cfop:
            readText(
              formData,
              `operation_${index}_cfop`,
            ),

          frequency:
            readText(
              formData,
              `operation_${index}_frequency`,
            ),

          result:
            allowedOperationResults.includes(
              result,
            )
              ? result
              : "pending",

          technical_analysis:
            readText(
              formData,
              `operation_${index}_analysis`,
            ),

          recommendation:
            readText(
              formData,
              `operation_${index}_recommendation`,
            ),
        };
      },
    );

  const classification =
    readText(
      formData,
      "finalClassification",
    );

  const normalizedClassification =
    allowedClassifications.includes(
      classification,
    )
      ? classification
      : null;

  const {
    supabase,
    userId,
  } =
    await requireAdmin();

  const {
    data:
      diagnostic,
  } =
    await supabase
      .from(
        "diagnostics",
      )
      .select(
        "id, status",
      )
      .eq(
        "id",
        diagnosticId,
      )
      .maybeSingle();

  if (!diagnostic) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=diagnostico-nao-encontrado",
      ),
    );
  }

  if (
    ![
      "documents_received",
      "under_review",
      "client_action_required",
      "awaiting_approval",
    ].includes(
      diagnostic.status,
    )
  ) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=analise-bloqueada",
      ),
    );
  }

  const analysisStatus =
    diagnostic.status ===
    "awaiting_approval"
      ? "ready_for_review"
      : "draft";

  const {
    error,
  } =
    await supabase
      .from(
        "diagnostic_analysis",
      )
      .upsert(
        {
          diagnostic_id:
            diagnosticId,

          operations,

          general_assessment:
            readText(
              formData,
              "generalAssessment",
            ) ||
            null,

          strengths:
            readText(
              formData,
              "strengths",
            ) ||
            null,

          risks:
            readText(
              formData,
              "risks",
            ) ||
            null,

          action_plan:
            readText(
              formData,
              "actionPlan",
            ) ||
            null,

          final_opinion:
            readText(
              formData,
              "finalOpinion",
            ) ||
            null,

          final_classification:
            normalizedClassification,

          analysis_status:
            analysisStatus,

          created_by:
            userId,

          updated_by:
            userId,
        },
        {
          onConflict:
            "diagnostic_id",
        },
      );

  if (error) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=nao-foi-possivel-salvar-analise",
      ),
    );
  }

  revalidateWorkspace(
    diagnosticId,
  );

  redirect(
    diagnosticPath(
      diagnosticId,
      "sucesso=analise-salva",
    ),
  );
}

/*
 * =========================================================
 * REVISÃO DE DOCUMENTOS
 * =========================================================
 */

export async function updateDocumentReview(
  formData: FormData,
) {
  const diagnosticId =
    readText(
      formData,
      "diagnosticId",
    );

  const documentId =
    readText(
      formData,
      "documentId",
    );

  const status =
    readText(
      formData,
      "status",
    );

  const reviewNote =
    readText(
      formData,
      "reviewNote",
    );

  if (
    !diagnosticId ||
    !documentId
  ) {
    redirect(
      "/torre?erro=documento-invalido",
    );
  }

  if (
    !allowedDocumentStatuses.includes(
      status,
    )
  ) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=status-documento-invalido",
      ),
    );
  }

  if (
    status ===
      "rejected" &&
    !reviewNote
  ) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=motivo-substituicao-obrigatorio",
      ),
    );
  }

  const {
    supabase,
    userId,
  } =
    await requireAdmin();

  const {
    data:
      document,
  } =
    await supabase
      .from(
        "diagnostic_documents",
      )
      .select(
        `
          id,
          file_name,
          diagnostic_id
        `,
      )
      .eq(
        "id",
        documentId,
      )
      .eq(
        "diagnostic_id",
        diagnosticId,
      )
      .maybeSingle();

  if (!document) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=documento-nao-encontrado",
      ),
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "diagnostic_documents",
      )
      .update({
        status,

        review_note:
          reviewNote ||
          null,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        documentId,
      );

  if (error) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=nao-foi-possivel-revisar-documento",
      ),
    );
  }

  if (
    status ===
    "rejected"
  ) {
    const {
      data:
        diagnostic,
    } =
      await supabase
        .from(
          "diagnostics",
        )
        .select(
          "status",
        )
        .eq(
          "id",
          diagnosticId,
        )
        .maybeSingle();

    await supabase
      .from(
        "diagnostic_messages",
      )
      .insert({
        diagnostic_id:
          diagnosticId,

        sender_user_id:
          userId,

        sender_role:
          "admin",

        body:
          `O arquivo "${document.file_name}" precisa ser substituído. Motivo: ${reviewNote}`,

        visible_to_client:
          true,
      });

    if (
      diagnostic &&
      diagnostic.status !==
        "client_action_required"
    ) {
      const {
        error:
          diagnosticUpdateError,
      } =
        await supabase
          .from(
            "diagnostics",
          )
          .update({
            status:
              "client_action_required",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            diagnosticId,
          );

      if (
        diagnosticUpdateError
      ) {
        console.error(
          "Erro ao colocar diagnóstico em ação do cliente:",
          diagnosticUpdateError,
        );

        redirect(
          diagnosticPath(
            diagnosticId,
            "erro=nao-foi-possivel-revisar-documento",
          ),
        );
      }

      /*
       * Se a análise estava pronta para
       * revisão e surgiu uma nova
       * pendência, ela volta a ser
       * rascunho.
       */
      const draftError =
        await setAnalysisDraft(
          supabase,
          diagnosticId,
          userId,
        );

      if (
        draftError
      ) {
        console.error(
          "Erro ao retornar análise para draft após rejeição de documento:",
          draftError,
        );
      }

      await registerStatusHistory(
        supabase,
        diagnosticId,
        diagnostic.status,
        "client_action_required",
        userId,
        `Solicitada a substituição do arquivo "${document.file_name}".`,
      );
    }
  }

  revalidateWorkspace(
    diagnosticId,
  );

  redirect(
    diagnosticPath(
      diagnosticId,
      "sucesso=documento-revisado",
    ),
  );
}

/*
 * =========================================================
 * MENSAGENS
 * =========================================================
 */

export async function sendMessage(
  formData: FormData,
) {
  const diagnosticId =
    readText(
      formData,
      "diagnosticId",
    );

  const body =
    readText(
      formData,
      "body",
    );

  const visibleToClient =
    formData.get(
      "visibleToClient",
    ) ===
    "on";

  const requiresAction =
    formData.get(
      "requiresAction",
    ) ===
    "on";

  if (
    !diagnosticId ||
    !body
  ) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=mensagem-obrigatoria",
      ),
    );
  }

  const {
    supabase,
    userId,
  } =
    await requireAdmin();

  const {
    data:
      diagnostic,
  } =
    await supabase
      .from(
        "diagnostics",
      )
      .select(
        "status",
      )
      .eq(
        "id",
        diagnosticId,
      )
      .maybeSingle();

  if (!diagnostic) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=diagnostico-nao-encontrado",
      ),
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "diagnostic_messages",
      )
      .insert({
        diagnostic_id:
          diagnosticId,

        sender_user_id:
          userId,

        sender_role:
          "admin",

        body,

        visible_to_client:
          visibleToClient,
      });

  if (error) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=nao-foi-possivel-enviar-mensagem",
      ),
    );
  }

  if (
    visibleToClient &&
    requiresAction &&
    diagnostic.status !==
      "client_action_required"
  ) {
    const {
      error:
        diagnosticUpdateError,
    } =
      await supabase
        .from(
          "diagnostics",
        )
        .update({
          status:
            "client_action_required",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          diagnosticId,
        );

    if (
      diagnosticUpdateError
    ) {
      console.error(
        "Erro ao solicitar ação do cliente:",
        diagnosticUpdateError,
      );

      redirect(
        diagnosticPath(
          diagnosticId,
          "erro=nao-foi-possivel-enviar-mensagem",
        ),
      );
    }

    /*
     * Uma nova pendência invalida o
     * estado ready_for_review.
     */
    const draftError =
      await setAnalysisDraft(
        supabase,
        diagnosticId,
        userId,
      );

    if (
      draftError
    ) {
      console.error(
        "Erro ao retornar análise para draft após solicitação ao cliente:",
        draftError,
      );
    }

    await registerStatusHistory(
      supabase,
      diagnosticId,
      diagnostic.status,
      "client_action_required",
      userId,
      "Foi solicitada uma ação complementar ao cliente.",
    );
  }

  revalidateWorkspace(
    diagnosticId,
  );

  redirect(
    diagnosticPath(
      diagnosticId,
      "sucesso=mensagem-enviada",
    ),
  );
}

/*
 * =========================================================
 * RETOMAR ANÁLISE
 * =========================================================
 */

export async function resumeAnalysis(
  formData: FormData,
) {
  const diagnosticId =
    readText(
      formData,
      "diagnosticId",
    );

  if (!diagnosticId) {
    redirect(
      "/torre?erro=diagnostico-invalido",
    );
  }

  const {
    supabase,
    userId,
  } =
    await requireAdmin();

  const {
    data:
      updatedDiagnostic,
    error,
  } =
    await supabase
      .from(
        "diagnostics",
      )
      .update({
        status:
          "under_review",

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        diagnosticId,
      )
      .eq(
        "status",
        "client_action_required",
      )
      .select("id")
      .maybeSingle();

  if (
    error ||
    !updatedDiagnostic
  ) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=nao-foi-possivel-retomar",
      ),
    );
  }

  /*
   * Regra de consistência:
   *
   * sempre que voltar para under_review,
   * a análise volta para draft.
   */
  const draftError =
    await setAnalysisDraft(
      supabase,
      diagnosticId,
      userId,
    );

  if (
    draftError
  ) {
    console.error(
      "Erro ao retornar analysis_status para draft:",
      draftError,
    );

    /*
     * Evita deixar o diagnóstico em um
     * estado inconsistente.
     */
    await supabase
      .from(
        "diagnostics",
      )
      .update({
        status:
          "client_action_required",

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        diagnosticId,
      );

    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=nao-foi-possivel-retomar",
      ),
    );
  }

  await registerStatusHistory(
    supabase,
    diagnosticId,
    "client_action_required",
    "under_review",
    userId,
    "Pendência atendida e análise retomada.",
  );

  revalidateWorkspace(
    diagnosticId,
  );

  redirect(
    analysisPath(
      diagnosticId,
      0,
      "sucesso=analise-retomada",
    ),
  );
}

/*
 * =========================================================
 * ENVIAR PARA REVISÃO FINAL
 * =========================================================
 */

export async function sendForApproval(
  formData: FormData,
) {
  const diagnosticId =
    readText(
      formData,
      "diagnosticId",
    );

  if (!diagnosticId) {
    redirect(
      "/torre?erro=diagnostico-invalido",
    );
  }

  const {
    supabase,
    userId,
  } =
    await requireAdmin();

  const [
    {
      data:
        diagnostic,
    },

    {
      data:
        analysis,
    },
  ] =
    await Promise.all([
      supabase
        .from(
          "diagnostics",
        )
        .select(
          "status",
        )
        .eq(
          "id",
          diagnosticId,
        )
        .maybeSingle(),

      supabase
        .from(
          "diagnostic_analysis",
        )
        .select(
          `
            final_classification,
            general_assessment,
            final_opinion,
            operations
          `,
        )
        .eq(
          "diagnostic_id",
          diagnosticId,
        )
        .maybeSingle(),
    ]);

  if (
    !diagnostic ||
    diagnostic.status !==
      "under_review"
  ) {
    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=status-nao-permite-revisao-final",
      ),
    );
  }

  const approvalOperations =
    asArray(
      analysis?.operations,
    ).map(
      asRecord,
    );

  if (
    !analysis?.final_classification ||
    !analysis.general_assessment ||
    !analysis.final_opinion ||
    approvalOperations.length ===
      0 ||
    approvalOperations.some(
      (
        operation,
      ) =>
        !isDetailedOperationComplete(
          operation,
        ),
    )
  ) {
    redirect(
      conclusionPath(
        diagnosticId,
        "erro=analise-incompleta",
      ),
    );
  }

  const now =
    new Date().toISOString();

  /*
   * Primeiro marca a análise como pronta
   * para revisão.
   *
   * Só depois altera o status principal.
   */
  const {
    error:
      analysisUpdateError,
  } =
    await supabase
      .from(
        "diagnostic_analysis",
      )
      .update({
        analysis_status:
          "ready_for_review",

        updated_by:
          userId,
      })
      .eq(
        "diagnostic_id",
        diagnosticId,
      );

  if (
    analysisUpdateError
  ) {
    console.error(
      "Erro ao preparar análise para revisão:",
      analysisUpdateError,
    );

    redirect(
      conclusionPath(
        diagnosticId,
        "erro=nao-foi-possivel-enviar-revisao",
      ),
    );
  }

  const {
    data:
      updatedDiagnostic,
    error:
      diagnosticUpdateError,
  } =
    await supabase
      .from(
        "diagnostics",
      )
      .update({
        status:
          "awaiting_approval",

        final_classification:
          analysis.final_classification,

        public_summary:
          analysis.general_assessment,

        updated_at:
          now,
      })
      .eq(
        "id",
        diagnosticId,
      )
      .eq(
        "status",
        "under_review",
      )
      .select("id")
      .maybeSingle();

  if (
    diagnosticUpdateError ||
    !updatedDiagnostic
  ) {
    /*
     * Se a mudança do diagnóstico falhar,
     * devolve a análise para draft.
     */
    await setAnalysisDraft(
      supabase,
      diagnosticId,
      userId,
    );

    console.error(
      "Erro ao mudar diagnóstico para awaiting_approval:",
      diagnosticUpdateError,
    );

    redirect(
      conclusionPath(
        diagnosticId,
        "erro=nao-foi-possivel-enviar-revisao",
      ),
    );
  }

  await registerStatusHistory(
    supabase,
    diagnosticId,
    "under_review",
    "awaiting_approval",
    userId,
    "Análise encaminhada para revisão final.",
  );

  revalidateWorkspace(
    diagnosticId,
  );

  redirect(
    diagnosticPath(
      diagnosticId,
      "sucesso=enviado-para-revisao",
    ),
  );
}

/*
 * =========================================================
 * VOLTAR DA REVISÃO FINAL
 * =========================================================
 */

export async function returnToAnalysis(
  formData: FormData,
) {
  const diagnosticId =
    readText(
      formData,
      "diagnosticId",
    );

  if (!diagnosticId) {
    redirect(
      "/torre?erro=diagnostico-invalido",
    );
  }

  const {
    supabase,
    userId,
  } =
    await requireAdmin();

  /*
   * Primeiro devolve a análise para
   * draft.
   */
  const draftError =
    await setAnalysisDraft(
      supabase,
      diagnosticId,
      userId,
    );

  if (
    draftError
  ) {
    console.error(
      "Erro ao devolver análise para draft:",
      draftError,
    );

    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=nao-foi-possivel-retornar-analise",
      ),
    );
  }

  const {
    data:
      updatedDiagnostic,
    error,
  } =
    await supabase
      .from(
        "diagnostics",
      )
      .update({
        status:
          "under_review",

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        diagnosticId,
      )
      .eq(
        "status",
        "awaiting_approval",
      )
      .select("id")
      .maybeSingle();

  if (
    error ||
    !updatedDiagnostic
  ) {
    /*
     * Se a mudança principal falhar,
     * restaura ready_for_review.
     */
    await supabase
      .from(
        "diagnostic_analysis",
      )
      .update({
        analysis_status:
          "ready_for_review",

        updated_by:
          userId,
      })
      .eq(
        "diagnostic_id",
        diagnosticId,
      );

    redirect(
      diagnosticPath(
        diagnosticId,
        "erro=nao-foi-possivel-retornar-analise",
      ),
    );
  }

  await registerStatusHistory(
    supabase,
    diagnosticId,
    "awaiting_approval",
    "under_review",
    userId,
    "Diagnóstico devolvido para ajustes na análise.",
  );

  revalidateWorkspace(
    diagnosticId,
  );

  redirect(
    analysisPath(
      diagnosticId,
      0,
      "sucesso=retornado-para-analise",
    ),
  );
}