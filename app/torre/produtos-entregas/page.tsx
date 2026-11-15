// app/torre/produtos-entregas/page.tsx
// Rota antiga descontinuada: todo cadastro e substituição de arquivo acontece
// na Biblioteca de Materiais V2. Preservar tabelas e download legado até
// concluir a migração das notificações e links antigos dos clientes.
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/require-admin";

export const dynamic="force-dynamic";

export default async function RetiredProductDeliveriesPage(){
  await requireAdmin();
  redirect("/torre/comercio-v2/materiais");
}
