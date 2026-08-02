// app/layout.tsx

import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://app.dianavoltolini.com.br"),

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

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${playfair.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}