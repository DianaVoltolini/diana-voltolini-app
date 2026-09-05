// app/torre/diagnosticos/[id]/layout.tsx

import type { ReactNode } from "react";

import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

type DiagnosticLayoutProps = {
  children: ReactNode;
};

export default async function DiagnosticLayout({
  children,
}: DiagnosticLayoutProps) {
  await requireAdmin();

  return <>{children}</>;
}