// app/torre/comercio-v2/ofertas/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const route = "/torre/comercio-v2/ofertas";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function read(form: FormData, key: string, limit: number) {
  return String(form.get(key) ?? "").trim().slice(0, limit + 1);
}
function fail(code: string): never { redirect(route + "?erro=" + encodeURIComponent(code)); }
function moneyToCents(input: string): number | null {
  // Aceita 297,00 ou 297.00, mas nunca usa float para calcular centavos.
  const canonical = input.replace(/\s/g, "").replace(",", ".");
  if (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(canonical)) return null;
  const [whole, fraction = ""] = canonical.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 1000000000 ? cents : null;
}
function validDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [year, month, date] = day.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, date));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === date;
}
export async function saveCommerceV2Offer(form: FormData) {
  const { userId } = await requireAdmin();
  const id = read(form, "id", 36);
  const productId = read(form, "product_id", 36);
  const name = read(form, "name", 160);
  const description = read(form, "description", 2000);
  const normal = moneyToCents(read(form, "regular_price", 30));
  const promoText = read(form, "promotional_price", 30);
  const promo = promoText ? moneyToCents(promoText) : null;
  const start = read(form, "promo_starts_on", 10);
  const end = read(form, "promo_ends_on", 10);
  const versionString = read(form, "version", 10);
  if ((id && !uuid.test(id)) || !uuid.test(productId) ||
    name.length < 3 || name.length > 160 || description.length > 2000 || normal === null ||
    (promoText && promo === null) ||
    (promo !== null && (promo >= normal || !validDay(start) || !validDay(end) || end < start)) ||
    (promo === null && Boolean(start || end))) fail("validacao");

  const db = getSupabaseAdmin();
  const { data: product, error: productError } = await db.from("commerce_v2_products")
    .select("id").eq("id", productId).eq("status", "draft").maybeSingle();
  if (productError || !product) fail("produto");

  const fields = {
    product_id: productId, name, description: description || null,
    regular_price_cents: normal, promotional_price_cents: promo,
    promo_starts_on: promo === null ? null : start,
    promo_ends_on: promo === null ? null : end,
    updated_at: new Date().toISOString(), updated_by: userId,
  };

  if (id) {
    const expected = Number(versionString);
    if (!Number.isSafeInteger(expected) || expected < 1) fail("validacao");
    const { data, error } = await db.from("commerce_v2_offers")
      .update({ ...fields, version: expected + 1 })
      .eq("id", id).eq("version", expected).eq("status", "draft")
      .select("id").maybeSingle();
    if (error) { console.error("V2 offer update:", error.code); fail("salvar"); }
    if (!data) fail("conflito");
  } else {
    const { error } = await db.from("commerce_v2_offers").insert({
      ...fields, status: "draft", currency: "BRL", version: 1, created_by: userId,
    });
    if (error) { console.error("V2 offer insert:", error.code); fail("salvar"); }
  }
  revalidatePath(route);
  redirect(route + "?salvo=1");
}
