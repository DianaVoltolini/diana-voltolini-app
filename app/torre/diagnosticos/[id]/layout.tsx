// app/torre/diagnosticos/[id]/layout.tsx

import type { ReactNode } from "react";

import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";

import styles from "./diagnostic-layout.module.css";

export const dynamic = "force-dynamic";

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
  const { id } = await params;

  const { supabase } =
    await requireAdmin();

  const { data: diagnostic } =
    await supabase
      .from("diagnostics")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

  const canFinalize =
    diagnostic &&
    [
      "under_review",
      "awaiting_approval",
    ].includes(diagnostic.status);

  return (
    <>
      {children}

      {canFinalize ? (
        <Link
          className={styles.finalizeShortcut}
          href={`/torre/diagnosticos/${id}/finalizar`}
        >
          Revisar e finalizar diagnóstico
        </Link>
      ) : null}
    </>
  );
}