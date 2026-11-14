// app/torre/comercio-v2/produtos/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const route = "/torre/comercio-v2/produtos";

function read(form: FormData, key: string, max: number): string {
  return String(form.get(key) ?? "").trim().slice(0, max + 1);
}
function optional(value: string) { return value || null; }
function destination(error: string, id = ""): never {
  const params = new URLSearchParams({ erro: error });
  if (id) {
    params.set("editar", id);
    redirect(route + "/novo?" + params.toString());
  }
  redirect(route + "/novo?" + params.toString());
}

export async function saveCommerceV2Product(form: FormData) {
  const { userId } = await requireAdmin();
  const id = read(form, "id", 36);
  const code = read(form, "code", 60).toUpperCase();
  const name = read(form, "name", 180);
  const productType = read(form, "product_type", 40);
  const description = read(form, "description", 8000);
  const deliveryDescription = read(form, "delivery_description", 4000);
  const salesPageUrl = read(form, "sales_page_url", 500);

  if ((id && !/^[a-f0-9-]{36}$/i.test(id)) ||
      !/^[A-Z0-9][A-Z0-9_-]{2,59}$/.test(code) ||
      name.length < 3 || name.length > 180 ||
      description.length > 8000 || deliveryDescription.length > 4000 ||
      !["ebook", "online_event", "course", "service", "other"].includes(productType)) {
    destination("validacao", id);
  }

  if (salesPageUrl) {
    let valid = false;
    try {
      const parsed = new URL(salesPageUrl);
      valid = parsed.protocol === "https:" && !parsed.username && !parsed.password &&
        salesPageUrl.length <= 500;
    } catch {
      valid = false;
    }
    if (!valid) destination("url", id);
  }

  const db = getSupabaseAdmin();
  const common = {
    name, product_type: productType,
    description: optional(description),
    delivery_description: optional(deliveryDescription),
    sales_page_url: optional(salesPageUrl),
    updated_by: userId, updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data: existing, error: lookupError } = await db
      .from("commerce_v2_products").select("id,code,sales_product_id,student_delivery_active").eq("id", id).maybeSingle();
    if (lookupError || !existing) destination("indisponivel", id);
    if (existing.code.toUpperCase() !== code) {
      if (existing.sales_product_id || existing.student_delivery_active) destination("codigo_vinculado", id);
      // O codigo e usado como vinculo com produtos comerciais anteriores.
      // Evitar romper esse vinculo silenciosamente quando houver correspondencia.
      const { data: legacyMatch, error: legacyError } = await db.from("products")
        .select("id").eq("code", existing.code).limit(1);
      if (legacyError) {
        console.error("Commerce V2 legacy code lookup:", legacyError.code);
        destination("codigo_consulta", id);
      }
      if ((legacyMatch ?? []).length) destination("codigo_vinculado", id);
      const { data: duplicate, error: duplicateError } = await db
        .from("commerce_v2_products").select("id").eq("code", code).neq("id", id).limit(1);
      if (duplicateError) destination("salvar", id);
      if ((duplicate ?? []).length) destination("duplicado", id);
    }

    const { data: updated, error } = await db.from("commerce_v2_products")
      .update({ ...common, code }).eq("id", id).select("id").maybeSingle();
    if (error || !updated) {
      console.error("Commerce V2 update:", error?.code ?? "no matching row");
      destination(error?.code === "23505" ? "duplicado" : "salvar", id);
    }
  } else {
    const { error } = await db.from("commerce_v2_products").insert({
      ...common, code, status: "draft", created_by: userId,
    });
    if (error) {
      console.error("Commerce V2 insert:", error.code);
      destination(error.code === "23505" ? "duplicado" : "salvar", id);
    }
  }
  revalidatePath(route);
  if (id) revalidatePath(route + "/novo");
  redirect(route + "?salvo=1");
}

/** Exclusao conservadora: somente rascunhos sem dados vinculados. */
export async function deleteCommerceV2Product(form: FormData) {
  await requireAdmin();
  const id = read(form, "id", 36);
  const confirmed = form.get("confirm") === "yes";
  if (!/^[a-f0-9-]{36}$/i.test(id) || !confirmed) {
    redirect(route + "?erro=exclusao_confirmacao");
  }
  const db = getSupabaseAdmin();
  const { data: product, error: productError } = await db
    .from("commerce_v2_products").select("id,code,status,sales_product_id,student_delivery_active").eq("id",id).maybeSingle();
  if (productError || !product || product.status !== "draft") {
    redirect(route + "?erro=exclusao_indisponivel");
  }
  if (product.sales_product_id || product.student_delivery_active) {
    redirect(route + "?erro=exclusao_vinculos");
  }
  // Bloquear, nunca apagar em cascata, qualquer material, oferta, pagina,
  // vinculo de entrega ou relacionamento com o produto comercial anterior.
  const checks = await Promise.all([
    db.from("commerce_v2_materials").select("id").eq("product_id",id).limit(1),
    db.from("commerce_v2_offers").select("id").eq("product_id",id).limit(1),
    db.from("commerce_v2_pages").select("id").eq("product_id",id).limit(1),
    db.from("commerce_v2_material_product_eligibility").select("material_id").eq("product_id",id).limit(1),
    db.from("commerce_v2_product_materials").select("material_id").eq("product_id",id).limit(1),
    db.from("products").select("id").eq("code",product.code).limit(1),
  ]);
  if (checks.some(result => result.error)) {
    console.error("Commerce V2 delete: failed to verify all dependencies");
    redirect(route + "?erro=exclusao_consulta");
  }
  if (checks.some(result => (result.data ?? []).length > 0)) {
    redirect(route + "?erro=exclusao_vinculos");
  }
  const { data: deleted, error } = await db.from("commerce_v2_products")
    .delete().eq("id",id).eq("status","draft").select("id").maybeSingle();
  if (error || !deleted) {
    console.error("Commerce V2 delete:",error?.code ?? "no matching row");
    redirect(route + "?erro=" + (error?.code === "23503" ? "exclusao_vinculos" : "exclusao_falhou"));
  }
  revalidatePath(route);
  redirect(route + "?excluido=1");
}
