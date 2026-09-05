// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\api\diagnosticos\[id]\pdf\route.ts

import {
  readFile,
} from "node:fs/promises";

import {
  join,
} from "node:path";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  generateDiagnosticPdf,
  type DiagnosticPdfOperation,
} from "@/lib/pdf/diagnostico-pdf";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type JsonRecord =
  Record<
    string,
    unknown
  >;

type ResultPayload = {
  classification?:
    string;

  generalAssessment?:
    string | null;

  strengths?:
    string | null;

  risks?:
    string | null;

  actionPlan?:
    string | null;

  finalOpinion?:
    string | null;

  operations?:
    unknown[];

  limitation?:
    string | null;
};

function asRecord(
  value:
    unknown,
): JsonRecord {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value,
    )
  )
    ? value as JsonRecord
    : {};
}

function asString(
  value:
    unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function parseResult(
  value:
    | string
    | null
    | undefined,
): ResultPayload {
  if (!value) {
    return {};
  }

  try {
    const parsed =
      JSON.parse(
        value,
      );

    if (
      typeof parsed ===
        "object" &&
      parsed !== null &&
      !Array.isArray(
        parsed,
      )
    ) {
      return parsed as ResultPayload;
    }
  } catch {
    return {
      generalAssessment:
        value,
    };
  }

  return {};
}

function safeFileName(
  value:
    string,
) {
  return value
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "-",
    )
    .replace(
      /-+/g,
      "-",
    )
    .replace(
      /^-|-$/g,
      "",
    );
}

function toArrayBuffer(
  bytes:
    Uint8Array,
) {
  const copy =
    new Uint8Array(
      bytes.byteLength,
    );

  copy.set(
    bytes,
  );

  return copy.buffer;
}

export async function GET(
  _request:
    Request,
  {
    params,
  }:
    RouteContext,
) {
  const {
    id,
  } =
    await params;

  const supabase =
    await createClient();

  const {
    data:
      claimsData,
  } =
    await supabase.auth
      .getClaims();

  const userId =
    typeof claimsData
      ?.claims
      ?.sub ===
      "string"
      ? claimsData
          .claims
          .sub
      : null;

  if (!userId) {
    return new Response(
      "Não autorizado.",
      {
        status:
          401,
      },
    );
  }

  const {
    data:
      diagnostic,
    error:
      diagnosticError,
  } =
    await supabase
      .from(
        "diagnostics",
      )
      .select(
        `
          id,
          code,
          status,
          company_id,
          final_classification,
          public_summary,
          completed_at
        `,
      )
      .eq(
        "id",
        id,
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
    return new Response(
      "Diagnóstico não encontrado.",
      {
        status:
          404,
      },
    );
  }

  if (
    diagnostic.status !==
    "completed"
  ) {
    return new Response(
      "O diagnóstico ainda não foi concluído.",
      {
        status:
          409,
      },
    );
  }

  const {
    data:
      company,
    error:
      companyError,
  } =
    await supabase
      .from(
        "companies",
      )
      .select(
        `
          legal_name,
          trade_name,
          cnpj,
          city,
          state,
          tax_regime,
          erp_name
        `,
      )
      .eq(
        "id",
        diagnostic.company_id,
      )
      .maybeSingle();

  if (
    companyError
  ) {
    console.error(
      "Erro ao carregar empresa para o PDF:",
      companyError,
    );
  }

  const result =
    parseResult(
      diagnostic.public_summary,
    );

  const operations:
    DiagnosticPdfOperation[] =
    Array.isArray(
      result.operations,
    )
      ? result.operations
          .map(
            asRecord,
          )
          .filter(
            (
              operation,
            ) =>
              asString(
                operation.file_name,
              ).length >
                0 ||
              asString(
                operation.operation,
              ).length >
                0,
          )
          .map(
            (
              operation,
            ) => ({
              fileName:
                asString(
                  operation.file_name,
                ),

              operation:
                asString(
                  operation.operation,
                ),

              result:
                asString(
                  operation.result,
                ),

              documentConformity:
                asString(
                  operation.document_conformity,
                ) ||
                asString(
                  operation.result,
                ),

              preparationStatus:
                asString(
                  operation.preparation_status,
                ),

              cfop:
                asString(
                  operation.cfop,
                ),

              operationIdentification:
                asString(
                  operation.operation_identification,
                ),

              evidenceFound:
                asString(
                  operation.evidence_found,
                ),

              calculationReview:
                asString(
                  operation.calculation_review,
                ),

              technicalFinding:
                asString(
                  operation.technical_finding,
                ),

              technicalBasis:
                asString(
                  operation.technical_basis,
                ),

              riskImpact:
                asString(
                  operation.risk_impact,
                ),

              recommendedAction:
                asString(
                  operation.recommended_action,
                ),

              responsibleParty:
                asString(
                  operation.responsible_party,
                ),

              closureEvidence:
                asString(
                  operation.closure_evidence,
                ),

              technicalAnalysis:
                asString(
                  operation.technical_analysis,
                ),

              recommendation:
                asString(
                  operation.recommendation,
                ),
            }),
          )
      : [];

  const companyName =
    company
      ?.trade_name ||
    company
      ?.legal_name ||
    "Empresa não informada";

  let logoBytes:
    Uint8Array |
    null =
    null;

  try {
    const logoPath =
      join(
        process.cwd(),
        "public",
        "brand",
        "logo-light.png",
      );

    const logoFile =
      await readFile(
        logoPath,
      );

    logoBytes =
      new Uint8Array(
        logoFile,
      );
  } catch (
    logoError
  ) {
    console.warn(
      "Logo não carregado no PDF:",
      logoError,
    );
  }

  try {
    const pdfBytes =
      await generateDiagnosticPdf({
        data: {
          code:
            diagnostic.code,

          companyName,

          cnpj:
            company?.cnpj ??
            null,

          city:
            company?.city ??
            null,

          state:
            company?.state ??
            null,

          taxRegime:
            company?.tax_regime ??
            null,

          erpName:
            company?.erp_name ??
            null,

          completedAt:
            diagnostic.completed_at,

          classification:
            result.classification ||
            diagnostic.final_classification,

          generalAssessment:
            result.generalAssessment ??
            null,

          strengths:
            result.strengths ??
            null,

          risks:
            result.risks ??
            null,

          actionPlan:
            result.actionPlan ??
            null,

          finalOpinion:
            result.finalOpinion ??
            null,

          limitation:
            result.limitation ??
            null,

          operations,
        },

        logoBytes,
      });

    const safeCode =
      safeFileName(
        diagnostic.code,
      ) ||
      "resultado";

    const fileName =
      `diagnostico-ibs-cbs-${safeCode}.pdf`;

    const pdfBody =
      toArrayBuffer(
        pdfBytes,
      );

    return new Response(
      pdfBody,
      {
        status:
          200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${fileName}"`,

          "Cache-Control":
            "private, no-store, max-age=0",

          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
  } catch (
    pdfError
  ) {
    console.error(
      "Erro ao gerar PDF do diagnóstico:",
      pdfError,
    );

    return new Response(
      "Não foi possível gerar o PDF do diagnóstico.",
      {
        status:
          500,
      },
    );
  }
}