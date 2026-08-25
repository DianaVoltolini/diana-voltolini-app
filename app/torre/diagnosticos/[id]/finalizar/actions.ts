// app/torre/diagnosticos/[id]/finalizar/actions.ts

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

const limitationText =
  "O diagnóstico possui natureza operacional e documental, limitado aos arquivos, operações e informações fornecidos pela empresa. Não substitui parecer jurídico, auditoria fiscal completa, responsabilidade técnica da contabilidade ou responsabilidade do fornecedor do ERP.";

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

function asRecord(
  value: unknown,
): JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
    ? value as JsonRecord
    : {};
}

function asString(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function finalizationPath(
  diagnosticId: string,
  parameter?: string,
) {
  const base =
    `/torre/diagnosticos/${diagnosticId}/finalizar`;

  return parameter
    ? `${base}?${parameter}`
    : base;
}

export async function finalizeDiagnostic(
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
      error:
        diagnosticError,
    },

    {
      data:
        analysis,
      error:
        analysisError,
    },

    {
      data:
        documents,
      error:
        documentsError,
    },
  ] =
    await Promise.all([
      supabase
        .from(
          "diagnostics",
        )
        .select(
          `
            id,
            code,
            status
          `,
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
            id,
            operations,
            general_assessment,
            strengths,
            risks,
            action_plan,
            final_opinion,
            final_classification,
            analysis_status
          `,
        )
        .eq(
          "diagnostic_id",
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
    ]);

  if (
    diagnosticError ||
    !diagnostic
  ) {
    redirect(
      finalizationPath(
        diagnosticId,
        "erro=diagnostico-nao-encontrado",
      ),
    );
  }

  /*
   * Regra definitiva:
   *
   * somente a Etapa 4 pode liberar
   * o resultado.
   */
  if (
    diagnostic.status !==
      "awaiting_approval"
  ) {
    redirect(
      finalizationPath(
        diagnosticId,
        "erro=status-invalido",
      ),
    );
  }

  if (
    analysisError ||
    !analysis
  ) {
    redirect(
      finalizationPath(
        diagnosticId,
        "erro=analise-nao-encontrada",
      ),
    );
  }

  if (
    documentsError
  ) {
    console.error(
      "Erro ao conferir XMLs antes da finalização:",
      documentsError,
    );

    redirect(
      finalizationPath(
        diagnosticId,
        "erro=analise-incompleta",
      ),
    );
  }

  if (
    analysis.analysis_status !==
      "ready_for_review"
  ) {
    redirect(
      finalizationPath(
        diagnosticId,
        "erro=analise-incompleta",
      ),
    );
  }

  if (
    !analysis.final_classification ||
    !analysis.general_assessment
      ?.trim() ||
    !analysis.final_opinion
      ?.trim()
  ) {
    redirect(
      finalizationPath(
        diagnosticId,
        "erro=analise-incompleta",
      ),
    );
  }

  const xmlDocuments =
    documents ?? [];

  const operations =
    Array.isArray(
      analysis.operations,
    )
      ? analysis.operations.map(
          asRecord,
        )
      : [];

  /*
   * Confere novamente se todos os XMLs
   * ativos possuem análise individual
   * concluída.
   *
   * Assim não dependemos apenas da tela.
   */
  if (
    xmlDocuments.length ===
    0
  ) {
    redirect(
      finalizationPath(
        diagnosticId,
        "erro=analise-incompleta",
      ),
    );
  }

  const allXmlsAnalyzed =
    xmlDocuments.every(
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

        if (!operation) {
          return false;
        }

        const result =
          asString(
            operation.result,
          );

        const technicalAnalysis =
          asString(
            operation.technical_analysis,
          );

        return (
          result.length > 0 &&
          result !==
            "pending" &&
          technicalAnalysis.length >
            0
        );
      },
    );

  if (
    !allXmlsAnalyzed
  ) {
    redirect(
      finalizationPath(
        diagnosticId,
        "erro=analise-incompleta",
      ),
    );
  }

  const resultPayload = {
    version:
      1,

    classification:
      analysis.final_classification,

    generalAssessment:
      analysis.general_assessment,

    strengths:
      analysis.strengths,

    risks:
      analysis.risks,

    actionPlan:
      analysis.action_plan,

    finalOpinion:
      analysis.final_opinion,

    operations,

    limitation:
      limitationText,
  };

  /*
   * Primeiro aprova a análise.
   *
   * Se a conclusão do diagnóstico
   * falhar, voltamos para
   * ready_for_review.
   */
  const {
    error:
      approveAnalysisError,
  } =
    await supabase
      .from(
        "diagnostic_analysis",
      )
      .update({
        analysis_status:
          "approved",

        updated_by:
          userId,
      })
      .eq(
        "diagnostic_id",
        diagnosticId,
      )
      .eq(
        "analysis_status",
        "ready_for_review",
      );

  if (
    approveAnalysisError
  ) {
    console.error(
      "Erro ao aprovar análise:",
      approveAnalysisError,
    );

    redirect(
      finalizationPath(
        diagnosticId,
        "erro=nao-foi-possivel-aprovar",
      ),
    );
  }

  const now =
    new Date().toISOString();

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
          "completed",

        final_classification:
          analysis.final_classification,

        public_summary:
          JSON.stringify(
            resultPayload,
          ),

        completed_at:
          now,

        released_at:
          now,

        updated_at:
          now,
      })
      .eq(
        "id",
        diagnosticId,
      )
      .eq(
        "status",
        "awaiting_approval",
      )
      .select(
        "id",
      )
      .maybeSingle();

  if (
    diagnosticUpdateError ||
    !updatedDiagnostic
  ) {
    /*
     * Restaura a etapa de revisão
     * caso a atualização principal
     * não seja concluída.
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

    console.error(
      "Erro ao concluir diagnóstico:",
      diagnosticUpdateError,
    );

    redirect(
      finalizationPath(
        diagnosticId,
        "erro=nao-foi-possivel-finalizar",
      ),
    );
  }

  /*
   * O trigger automático não registra
   * mudanças administrativas.
   * Por isso mantemos o histórico
   * descritivo da Torre.
   */
  const {
    error:
      historyError,
  } =
    await supabase
      .from(
        "diagnostic_status_history",
      )
      .insert({
        diagnostic_id:
          diagnosticId,

        old_status:
          "awaiting_approval",

        new_status:
          "completed",

        changed_by:
          userId,

        note:
          "Diagnóstico finalizado e resultado liberado ao cliente.",
      });

  if (
    historyError
  ) {
    console.error(
      "Erro ao registrar histórico:",
      historyError,
    );
  }

  /*
   * Registra aviso na área do cliente.
   */
  const {
    error:
      messageError,
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

        body:
          "O Diagnóstico Expresso IBS/CBS foi concluído. O resultado completo já está disponível na área do cliente.",

        visible_to_client:
          true,
      });

  if (
    messageError
  ) {
    console.error(
      "Erro ao registrar mensagem de conclusão:",
      messageError,
    );
  }

  revalidatePath(
    "/torre",
  );

  revalidatePath(
    `/torre/diagnosticos/${diagnosticId}`,
  );

  revalidatePath(
    `/torre/diagnosticos/${diagnosticId}/finalizar`,
  );

  redirect(
    `/torre/diagnosticos/${diagnosticId}`,
  );
}