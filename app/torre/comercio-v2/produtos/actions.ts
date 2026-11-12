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
function destination(error: string): never {
  redirect(route + "?erro=" + encodeURIComponent(error));
}

export async function saveCommerceV2Product(form: FormData) {
  const { userId } = await requireAdmin();
  const id = read(form, "id", 36);
  const code = read(form, "code", 60).toUpperCase();
  const name = read(form, "name", 180);
  const shortName = read(form, "short_name", 120);
  const productType = read(form, "product_type", 40);
  const summary = read(form, "summary", 600);
  const description = read(form, "description", 8000);
  const deliveryDescription = read(form, "delivery_description", 4000);
  const salesPageUrl = read(form, "sales_page_url", 500);

  if ((id && !/^[a-f0-9-]{36}$/i.test(id)) ||
      !/^[A-Z0-9][A-Z0-9_-]{2,59}$/.test(code) ||
      name.length < 3 || name.length > 180 ||
      shortName.length > 120 || summary.length > 600 ||
      description.length > 8000 || deliveryDescription.length > 4000 ||
      !["ebook", "online_event", "course", "service", "other"].includes(productType)) {
    destination("validacao");
  }

  if (salesPageUrl) {
    try {
      const parsed = new URL(salesPageUrl);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password || salesPageUrl.length > 500) {
        destination("url");
      }
    } catch { destination("url"); }
  }

  const db = getSupabaseAdmin();
  const common = {
    name, short_name: optional(shortName), product_type: productType,
    summary: optional(summary), description: optional(description),
    delivery_description: optional(deliveryDescription),
    sales_page_url: optional(salesPageUrl),
    updated_by: userId, updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data: existing, error: lookupError } = await db
      .from("commerce_v2_products").select("id,code").eq("id", id).maybeSingle();
    if (lookupError || !existing) destination("indisponivel");
    if (existing.code !== code) destination("codigo");

    const { error } = await db.from("commerce_v2_products").update(common).eq("id", id);
    if (error) { console.error("Commerce V2 update:", error.code); destination("salvar"); }
  } else {
    const { error } = await db.from("commerce_v2_products").insert({
      ...common, code, status: "draft", created_by: userId,
    });
    if (error) {
      console.error("Commerce V2 insert:", error.code);
      destination(error.code === "23505" ? "duplicado" : "salvar");
    }
  }
  revalidatePath(route);
  redirect(route + "?salvo=1");
}
