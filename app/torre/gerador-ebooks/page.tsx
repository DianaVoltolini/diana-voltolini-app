// app/torre/gerador-ebooks/page.tsx
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/require-admin";
import EbookStudio from "./studio";

export const metadata: Metadata = { title: "Gerador de E-books | Diana Voltolini" };

export default async function GeradorEbooksPage() {
  await requireAdmin();
  return <EbookStudio />;
}
