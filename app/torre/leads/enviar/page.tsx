// app/torre/leads/enviar/page.tsx
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
export default async function EmailSendEntry(){
  await requireAdmin();
  redirect("/torre/leads/enviar/manual");
}
