// app/painel/diagnosticos/[id]/documentos/actions.ts

"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type DocumentCategory =
  | "xml"
  | "danfe"
  | "erp_evidence"
  | "accounting_guidance"
  | "parameterization"
  | "rejection_evidence"
  | "procedure"
  | "other";

type ActionResult = {
  ok: boolean;
  error?: string;
};

type RegisterDocumentInput = {
  diagnosticId: string;
  category: DocumentCategory;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  countsTowardLimit: boolean;
};

type RemoveDocumentInput = {
  diagnosticId: string;
  documentId: string;
};

const allowedStatuses = [
  "awaiting_documents",
  "client_action_required",
];

const allowedCategories: DocumentCategory[] = [
  "xml",
  "danfe",
  "erp_evidence",
  "accounting_guidance",
  "parameterization",
  "rejection_evidence",
  "procedure",
  "other",
];

async function getAuthenticatedUserId() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId =
    typeof claimsData?.claims?.sub === "string"
      ? claimsData.claims.sub
      : null;

  return {
    supabase,
    userId,
  };
}

export async function registerUploadedDocument(
  input: RegisterDocumentInput,
): Promise<ActionResult> {
  if (
    !input.diagnosticId ||
    !input.fileName ||
    !input.storagePath
  ) {
    return {
      ok: false,
      error:
        "As informações do arquivo estão incompletas.",
    };
  }

  if (
    !allowedCategories.includes(
      input.category,
    )
  ) {
    return {
      ok: false,
      error:
        "A categoria escolhida é inválida.",
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
  } = await getAuthenticatedUserId();

  if (!userId) {
    return {
      ok: false,
      error:
        "Sua sessão expirou. Entre novamente.",
    };
  }

  const {
    data: diagnostic,
    error: diagnosticError,
  } = await supabase
    .from("diagnostics")
    .select(
      "id, status, user_id, document_limit",
    )
    .eq("id", input.diagnosticId)
    .eq("user_id", userId)
    .maybeSingle();

  if (
    diagnosticError ||
    !diagnostic
  ) {
    return {
      ok: false,
      error:
        "O diagnóstico não foi encontrado.",
    };
  }

  if (
    !allowedStatuses.includes(
      diagnostic.status,
    )
  ) {
    return {
      ok: false,
      error:
        "O envio de documentos não está disponível nesta etapa.",
    };
  }

  if (input.countsTowardLimit) {
    const { count } = await supabase
      .from("diagnostic_documents")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "diagnostic_id",
        input.diagnosticId,
      )
      .eq(
        "counts_toward_limit",
        true,
      )
      .neq("status", "rejected");

    if (
      (count ?? 0) >=
      diagnostic.document_limit
    ) {
      return {
        ok: false,
        error:
          "O limite de XMLs principais já foi atingido.",
      };
    }
  }

  const { error: insertError } =
    await supabase
      .from("diagnostic_documents")
      .insert({
        diagnostic_id:
          input.diagnosticId,
        uploaded_by: userId,
        category: input.category,
        file_name: input.fileName,
        storage_path:
          input.storagePath,
        mime_type:
          input.mimeType || null,
        size_bytes: input.sizeBytes,
        counts_toward_limit:
          input.countsTowardLimit,
        status: "uploaded",
      });

  if (insertError) {
    console.error(
      "Erro ao registrar documento:",
      insertError,
    );

    return {
      ok: false,
      error:
        `Não foi possível registrar o documento. Código: ${
          insertError.code ||
          "não informado"
        }.`,
    };
  }

  revalidatePath(
    `/painel/diagnosticos/${input.diagnosticId}`,
  );

  revalidatePath(
    `/painel/diagnosticos/${input.diagnosticId}/documentos`,
  );

  return {
    ok: true,
  };
}

export async function removeDocument(
  input: RemoveDocumentInput,
): Promise<ActionResult> {
  const {
    supabase,
    userId,
  } = await getAuthenticatedUserId();

  if (!userId) {
    return {
      ok: false,
      error:
        "Sua sessão expirou. Entre novamente.",
    };
  }

  const {
    data: diagnostic,
  } = await supabase
    .from("diagnostics")
    .select("id, status")
    .eq("id", input.diagnosticId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!diagnostic) {
    return {
      ok: false,
      error:
        "O diagnóstico não foi encontrado.",
    };
  }

  if (
    !allowedStatuses.includes(
      diagnostic.status,
    )
  ) {
    return {
      ok: false,
      error:
        "Não é possível excluir documentos nesta etapa.",
    };
  }

  const {
    data: document,
    error: documentError,
  } = await supabase
    .from("diagnostic_documents")
    .select(
      "id, storage_path, status",
    )
    .eq("id", input.documentId)
    .eq(
      "diagnostic_id",
      input.diagnosticId,
    )
    .maybeSingle();

  if (
    documentError ||
    !document
  ) {
    return {
      ok: false,
      error:
        "O documento não foi encontrado.",
    };
  }

  const { error: storageError } =
    await supabase.storage
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

  const { error: deleteError } =
    await supabase
      .from("diagnostic_documents")
      .delete()
      .eq("id", document.id);

  if (deleteError) {
    return {
      ok: false,
      error:
        "O arquivo foi removido, mas não foi possível excluir seu registro.",
    };
  }

  revalidatePath(
    `/painel/diagnosticos/${input.diagnosticId}`,
  );

  revalidatePath(
    `/painel/diagnosticos/${input.diagnosticId}/documentos`,
  );

  return {
    ok: true,
  };
}

export async function finalizeDocuments(
  diagnosticId: string,
): Promise<ActionResult> {
  const {
    supabase,
    userId,
  } = await getAuthenticatedUserId();

  if (!userId) {
    return {
      ok: false,
      error:
        "Sua sessão expirou. Entre novamente.",
    };
  }

  const { data: diagnostic } =
    await supabase
      .from("diagnostics")
      .select("id, status")
      .eq("id", diagnosticId)
      .eq("user_id", userId)
      .maybeSingle();

  if (
    !diagnostic ||
    diagnostic.status !==
      "awaiting_documents"
  ) {
    return {
      ok: false,
      error:
        "Os documentos não podem ser confirmados nesta etapa.",
    };
  }

  const { error } =
    await supabase.rpc(
      "submit_diagnostic_documents",
      {
        requested_diagnostic_id:
          diagnosticId,
      },
    );

  if (error) {
    console.error(
      "Erro ao confirmar documentos:",
      error,
    );

    return {
      ok: false,
      error:
        error.message ||
        "Não foi possível confirmar os documentos.",
    };
  }

  revalidatePath(
    `/painel/diagnosticos/${diagnosticId}`,
  );

  revalidatePath(
    `/painel/diagnosticos/${diagnosticId}/documentos`,
  );

  return {
    ok: true,
  };
}