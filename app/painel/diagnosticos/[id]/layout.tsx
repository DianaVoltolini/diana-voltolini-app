// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\painel\diagnosticos\[id]\layout.tsx

import type {
  ReactNode,
} from "react";

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
}: DiagnosticLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}