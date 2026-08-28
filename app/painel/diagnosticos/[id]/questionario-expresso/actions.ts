// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\painel\diagnosticos\[id]\questionario-expresso\actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type JsonRecord = Record<string, unknown>;

type StepName =
  | "empresa"
  | "preparacao"
  | "orientacao"
  | "revisao";

function asRecord(
  value: unknown,
): JsonRecord {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asRecordArray(
  value: unknown,
): JsonRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) =>
    asRecord(item),
  );
}

function readText(
  formData: FormData,
  fieldName: string,
) {
  return String(
    formData.get(fieldName) ?? "",
  ).trim();
}

function readRecordText(
  record: JsonRecord,
  fieldName: string,
) {
  const value =
    record[fieldName];

  return typeof value === "string"
    ? value.trim()
    : "";
}

function createStepPath(
  diagnosticId: string,
  step: StepName,
  parameter?: string,
) {
  const path =
    `/painel/diagnosticos/${diagnosticId}/questionario-expresso/${step}`;

  return parameter
    ? `${path}?${parameter}`
    : path;
}

function revalidateExpressPaths(
  diagnosticId: string,
) {
  const basePath =
    `/painel/diagnosticos/${diagnosticId}`;

  const questionnaireBasePath =
    `${basePath}/questionario-expresso`;

  revalidatePath("/painel");

  revalidatePath(
    basePath,
  );

  revalidatePath(
    questionnaireBasePath,
    "layout",
  );

  revalidatePath(
    `${questionnaireBasePath}/empresa`,
  );

  revalidatePath(
    `${questionnaireBasePath}/preparacao`,
  );

  revalidatePath(
    `${questionnaireBasePath}/documentos`,
  );

  revalidatePath(
    `${questionnaireBasePath}/orientacao`,
  );

  revalidatePath(
    `${questionnaireBasePath}/revisao`,
  );
}

async function getDiagnosticContext(
  diagnosticId: string,
) {
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
        company_id,
        user_id,
        document_limit
      `,
    )
    .eq("id", diagnosticId)
    .eq("user_id", userId)
    .maybeSingle();

  if (
    diagnosticError ||
    !diagnostic
  ) {
    redirect("/painel");
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

  return {
    supabase,
    userId,
    diagnostic,
  };
}

async function getQuestionnaireData(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  diagnosticId: string,
) {
  const {
    data: questionnaire,
    error,
  } = await supabase
    .from(
      "diagnostic_questionnaires",
    )
    .select(
      `
        id,
        answers,
        submitted_at
      `,
    )
    .eq(
      "diagnostic_id",
      diagnosticId,
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    questionnaireId:
      questionnaire?.id ?? null,

    answers:
      asRecord(
        questionnaire?.answers,
      ),

    submittedAt:
      questionnaire?.submitted_at ??
      null,
  };
}

async function persistQuestionnaireAnswers(
  diagnosticId: string,
  questionnaireId: string | null,
  answers: JsonRecord,
) {
  /*
   * A edição em awaiting_documents ocorre depois que o
   * questionário já recebeu submitted_at. Nessa fase, as
   * políticas RLS do cliente podem impedir UPDATE mesmo
   * quando a action já validou que o diagnóstico pertence
   * ao usuário autenticado.
   *
   * Por isso a persistência é feita com o cliente admin
   * SOMENTE depois da validação de propriedade realizada
   * em getDiagnosticContext().
   */
  const admin =
    getSupabaseAdmin();

  const now =
    new Date().toISOString();

  if (questionnaireId) {
    const {
      data,
      error,
    } = await admin
      .from(
        "diagnostic_questionnaires",
      )
      .update({
        answers,
        updated_at: now,
      })
      .eq(
        "id",
        questionnaireId,
      )
      .eq(
        "diagnostic_id",
        diagnosticId,
      )
      .select("id")
      .maybeSingle();

    if (error) {
      return {
        error,
      };
    }

    if (!data) {
      return {
        error:
          new Error(
            "O questionário não foi atualizado.",
          ),
      };
    }

    return {
      error: null,
    };
  }

  const {
    data,
    error,
  } = await admin
    .from(
      "diagnostic_questionnaires",
    )
    .insert({
      diagnostic_id:
        diagnosticId,

      answers,

      updated_at:
        now,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      error,
    };
  }

  if (!data) {
    return {
      error:
        new Error(
          "O questionário não foi criado.",
        ),
    };
  }

  return {
    error: null,
  };
}

export async function saveCompanyStep(
  formData: FormData,
) {
  const diagnosticId =
    readText(
      formData,
      "diagnosticId",
    );

  const legalName =
    readText(
      formData,
      "legalName",
    );

  const cnpj =
    readText(
      formData,
      "cnpj",
    );

  const city =
    readText(
      formData,
      "city",
    );

  const state =
    readText(
      formData,
      "state",
    ).toUpperCase();

  const mainActivity =
    readText(
      formData,
      "mainActivity",
    );

  const taxRegime =
    readText(
      formData,
      "taxRegime",
    );

  const contactName =
    readText(
      formData,
      "contactName",
    );

  const contactValue =
    readText(
      formData,
      "contactValue",
    );

  const businessContext =
    readText(
      formData,
      "businessContext",
    );

  if (!diagnosticId) {
    redirect("/painel");
  }

  if (
    !legalName ||
    !cnpj ||
    !city ||
    state.length !== 2 ||
    !mainActivity ||
    !taxRegime ||
    !contactName ||
    !contactValue ||
    !businessContext
  ) {
    redirect(
      createStepPath(
        diagnosticId,
        "empresa",
        "erro=campos-obrigatorios",
      ),
    );
  }

  const {
    supabase,
    diagnostic,
  } =
    await getDiagnosticContext(
      diagnosticId,
    );

  let questionnaireData;

  try {
    questionnaireData =
      await getQuestionnaireData(
        supabase,
        diagnosticId,
      );
  } catch (error) {
    console.error(
      "Erro ao carregar o questionário expresso:",
      error,
    );

    redirect(
      createStepPath(
        diagnosticId,
        "empresa",
        "erro=nao-foi-possivel-carregar",
      ),
    );
  }

  const currentAnswers =
    questionnaireData.answers;

  const currentExpress =
    asRecord(
      currentAnswers.express,
    );

  const nextAnswers: JsonRecord = {
    ...currentAnswers,

    express: {
      ...currentExpress,

      version:
        "express-v1",

      company: {
        legalName,
        cnpj,
        city,
        state,
        mainActivity,
        taxRegime,
        contactName,
        contactValue,
        businessContext,
      },
    },
  };

  const admin =
    getSupabaseAdmin();

  const {
    error: companyError,
  } = await admin
    .from("companies")
    .update({
      legal_name:
        legalName,

      cnpj,

      city,

      state,

      main_activity:
        mainActivity,

      tax_regime:
        taxRegime,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      diagnostic.company_id,
    );

  if (companyError) {
    console.error(
      "Erro ao atualizar os dados da empresa:",
      companyError,
    );

    redirect(
      createStepPath(
        diagnosticId,
        "empresa",
        "erro=nao-foi-possivel-salvar",
      ),
    );
  }

  const {
    error: questionnaireError,
  } =
    await persistQuestionnaireAnswers(
      diagnosticId,
      questionnaireData.questionnaireId,
      nextAnswers,
    );

  if (questionnaireError) {
    console.error(
      "Erro ao salvar a etapa Empresa:",
      questionnaireError,
    );

    redirect(
      createStepPath(
        diagnosticId,
        "empresa",
        "erro=nao-foi-possivel-salvar",
      ),
    );
  }

  revalidateExpressPaths(
    diagnosticId,
  );

  redirect(
    createStepPath(
      diagnosticId,
      "preparacao",
    ),
  );
}

export async function savePreparationStep(
  formData: FormData,
) {
  const diagnosticId =
    readText(
      formData,
      "diagnosticId",
    );

  const erpName =
    readText(
      formData,
      "erpName",
    );

  const erpVersion =
    readText(
      formData,
      "erpVersion",
    );

  const ibsCbsConfiguration =
    readText(
      formData,
      "ibsCbsConfiguration",
    );

  const accountingGuidance =
    readText(
      formData,
      "accountingGuidance",
    );

  const preparationNotes =
    readText(
      formData,
      "preparationNotes",
    );

  if (!diagnosticId) {
    redirect("/painel");
  }

  if (
    !erpName ||
    !ibsCbsConfiguration ||
    !accountingGuidance
  ) {
    redirect(
      createStepPath(
        diagnosticId,
        "preparacao",
        "erro=campos-obrigatorios",
      ),
    );
  }

  const {
    supabase,
    diagnostic,
  } =
    await getDiagnosticContext(
      diagnosticId,
    );

  let questionnaireData;

  try {
    questionnaireData =
      await getQuestionnaireData(
        supabase,
        diagnosticId,
      );
  } catch (error) {
    console.error(
      "Erro ao carregar o questionário expresso:",
      error,
    );

    redirect(
      createStepPath(
        diagnosticId,
        "preparacao",
        "erro=nao-foi-possivel-carregar",
      ),
    );
  }

  const currentAnswers =
    questionnaireData.answers;

  const currentExpress =
    asRecord(
      currentAnswers.express,
    );

  const nextAnswers: JsonRecord = {
    ...currentAnswers,

    express: {
      ...currentExpress,

      version:
        "express-v1",

      preparation: {
        erpName,
        erpVersion,
        ibsCbsConfiguration,
        accountingGuidance,
        preparationNotes,
      },
    },
  };

  const admin =
    getSupabaseAdmin();

  const {
    error: companyError,
  } = await admin
    .from("companies")
    .update({
      erp_name:
        erpName,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      diagnostic.company_id,
    );

  if (companyError) {
    console.error(
      "Erro ao atualizar o ERP da empresa:",
      companyError,
    );

    redirect(
      createStepPath(
        diagnosticId,
        "preparacao",
        "erro=nao-foi-possivel-salvar",
      ),
    );
  }

  const {
    error: questionnaireError,
  } =
    await persistQuestionnaireAnswers(
      diagnosticId,
      questionnaireData.questionnaireId,
      nextAnswers,
    );

  if (questionnaireError) {
    console.error(
      "Erro ao salvar a etapa Preparação:",
      questionnaireError,
    );

    redirect(
      createStepPath(
        diagnosticId,
        "preparacao",
        "erro=nao-foi-possivel-salvar",
      ),
    );
  }

  revalidateExpressPaths(
    diagnosticId,
  );

  redirect(
    `/painel/diagnosticos/${diagnosticId}/questionario-expresso/documentos`,
  );
}

export async function saveGuidanceStep(
  formData: FormData,
) {
  const diagnosticId =
    readText(
      formData,
      "diagnosticId",
    );

  const mainQuestion =
    readText(
      formData,
      "mainQuestion",
    );

  const practicalDecision =
    readText(
      formData,
      "practicalDecision",
    );

  const additionalInformation =
    readText(
      formData,
      "additionalInformation",
    );

  const informationConfirmation =
    formData.get(
      "informationConfirmation",
    ) === "on";

  if (!diagnosticId) {
    redirect("/painel");
  }

  if (
    !informationConfirmation
  ) {
    redirect(
      createStepPath(
        diagnosticId,
        "orientacao",
        "erro=confirmacao-obrigatoria",
      ),
    );
  }

  const {
    supabase,
  } =
    await getDiagnosticContext(
      diagnosticId,
    );

  let questionnaireData;

  try {
    questionnaireData =
      await getQuestionnaireData(
        supabase,
        diagnosticId,
      );
  } catch (error) {
    console.error(
      "Erro ao carregar o questionário expresso:",
      error,
    );

    redirect(
      createStepPath(
        diagnosticId,
        "orientacao",
        "erro=nao-foi-possivel-carregar",
      ),
    );
  }

  const currentAnswers =
    questionnaireData.answers;

  const currentExpress =
    asRecord(
      currentAnswers.express,
    );

  const nextAnswers: JsonRecord = {
    ...currentAnswers,

    express: {
      ...currentExpress,

      version:
        "express-v1",

      guidance: {
        mainQuestion,
        practicalDecision,
        additionalInformation,

        informationConfirmation:
          true,

        completed:
          true,
      },
    },
  };

  const {
    error: questionnaireError,
  } =
    await persistQuestionnaireAnswers(
      diagnosticId,
      questionnaireData.questionnaireId,
      nextAnswers,
    );

  if (questionnaireError) {
    console.error(
      "Erro ao salvar a etapa Dúvidas e orientação:",
      questionnaireError,
    );

    redirect(
      createStepPath(
        diagnosticId,
        "orientacao",
        "erro=nao-foi-possivel-salvar",
      ),
    );
  }

  revalidateExpressPaths(
    diagnosticId,
  );

  redirect(
    createStepPath(
      diagnosticId,
      "revisao",
    ),
  );
}

export async function submitExpressQuestionnaire(
  formData: FormData,
) {
  const diagnosticId =
    readText(
      formData,
      "diagnosticId",
    );

  const confirmSubmission =
    formData.get(
      "confirmSubmission",
    ) === "on";

  if (!diagnosticId) {
    redirect("/painel");
  }

  if (
    !confirmSubmission
  ) {
    redirect(
      createStepPath(
        diagnosticId,
        "revisao",
        "erro=confirmacao-obrigatoria",
      ),
    );
  }

  const {
    supabase,
    diagnostic,
  } =
    await getDiagnosticContext(
      diagnosticId,
    );

  let questionnaireData;

  try {
    questionnaireData =
      await getQuestionnaireData(
        supabase,
        diagnosticId,
      );
  } catch (error) {
    console.error(
      "Erro ao carregar o questionário para envio:",
      error,
    );

    redirect(
      createStepPath(
        diagnosticId,
        "revisao",
        "erro=nao-foi-possivel-carregar",
      ),
    );
  }

  if (
    questionnaireData.submittedAt
  ) {
    redirect(
      `/painel/diagnosticos/${diagnosticId}`,
    );
  }

  const express =
    asRecord(
      questionnaireData.answers
        .express,
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

  const documentContexts =
    asRecordArray(
      express.documents,
    );

  const companyComplete =
    Boolean(
      readRecordText(
        company,
        "legalName",
      ) &&
        readRecordText(
          company,
          "cnpj",
        ) &&
        readRecordText(
          company,
          "city",
        ) &&
        readRecordText(
          company,
          "state",
        ) &&
        readRecordText(
          company,
          "mainActivity",
        ) &&
        readRecordText(
          company,
          "taxRegime",
        ) &&
        readRecordText(
          company,
          "contactName",
        ) &&
        readRecordText(
          company,
          "contactValue",
        ) &&
        readRecordText(
          company,
          "businessContext",
        ),
    );

  if (!companyComplete) {
    redirect(
      createStepPath(
        diagnosticId,
        "empresa",
        "erro=campos-obrigatorios",
      ),
    );
  }

  const preparationComplete =
    Boolean(
      readRecordText(
        preparation,
        "erpName",
      ) &&
        readRecordText(
          preparation,
          "ibsCbsConfiguration",
        ) &&
        readRecordText(
          preparation,
          "accountingGuidance",
        ),
    );

  if (!preparationComplete) {
    redirect(
      createStepPath(
        diagnosticId,
        "preparacao",
        "erro=campos-obrigatorios",
      ),
    );
  }

  if (
    guidance.completed !== true ||
    guidance.informationConfirmation !==
      true
  ) {
    redirect(
      createStepPath(
        diagnosticId,
        "orientacao",
        "erro=etapa-incompleta",
      ),
    );
  }

  const {
    data: documents,
    error: documentsError,
  } = await supabase
    .from(
      "diagnostic_documents",
    )
    .select(
      `
        id,
        file_name,
        status
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
    );

  if (documentsError) {
    console.error(
      "Erro ao validar os XMLs enviados:",
      documentsError,
    );

    redirect(
      createStepPath(
        diagnosticId,
        "revisao",
        "erro=nao-foi-possivel-validar-documentos",
      ),
    );
  }

  if (
    !documents ||
    documents.length === 0
  ) {
    redirect(
      `/painel/diagnosticos/${diagnosticId}/questionario-expresso/documentos?erro=adicione-xml`,
    );
  }

  if (
    documents.length >
    diagnostic.document_limit
  ) {
    redirect(
      createStepPath(
        diagnosticId,
        "revisao",
        "erro=limite-documentos",
      ),
    );
  }

  const contextIds =
    new Set(
      documentContexts
        .map((item) =>
          readRecordText(
            item,
            "documentId",
          ),
        )
        .filter(
          (value) =>
            value.length > 0,
        ),
    );

  const hasDocumentWithoutContext =
    documents.some(
      (document) =>
        !contextIds.has(
          document.id,
        ),
    );

  if (
    hasDocumentWithoutContext
  ) {
    redirect(
      createStepPath(
        diagnosticId,
        "revisao",
        "erro=contexto-documento-incompleto",
      ),
    );
  }

  /*
   * Finalização única do Diagnóstico Expresso.
   *
   * Neste ponto o cliente já revisou todas as
   * etapas e confirmou expressamente o envio.
   * Primeiro concluímos o questionário:
   *
   * awaiting_questionnaire
   *          ↓
   * awaiting_documents
   */
  const {
    error:
      questionnaireSubmitError,
  } = await supabase.rpc(
    "submit_diagnostic_questionnaire",
    {
      requested_diagnostic_id:
        diagnosticId,
    },
  );

  if (
    questionnaireSubmitError
  ) {
    console.error(
      "Erro ao concluir o questionário expresso:",
      questionnaireSubmitError,
    );

    redirect(
      createStepPath(
        diagnosticId,
        "revisao",
        "erro=nao-foi-possivel-enviar",
      ),
    );
  }

  /*
   * Em seguida confirmamos definitivamente os
   * XMLs já enviados:
   *
   * awaiting_documents
   *          ↓
   * documents_received
   *
   * A partir daqui o cliente não pode adicionar,
   * substituir ou excluir XMLs por conta própria.
   * Se a análise exigir complemento, a equipe poderá
   * solicitar uma nova ação ao cliente.
   */
  const {
    error:
      documentsSubmitError,
  } = await supabase.rpc(
    "submit_diagnostic_documents",
    {
      requested_diagnostic_id:
        diagnosticId,
    },
  );

  if (
    documentsSubmitError
  ) {
    console.error(
      "Questionário concluído, mas não foi possível finalizar os documentos:",
      documentsSubmitError,
    );

    revalidateExpressPaths(
      diagnosticId,
    );

    revalidatePath(
      `/painel/diagnosticos/${diagnosticId}/documentos`,
    );

    redirect(
      `/painel/diagnosticos/${diagnosticId}`,
    );
  }

  revalidateExpressPaths(
    diagnosticId,
  );

  revalidatePath(
    `/painel/diagnosticos/${diagnosticId}/documentos`,
  );

  redirect(
    `/painel/diagnosticos/${diagnosticId}`,
  );
}

export async function finalizePendingExpressDocuments(
  formData: FormData,
) {
  const diagnosticId =
    readText(
      formData,
      "diagnosticId",
    );

  const confirmSubmission =
    formData.get(
      "confirmSubmission",
    ) === "on";

  if (!diagnosticId) {
    redirect("/painel");
  }

  if (!confirmSubmission) {
    redirect(
      createStepPath(
        diagnosticId,
        "revisao",
        "erro=confirmacao-obrigatoria",
      ),
    );
  }

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
        user_id
      `,
    )
    .eq(
      "id",
      diagnosticId,
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
    redirect("/painel");
  }

  if (
    diagnostic.status !==
    "awaiting_documents"
  ) {
    redirect(
      `/painel/diagnosticos/${diagnostic.id}`,
    );
  }

  const {
    error,
  } = await supabase.rpc(
    "submit_diagnostic_documents",
    {
      requested_diagnostic_id:
        diagnosticId,
    },
  );

  if (error) {
    console.error(
      "Erro ao finalizar documentos pendentes:",
      error,
    );

    redirect(
      createStepPath(
        diagnosticId,
        "revisao",
        "erro=nao-foi-possivel-enviar",
      ),
    );
  }

  revalidateExpressPaths(
    diagnosticId,
  );

  revalidatePath(
    `/painel/diagnosticos/${diagnosticId}/documentos`,
  );

  redirect(
    `/painel/diagnosticos/${diagnosticId}`,
  );
}