// app/torre/comercio-v2/materiais/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const base = "/torre/comercio-v2/materiais";
const bucket = "commerce-v2-materials";
const maxFileSize = 25 * 1024 * 1024;
const mimeByExt: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  png: ["image/png"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"],
  webp: ["image/webp"], zip: ["application/zip", "application/x-zip-compressed"],
  txt: ["text/plain"],
};
const categories = ["slides", "ebook", "worksheet", "checklist", "script", "image", "support", "other"];
const idPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

function read(form: FormData, name: string, limit: number) {
  return String(form.get(name) ?? "").trim().slice(0, limit + 1);
}
function navigate(code: string): never { redirect(base + "?erro=" + encodeURIComponent(code)); }
function isValidFile(file: File) {
  const ext = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  return file.size > 0 && file.size <= maxFileSize &&
    Boolean(mimeByExt[ext]?.includes(file.type));
}

export async function saveCommerceV2Material(form: FormData) {
  const { userId } = await requireAdmin();
  const id = read(form, "id", 36);
  const productId = read(form, "product_id", 36);
  const title = read(form, "title", 180);
  const description = read(form, "description", 4000);
  const category = read(form, "category", 30);
  const candidate = form.get("file");
  const file = candidate instanceof File && candidate.size > 0 ? candidate : null;

  if ((id && !idPattern.test(id)) || !idPattern.test(productId) ||
      title.length < 2 || title.length > 180 || description.length > 4000 ||
      !categories.includes(category)) navigate("validacao");
  if (file && !isValidFile(file)) navigate("arquivo");

  const db = getSupabaseAdmin();
  const { data: product, error: productError } = await db.from("commerce_v2_products")
    .select("id").eq("id", productId).eq("status", "draft").maybeSingle();
  if (productError || !product) navigate("produto");

  const existingResult = id
    ? await db.from("commerce_v2_materials").select("id,product_id,storage_path")
        .eq("id", id).eq("is_archived", false).maybeSingle()
    : null;
  if (id && (existingResult?.error || !existingResult?.data ||
      existingResult.data.product_id !== productId)) navigate("material");

  let fileMeta: Record<string, string | number> = {};
  let path: string | null = null;
  if (file) {
    const ext = file.name.split(".").at(-1)!.toLowerCase();
    path = productId + "/" + crypto.randomUUID() + "." + ext;
    const { error: uploadError } = await db.storage.from(bucket).upload(
      path, await file.arrayBuffer(),
      { contentType: file.type, cacheControl: "3600", upsert: false },
    );
    if (uploadError) {
      console.error("Commerce V2 material upload:", uploadError.message);
      navigate("upload");
    }
    fileMeta = {
      storage_path: path,
      original_filename: file.name.slice(0, 255),
      file_mime: file.type,
      file_size: file.size,
    };
  }

  const fields = {
    title, description, category, updated_by: userId, updated_at: new Date().toISOString(),
    ...fileMeta,
  };
  const result = id
    ? await db.from("commerce_v2_materials").update(fields).eq("id", id)
        .eq("product_id", productId).eq("is_archived", false).select("id").maybeSingle()
    : await db.from("commerce_v2_materials").insert({
      ...fields, product_id: productId, created_by: userId,
    }).select("id").maybeSingle();

  if (result.error || !result.data) {
    if (path) await db.storage.from(bucket).remove([path]);
    console.error("Commerce V2 material save:", result.error?.code);
    navigate("salvar");
  }
  // Substituição: só após o registro apontar para o novo arquivo.
  // Caso a limpeza falhe, o arquivo anterior permanece privado e inacessível pela UI.
  const previous = existingResult?.data?.storage_path;
  if (path && previous && previous !== path) {
    const { error: cleanupError } = await db.storage.from(bucket).remove([previous]);
    if (cleanupError) console.error("Commerce V2 cleanup:", cleanupError.message);
  }

  revalidatePath(base);
  redirect(base + "?produto=" + encodeURIComponent(productId) + "&salvo=1");
}

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
