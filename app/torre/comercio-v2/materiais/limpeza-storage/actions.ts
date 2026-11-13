// app/torre/comercio-v2/materiais/limpeza-storage/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { auditStorage, BUCKET, validMaterialPath } from "./audit";

const BASE = "/torre/comercio-v2/materiais/limpeza-storage";
function go(code: string): never { redirect(BASE + "?" + code); }

/** Revalida os arquivos no servidor; caminhos recebidos do navegador não são confiáveis. */
export async function removeSelectedOrphans(form: FormData) {
  await requireAdmin();
  if (form.get("confirm") !== "EXCLUIR TESTES") go("erro=confirmacao");
  const paths = [...new Set(form.getAll("paths").map(String))];
  if (!paths.length || paths.length > 100 || paths.some(p => !validMaterialPath(p))) go("erro=selecao");
  let audit;
  try { audit = await auditStorage(); }
  catch (error) { console.error("[commerce-v2-storage-audit]", error); go("erro=auditoria"); }
  const allowed = new Set(audit.orphanPaths);
  if (paths.some(p => !allowed.has(p))) go("erro=alterado");
  // Nova verificação imediatamente antes da chamada destrutiva.
  const db = getSupabaseAdmin();
  const { data: references, error: refError } = await db.from("commerce_v2_materials")
    .select("storage_path").in("storage_path", paths);
  if (refError || !references || references.length) go("erro=referencia");
  const { data, error } = await db.storage.from(BUCKET).remove(paths);
  if (error) { console.error("[commerce-v2-storage-delete]", error.message); go("erro=exclusao"); }
  const removed = data?.length ?? 0;
  revalidatePath(BASE);
  go("excluidos=" + removed);
}
