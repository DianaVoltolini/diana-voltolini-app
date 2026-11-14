// app/torre/comercio-v2/materiais/tipos/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const base = "/torre/comercio-v2/materiais/tipos";
function go(key: string, value: string): never {
  redirect(base + "?" + new URLSearchParams({ [key]: value }).toString());
}
function codeFromName(name: string): string {
  const slug = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "").slice(0, 30).replace(/_+$/g, "");
  return /^[a-z][a-z0-9_]{1,29}$/.test(slug) ? slug : "";
}
export async function saveMaterialType(form: FormData) {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  const edit = form.get("edit") === "yes";
  if (name.length < 2 || name.length > 80) go("erro", "validacao");

  const db = getSupabaseAdmin();
  const { data: sameName, error: nameError } = await db.from("commerce_v2_material_types")
    .select("code,name").ilike("name", name).limit(50);
  if (nameError) go("erro", "salvar");

  if (edit) {
    const code = String(form.get("code") ?? "").trim();
    if (!/^[a-z][a-z0-9_]{1,29}$/.test(code)) go("erro", "validacao");
    if ((sameName ?? []).some(t => t.code !== code && t.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR")))
      go("erro", "duplicado");

    // A edição altera somente o nome; preserva o código e a situação do tipo.
    const { data, error } = await db.from("commerce_v2_material_types")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("code", code).select("code").maybeSingle();
    if (error || !data) {
      console.error("[material-types] edit:", error?.code);
      go("erro", "salvar");
    }
  } else {
    if ((sameName ?? []).some(t => t.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR")))
      go("erro", "duplicado");
    const code = codeFromName(name);
    if (!code) go("erro", "validacao");
    const { error } = await db.from("commerce_v2_material_types")
      .insert({ code, name, is_active: true });
    if (error) {
      console.error("[material-types] create:", error.code);
      go("erro", error.code === "23505" ? "duplicado" : "salvar");
    }
  }
  revalidatePath(base);
  revalidatePath("/torre/comercio-v2/materiais");
  revalidatePath("/torre/comercio-v2/materiais/novo");
  go("salvo", "1");
}
