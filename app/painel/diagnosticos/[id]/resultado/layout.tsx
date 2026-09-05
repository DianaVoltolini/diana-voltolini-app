// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\painel\diagnosticos\[id]\resultado\layout.tsx

import type {
  ReactNode,
} from "react";

import styles from "./pdf-download.module.css";

type ResultLayoutProps = {
  children:
    ReactNode;

  params: Promise<{
    id: string;
  }>;
};

export default async function ResultLayout({
  children,
  params,
}: ResultLayoutProps) {
  const {
    id,
  } =
    await params;

  return (
    <>
      {children}

      <a
        className={
          styles.downloadButton
        }
        href={`/api/diagnosticos/${id}/pdf`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 3V15M12 15L7.5 10.5M12 15L16.5 10.5M5 20H19"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        Baixar resultado em PDF
      </a>
    </>
  );
}