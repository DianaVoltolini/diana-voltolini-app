// app/painel/diagnosticos/[id]/layout.tsx

import type {
  ReactNode,
} from "react";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  ResultShortcut,
} from "./result-shortcut";

import styles from "./diagnostic-layout.module.css";

export const dynamic =
  "force-dynamic";

type DiagnosticLayoutProps = {
  children: ReactNode;

  params: Promise<{
    id: string;
  }>;
};

export default async function DiagnosticLayout({
  children,
  params,
}: DiagnosticLayoutProps) {
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
    await supabase.auth.getClaims();

  const userId =
    typeof claimsData
      ?.claims
      ?.sub ===
      "string"
      ? claimsData.claims.sub
      : null;

  let completed =
    false;

  if (userId) {
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
          id,
        )
        .eq(
          "user_id",
          userId,
        )
        .maybeSingle();

    completed =
      diagnostic?.status ===
      "completed";
  }

  return (
    <>
      {children}

      {completed ? (
        <ResultShortcut
          diagnosticId={
            id
          }
          className={
            styles.resultShortcut
          }
        />
      ) : null}
    </>
  );
}