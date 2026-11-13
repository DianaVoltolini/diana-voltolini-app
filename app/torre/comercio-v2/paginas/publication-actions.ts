// app/torre/comercio-v2/paginas/publication-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const listing = "/torre/comercio-v2/paginas";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const fail = (code: string): never => redirect(listing + "?erro=" + encodeURIComponent(code));

export async function changeCommercialPagePublication(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const operation = String(form.get("operation") ?? "");
  const expectedVersion = Number(form.get("version"));
  if (!uuid.test(id) || !["publish", "unpublish"].includes(operation) ||
      !Number.isSafeInteger(expectedVersion) || expectedVersion < 1 ||
      form.get("confirm") !== operation) return fail("publicacao");

  const db = getSupabaseAdmin();
  const { data: page, error: pageError } = await db.from("commerce_v2_pages")
    .select("id,product_id,offer_id,title,headline,slug,status,version")
    .eq("id", id).eq("version", expectedVersion).maybeSingle();
  if (pageError || !page) return fail("conflito");

  if (operation === "publish") {
    if (page.status !== "draft" || !page.headline?.trim() || !page.title?.trim()) return fail("publicacao");
    const [p,o] = await Promise.all([
      db.from("commerce_v2_products").select("id").eq("id",page.product_id).maybeSingle(),
      db.from("commerce_v2_offers").select("id,product_id,regular_price_cents")
        .eq("id",page.offer_id).maybeSingle(),
    ]);
    if (p.error || o.error || !p.data || !o.data ||
        o.data.product_id !== page.product_id || o.data.regular_price_cents <= 0) return fail("vinculo");
  } else if (page.status !== "published") return fail("publicacao");

  const changes = operation === "publish"
    ? { status: "published", published_at: new Date().toISOString(), version: expectedVersion + 1 }
    : { status: "draft", published_at: null, version: expectedVersion + 1 };
  const { data, error } = await db.from("commerce_v2_pages")
    .update(changes).eq("id", id).eq("version", expectedVersion).eq("status", page.status)
    .select("id").maybeSingle();
  if (error) {
    console.error("Commerce V2 publication error:", error.code);
    fail("publicacao");
  }
  if (!data) return fail("conflito");
  revalidatePath(listing);
  redirect(listing + (operation === "publish" ? "?publicada=1" : "?retirada=1"));
}
