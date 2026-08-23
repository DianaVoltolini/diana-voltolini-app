// app/painel/diagnosticos/[id]/mensagens/actions.ts

"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type MessageActionState = {
  status: "idle" | "success" | "error";
  message: string;
  resetKey: number;
};

const allowedStatuses = [
  "awaiting_questionnaire",
  "awaiting_documents",
  "documents_received",
  "under_review",
  "client_action_required",
  "awaiting_approval",
];

function createState(
  status: MessageActionState["status"],
  message: string,
): MessageActionState {
  return {
    status,
    message,
    resetKey: Date.now(),
  };
}

export async function sendClientMessage(
  _previousState: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  const diagnosticId = String(
    formData.get("diagnosticId") ?? "",
  ).trim();

  const body = String(
    formData.get("body") ?? "",
  ).trim();

  if (!diagnosticId) {
    return createState(
      "error",
      "O diagnóstico não foi identificado.",
    );
  }

  if (!body) {
    return createState(
      "error",
      "Digite uma mensagem antes de enviar.",
    );
  }

  if (body.length > 3000) {
    return createState(
      "error",
      "A mensagem deve ter no máximo 3.000 caracteres.",
    );
  }

  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId =
    typeof claimsData?.claims?.sub === "string"
      ? claimsData.claims.sub
      : null;

  if (!userId) {
    return createState(
      "error",
      "Sua sessão expirou. Entre novamente na área do cliente.",
    );
  }

  const {
    data: diagnostic,
    error: diagnosticError,
  } = await supabase
    .from("diagnostics")
    .select("id, status, user_id")
    .eq("id", diagnosticId)
    .eq("user_id", userId)
    .maybeSingle();

  if (
    diagnosticError ||
    !diagnostic
  ) {
    return createState(
      "error",
      "O diagnóstico não foi encontrado para este usuário.",
    );
  }

  if (
    !allowedStatuses.includes(
      diagnostic.status,
    )
  ) {
    return createState(
      "error",
      "Não é possível enviar mensagens na situação atual do diagnóstico.",
    );
  }

  const { error: insertError } =
    await supabase
      .from("diagnostic_messages")
      .insert({
        diagnostic_id: diagnosticId,
        sender_user_id: userId,
        sender_role: "client",
        body,
        visible_to_client: true,
      });

  if (insertError) {
    console.error(
      "Erro ao registrar mensagem:",
      insertError,
    );

    return createState(
      "error",
      `Não foi possível enviar a mensagem. Código: ${
        insertError.code || "não informado"
      }.`,
    );
  }

  revalidatePath(
    `/painel/diagnosticos/${diagnosticId}`,
  );

  return createState(
    "success",
    "Mensagem enviada para a equipe responsável.",
  );
}