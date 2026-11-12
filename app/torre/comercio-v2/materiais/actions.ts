// app/torre/comercio-v2/materiais/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const base = "/torre/comercio-v2/materiais";
const idPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

function read(form: FormData, name: string, limit: number) {
  return String(form.get(name) ?? "").trim().slice(0, limit + 1);
}
function navigate(code: string): never { redirect(base + "?erro=" + encodeURIComponent(code)); }
export async function archiveCommerceV2Material(form: FormData) {
  const { userId } = await requireAdmin();
  const id = read(form, "id", 36);
  if (!idPattern.test(id) || form.get("confirm") !== "yes") navigate("validacao");
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("commerce_v2_materials")
    .update({ is_archived: true, updated_at: new Date().toISOString(), updated_by: userId })
    .eq("id", id).eq("is_archived", false).select("product_id").maybeSingle();
  if (error || !data) navigate("excluir");
  revalidatePath(base);
  redirect(base + "?produto=" + encodeURIComponent(data.product_id) + "&excluido=1");
}

export async function restoreCommerceV2Material(form: FormData) {
  const { userId } = await requireAdmin();
  const id = read(form, "id", 36);
  if (!idPattern.test(id)) navigate("validacao");
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("commerce_v2_materials")
    .update({ is_archived: false, updated_at: new Date().toISOString(), updated_by: userId })
    .eq("id", id).eq("is_archived", true).select("product_id").maybeSingle();
  if (error || !data) navigate("restaurar");
  revalidatePath(base);
  redirect(base + "?produto=" + encodeURIComponent(data.product_id) + "&restaurado=1");
}
