// app/painel/diagnosticos/[id]/result-shortcut.tsx

"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

type ResultShortcutProps = {
  diagnosticId: string;
  className: string;
};

export function ResultShortcut({
  diagnosticId,
  className,
}: ResultShortcutProps) {
  const pathname =
    usePathname();

  const resultPath =
    `/painel/diagnosticos/${diagnosticId}/resultado`;

  const isResultPage =
    pathname ===
      resultPath ||
    pathname.startsWith(
      `${resultPath}/`,
    );

  if (
    isResultPage
  ) {
    return null;
  }

  return (
    <Link
      className={
        className
      }
      href={
        resultPath
      }
    >
      Consultar resultado
    </Link>
  );
}