// app/layout.tsx

import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://app.dianavoltolini.com.br",
  ),

  title: {
    default: "Área do Cliente | Diana Voltolini",
    template: "%s | Diana Voltolini",
  },

  description:
    "Área exclusiva para clientes, questionários, documentos e resultados dos serviços Diana Voltolini.",

  robots: {
    index: false,
    follow: false,
  },
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}