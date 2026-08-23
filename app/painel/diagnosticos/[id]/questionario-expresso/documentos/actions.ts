// app/painel/diagnosticos/[id]/questionario-expresso/documentos/actions.ts

"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type JsonRecord =
  Record<string, unknown>;

export type RegisterExpressDocumentInput = {
  diagnosticId: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  operationType: string;
  whySelected: string;
  ibsCbsTested: string;
  importantNotes: string;
  hasRejection: boolean;
  rejectionDescription: string;
};

type RemoveExpressDocumentInput = {
  diagnosticId: string;
  documentId: string;
};

type ActionResult = {
  ok: boolean;
  error?: string;
  documentId?: string;
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

function asDocumentArray(
  value: unknown,
): JsonRecord[] {
  return Array.isArray(value)
    ? value.map(asRecord)
    : [];
}

async function getContext(
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
    return {
      supabase,
      userId: null,
      diagnostic: null,
    };
  }

  const {
    data: diagnostic,
    error,
  } = await supabase
    .from("diagnostics")
    .select(
      `
        id,
        status,
        user_id,
        document_limit
      `,
    )
    .eq("id", diagnosticId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao carregar diagnóstico:",
      error,
    );
  }

  return {
    supabase,
    userId,
    diagnostic,
  };
}

async function getQuestionnaire(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  diagnosticId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from("diagnostic_questionnaires")
    .select("id, answers")
    .eq(
      "diagnostic_id",
      diagnosticId,
    )
    .maybeSingle();

  return {
    data,
    error,
  };
}

async function saveAnswers(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  diagnosticId: string,
  questionnaireId: string | null,
  answers: JsonRecord,
) {
  const updatedAt =
    new Date().toISOString();

  if (questionnaireId) {
    return supabase
      .from("diagnostic_questionnaires")
      .update({
        answers,
        updated_at: updatedAt,
      })
      .eq("id", questionnaireId)
      .eq(
        "diagnostic_id",
        diagnosticId,
      );
  }

  return supabase
    .from("diagnostic_questionnaires")
    .insert({
      diagnostic_id:
        diagnosticId,
      answers,
      updated_at:
        updatedAt,
    });
}

function revalidateExpressPaths(
  diagnosticId: string,
) {
  revalidatePath(
    `/painel/diagnosticos/${diagnosticId}`,
  );

  revalidatePath(
    `/painel/diagnosticos/${diagnosticId}/questionario-expresso`,
    "layout",
  );

  revalidatePath(
    `/painel/diagnosticos/${diagnosticId}/questionario-expresso/documentos`,
  );
}

export async function registerExpressDocument(
  input: RegisterExpressDocumentInput,
): Promise<ActionResult> {
  if (
    !input.diagnosticId ||
    !input.fileName ||
    !input.storagePath ||
    !input.operationType ||
    !input.whySelected ||
    !input.ibsCbsTested
  ) {
    return {
      ok: false,
      error:
        "Preencha os campos obrigatórios e selecione o XML.",
    };
  }

  if (
    input.hasRejection &&
    !input.rejectionDescription.trim()
  ) {
    return {
      ok: false,
      error:
        "Informe o erro ou a rejeição apresentada.",
    };
  }

  if (
    !input.fileName
      .toLowerCase()
      .endsWith(".xml")
  ) {
    return {
      ok: false,
      error:
        "O arquivo principal deve estar no formato XML.",
    };
  }

  if (
    input.sizeBytes <= 0 ||
    input.sizeBytes >
      15 * 1024 * 1024
  ) {
    return {
      ok: false,
      error:
        "O arquivo deve possuir no máximo 15 MB.",
    };
  }

  const {
    supabase,
    userId,
    diagnostic,
  } =
    await getContext(
      input.diagnosticId,
    );

  if (!userId) {
    return {
      ok: false,
      error:
        "Sua sessão expirou. Entre novamente.",
    };
  }

  if (!diagnostic) {
    return {
      ok: false,
      error:
        "O diagnóstico não foi encontrado.",
    };
  }

  if (
    diagnostic.status !==
    "awaiting_questionnaire"
  ) {
    return {
      ok: false,
      error:
        "O formulário não está disponível para edição.",
    };
  }

  const { count } =
    await supabase
      .from("diagnostic_documents")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "diagnostic_id",
        input.diagnosticId,
      )
      .eq("category", "xml")
      .eq(
        "counts_toward_limit",
        true,
      )
      .neq("status", "rejected");

  const documentLimit =
    Number(
      diagnostic.document_limit ??
        5,
    );

  if (
    (count ?? 0) >=
    documentLimit
  ) {
    return {
      ok: false,
      error:
        "O limite de XMLs do diagnóstico já foi atingido.",
    };
  }

  const {
    data: insertedDocument,
    error: insertError,
  } = await supabase
    .from("diagnostic_documents")
    .insert({
      diagnostic_id:
        input.diagnosticId,

      uploaded_by:
        userId,

      category:
        "xml",

      file_name:
        input.fileName,

      storage_path:
        input.storagePath,

      mime_type:
        input.mimeType ||
        "application/xml",

      size_bytes:
        input.sizeBytes,

      counts_toward_limit:
        true,

      status:
        "uploaded",
    })
    .select("id, created_at")
    .single();

  if (
    insertError ||
    !insertedDocument
  ) {
    console.error(
      "Erro ao registrar XML:",
      insertError,
    );

    return {
      ok: false,
      error:
        "Não foi possível registrar o XML.",
    };
  }

  const {
    data: questionnaire,
    error: questionnaireError,
  } =
    await getQuestionnaire(
      supabase,
      input.diagnosticId,
    );

  if (questionnaireError) {
    await supabase
      .from("diagnostic_documents")
      .delete()
      .eq(
        "id",
        insertedDocument.id,
      );

    return {
      ok: false,
      error:
        "Não foi possível carregar o questionário.",
    };
  }

  const currentAnswers =
    asRecord(
      questionnaire?.answers,
    );

  const currentExpress =
    asRecord(
      currentAnswers.express,
    );

  const currentDocuments =
    asDocumentArray(
      currentExpress.documents,
    );

  const nextDocuments = [
    ...currentDocuments,

    {
      documentId:
        insertedDocument.id,

      fileName:
        input.fileName,

      operationType:
        input.operationType,

      whySelected:
        input.whySelected,

      ibsCbsTested:
        input.ibsCbsTested,

      importantNotes:
        input.importantNotes,

      hasRejection:
        input.hasRejection,

      rejectionDescription:
        input.rejectionDescription,

      createdAt:
        insertedDocument.created_at,
    },
  ];

  const nextAnswers: JsonRecord = {
    ...currentAnswers,

    express: {
      ...currentExpress,

      version:
        "express-v1",

      documents:
        nextDocuments,
    },
  };

  const {
    error: saveError,
  } = await saveAnswers(
    supabase,
    input.diagnosticId,
    questionnaire?.id ?? null,
    nextAnswers,
  );

  if (saveError) {
    console.error(
      "Erro ao vincular XML ao questionário:",
      saveError,
    );

    await supabase
      .from("diagnostic_documents")
      .delete()
      .eq(
        "id",
        insertedDocument.id,
      );

    return {
      ok: false,
      error:
        "O arquivo foi enviado, mas não foi possível salvar as informações da operação.",
    };
  }

  revalidateExpressPaths(
    input.diagnosticId,
  );

  return {
    ok: true,
    documentId:
      insertedDocument.id,
  };
}

export async function removeExpressDocument(
  input: RemoveExpressDocumentInput,
): Promise<ActionResult> {
  const {
    supabase,
    userId,
    diagnostic,
  } =
    await getContext(
      input.diagnosticId,
    );

  if (!userId) {
    return {
      ok: false,
      error:
        "Sua sessão expirou. Entre novamente.",
    };
  }

  if (
    !diagnostic ||
    diagnostic.status !==
      "awaiting_questionnaire"
  ) {
    return {
      ok: false,
      error:
        "O XML não pode ser excluído nesta etapa.",
    };
  }

  const {
    data: document,
    error: documentError,
  } = await supabase
    .from("diagnostic_documents")
    .select(
      `
        id,
        storage_path
      `,
    )
    .eq(
      "id",
      input.documentId,
    )
    .eq(
      "diagnostic_id",
      input.diagnosticId,
    )
    .eq("category", "xml")
    .maybeSingle();

  if (
    documentError ||
    !document
  ) {
    return {
      ok: false,
      error:
        "O XML não foi encontrado.",
    };
  }

  const {
    error: storageError,
  } = await supabase.storage
    .from("diagnostic-documents")
    .remove([
      document.storage_path,
    ]);

  if (storageError) {
    return {
      ok: false,
      error:
        "Não foi possível excluir o arquivo armazenado.",
    };
  }

  const {
    error: deleteError,
  } = await supabase
    .from("diagnostic_documents")
    .delete()
    .eq(
      "id",
      document.id,
    );

  if (deleteError) {
    return {
      ok: false,
      error:
        "O arquivo foi removido, mas o registro não pôde ser excluído.",
    };
  }

  const {
    data: questionnaire,
  } =
    await getQuestionnaire(
      supabase,
      input.diagnosticId,
    );

  if (questionnaire) {
    const currentAnswers =
      asRecord(
        questionnaire.answers,
      );

    const currentExpress =
      asRecord(
        currentAnswers.express,
      );

    const currentDocuments =
      asDocumentArray(
        currentExpress.documents,
      );

    const nextDocuments =
      currentDocuments.filter(
        (item) =>
          item.documentId !==
          input.documentId,
      );

    const nextAnswers: JsonRecord = {
      ...currentAnswers,

      express: {
        ...currentExpress,

        documents:
          nextDocuments,
      },
    };

    const {
      error: questionnaireUpdateError,
    } = await saveAnswers(
      supabase,
      input.diagnosticId,
      questionnaire.id,
      nextAnswers,
    );

    if (
      questionnaireUpdateError
    ) {
      console.error(
        "Erro ao remover vínculo do XML:",
        questionnaireUpdateError,
      );
    }
  }

  revalidateExpressPaths(
    input.diagnosticId,
  );

  return {
    ok: true,
  };
}