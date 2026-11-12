// app/torre/comercio-v2/materiais/salvar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const base = "/torre/comercio-v2/materiais";
const bucket = "commerce-v2-materials";
const maxFile = 25 * 1024 * 1024;
const maxRequest = 26 * 1024 * 1024;
const extensions: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  png: ["image/png"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"],
  webp: ["image/webp"], zip: ["application/zip", "application/x-zip-compressed"],
  txt: ["text/plain"],
};
const categories = new Set(["slides", "ebook", "worksheet", "checklist", "script", "image", "support", "exercises", "other"]);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function field(form: FormData, key: string, max: number) {
  return String(form.get(key) ?? "").trim().slice(0, max + 1);
}
function back(key: string, value = "") {
  const params = new URLSearchParams({ [key]: value || "1" });
  return new NextResponse(null, { status: 303, headers: { Location: base + "?" + params.toString(), "Cache-Control": "no-store" } });
}
export async function POST(request: NextRequest) {
  // Rotas POST nao recebem protecao CSRF automatica das Server Actions.
  // Exigir Origin do mesmo host antes de processar o corpo ou usar service role.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }
  try {
    if (new URL(origin).host.toLowerCase() !== host.toLowerCase() ||
        new URL(origin).protocol !== "https:" && new URL(origin).protocol !== "http:") {
      return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxRequest) {
    return back("erro", "arquivo");
  }
  const { userId } = await requireAdmin();
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return back("erro", "arquivo");
  }
  const id = field(form, "id", 36);
  const productId = field(form, "product_id", 36);
  const title = field(form, "title", 180);
  const description = field(form, "description", 4000);
  const category = field(form, "category", 30);
  const uploaded = form.get("file");
  const file = uploaded instanceof File && uploaded.size > 0 ? uploaded : null;
  if ((id && !uuid.test(id)) || !uuid.test(productId) ||
    title.length < 2 || title.length > 180 || description.length > 4000 || !categories.has(category)) {
    return back("erro", "validacao");
  }
  let ext = "";
  if (file) {
    ext = file.name.split(".").at(-1)?.toLowerCase() ?? "";
    if (file.size > maxFile || !extensions[ext]?.includes(file.type) ||
        file.name.length > 255) {
      return back("erro", "arquivo");
    }
  }

  const db = getSupabaseAdmin();
  const { data: product, error: productError } = await db.from("commerce_v2_products")
    .select("id").eq("id", productId).eq("status", "draft").maybeSingle();
  if (productError || !product) return back("erro", "produto");

  const existingResult = id ? await db.from("commerce_v2_materials")
    .select("id,product_id,storage_path").eq("id", id).eq("is_archived", false).maybeSingle() : null;
  if (id && (existingResult?.error || !existingResult?.data ||
      existingResult.data.product_id !== productId)) return back("erro", "material");

  let path: string | null = null;
  let fileFields: Record<string, string | number> = {};
  if (file) {
    path = productId + "/" + crypto.randomUUID() + "." + ext;
    const { error } = await db.storage.from(bucket)
      .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (error) {
      console.error("Commerce V2 upload:", error.message);
      return back("erro", "upload");
    }
    fileFields = {
      storage_path: path, original_filename: file.name,
      file_mime: file.type, file_size: file.size,
    };
  }

  const values = {
    title, description, category, updated_by: userId,
    updated_at: new Date().toISOString(), ...fileFields,
  };
  const result = id
    ? await db.from("commerce_v2_materials").update(values).eq("id", id)
       .eq("product_id", productId).eq("is_archived", false).select("id").maybeSingle()
    : await db.from("commerce_v2_materials").insert({
        ...values, product_id: productId, created_by: userId,
      }).select("id").maybeSingle();
  if (result.error || !result.data) {
    if (path) await db.storage.from(bucket).remove([path]);
    console.error("Commerce V2 save:", result.error?.code);
    return back("erro", "salvar");
  }

  const previousPath = existingResult?.data?.storage_path;
  if (path && previousPath && previousPath !== path) {
    const { error } = await db.storage.from(bucket).remove([previousPath]);
    if (error) console.error("Commerce V2 cleanup:", error.message);
  }

  const params = new URLSearchParams({ produto: productId, salvo: "1" });
  return new NextResponse(null, { status: 303, headers: { Location: base + "?" + params.toString(), "Cache-Control": "no-store" } });
}
