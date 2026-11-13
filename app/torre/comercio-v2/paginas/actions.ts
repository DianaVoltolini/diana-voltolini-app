// app/torre/comercio-v2/paginas/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const base = "/torre/comercio-v2/paginas";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function value(form: FormData, key: string, max: number) {
  return String(form.get(key) ?? "").trim().slice(0, max + 1);
}
function error(code: string): never { redirect(base + "?erro=" + encodeURIComponent(code)); }

export async function saveCommercialPage(form: FormData) {
  const { userId } = await requireAdmin();
  const id = value(form, "id", 36);
  const productId = value(form, "product_id", 36);
  const offerId = value(form, "offer_id", 36);
  const slug = value(form, "slug", 100).toLowerCase();
  const template = value(form, "template", 20);
  const title = value(form, "title", 160);
  const headline = value(form, "headline", 250);
  const ctaLabel = value(form, "cta_label", 80);
  const expected = Number(value(form, "version", 9));
  if ((id && !uuid.test(id)) || !uuid.test(productId) || !uuid.test(offerId) ||
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 100 ||
    !["online_event", "ebook", "service", "course"].includes(template) ||
    title.length < 3 || title.length > 160 ||
    headline.length < 3 || headline.length > 250 || ctaLabel.length < 3 ||
    ctaLabel.length > 80 || (id && (!Number.isSafeInteger(expected) || expected < 1))) {
    error("validacao");
  }
  const limited = {
    eyebrow: 100, subtitle: 1000, benefits: 4000, audience: 2000,
    details: 4000, faq: 4000, seo_title: 160, seo_description: 320,
  } as const;
  const textFields: Record<string, string | null> = {};
  for (const [key, max] of Object.entries(limited)) {
    const v = value(form, key, max);
    if (v.length > max) error("validacao");
    textFields[key] = v || null;
  }
  const db = getSupabaseAdmin();
  const [product, offer] = await Promise.all([
    db.from("commerce_v2_products").select("id").eq("id", productId).eq("status", "draft").maybeSingle(),
    db.from("commerce_v2_offers").select("id,product_id").eq("id", offerId).eq("status", "draft").maybeSingle(),
  ]);
  if (product.error || !product.data || offer.error || !offer.data ||
    offer.data.product_id !== productId) error("vinculo");

  const fields = {
    product_id: productId, offer_id: offerId, slug, template, title, headline,
    cta_label: ctaLabel, ...textFields, updated_by: userId, updated_at: new Date().toISOString(),
  };
  if (id) {
    const { data: old, error: lookup } = await db.from("commerce_v2_pages")
      .select("id,slug").eq("id", id).maybeSingle();
    if (lookup || !old) error("nao_encontrada");
    // Não alterar slugs usados como identificador estável; protege URLs futuras.
    if (old.slug !== slug) error("slug");
    const { data, error: updateError } = await db.from("commerce_v2_pages")
      .update({ ...fields, version: expected + 1 }).eq("id", id)
      .eq("version", expected).eq("status", "draft").select("id").maybeSingle();
    if (updateError) error(updateError.code === "23505" ? "duplicado" : "salvar");
    if (!data) error("conflito");
  } else {
    const { error: insertError } = await db.from("commerce_v2_pages").insert({
      ...fields, version: 1, status: "draft", created_by: userId,
    });
    if (insertError) error(insertError.code === "23505" ? "duplicado" : "salvar");
  }
  revalidatePath(base);
  redirect(base + "?salvo=1");
}
