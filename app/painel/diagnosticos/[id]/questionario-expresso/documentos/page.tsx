// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\painel\diagnosticos\[id]\questionario-expresso\documentos\page.tsx

import type {
  Metadata,
} from "next";

import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import DocumentsStep from "./documents-step";

export const metadata: Metadata = {
  title:
    "NF-e para análise | Questionário Expresso",
};

export const dynamic =
  "force-dynamic";

type DocumentsPageProps = {
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

function asString(
  value: unknown,
) {
  return typeof value === "string"
    ? value
    : "";
}

function asBoolean(
  value: unknown,
) {
  return value === true;
}

export default async function DocumentsPage({
  params,
}: DocumentsPageProps) {
  const { id } = await params;

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
        user_id,
        document_limit
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

  const [
    {
      data: questionnaire,
    },
    {
      data: documents,
      error: documentsError,
    },
  ] = await Promise.all([
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

    supabase
      .from(
        "diagnostic_documents",
      )
      .select(
        `
          id,
          file_name,
          storage_path,
          size_bytes,
          status,
          created_at
        `,
      )
      .eq(
        "diagnostic_id",
        diagnostic.id,
      )
      .eq("category", "xml")
      .eq(
        "counts_toward_limit",
        true,
      )
      .neq("status", "rejected")
      .order("created_at", {
        ascending: true,
      }),
  ]);

  if (documentsError) {
    console.error(
      "Erro ao carregar XMLs:",
      documentsError,
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

  const contextEntries =
    Array.isArray(
      express.documents,
    )
      ? express.documents.map(
          asRecord,
        )
      : [];

  const contextByDocumentId =
    new Map(
      contextEntries.map(
        (entry) => [
          asString(
            entry.documentId,
          ),
          entry,
        ],
      ),
    );

  const documentsWithContext =
    await Promise.all(
      (documents ?? []).map(
        async (document) => {
          const context =
            contextByDocumentId.get(
              document.id,
            ) ?? {};

          const { data } =
            await supabase.storage
              .from(
                "diagnostic-documents",
              )
              .createSignedUrl(
                document.storage_path,
                600,
              );

          return {
            id:
              document.id,

            fileName:
              document.file_name,

            sizeBytes:
              document.size_bytes,

            signedUrl:
              data?.signedUrl ??
              null,

            operationType:
              asString(
                context.operationType,
              ),

            whySelected:
              asString(
                context.whySelected,
              ),

            ibsCbsTested:
              asString(
                context.ibsCbsTested,
              ),

            importantNotes:
              asString(
                context.importantNotes,
              ),

            hasRejection:
              asBoolean(
                context.hasRejection,
              ),

            rejectionDescription:
              asString(
                context.rejectionDescription,
              ),
          };
        },
      ),
    );

  return (
    <DocumentsStep
      diagnosticId={
        diagnostic.id
      }
      userId={userId}
      documentLimit={
        Number(
          diagnostic.document_limit ??
            5,
        )
      }
      documents={
        documentsWithContext
      }
    />
  );
}
