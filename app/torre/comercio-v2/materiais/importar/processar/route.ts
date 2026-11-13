// app/torre/comercio-v2/materiais/importar/processar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const base = "/torre/comercio-v2/materiais";
const bucket = "commerce-v2-materials";
const MAX_FILE = 25 * 1024 * 1024;
const MAX_TOTAL = 90 * 1024 * 1024;
const MAX_ITEMS = 20;
const ACCEPTED: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  zip: ["application/zip", "application/x-zip-compressed"],
  txt: ["text/plain"],
  png: ["image/png"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"], webp: ["image/webp"],
};
const CATEGORIES = new Set(["slides", "ebook", "worksheet", "checklist", "script", "exercises", "image", "support", "other"]);
type Entry = { code: string; title: string; category: string; description: string; filename: string };

function response(status: string, product = "") {
  const params = new URLSearchParams({ [status === "ok" ? "importado" : "erro"]: status === "ok" ? "1" : status });
  if (product) params.set("produto", product);
  return new NextResponse(null, {
    status: 303,
    headers: { Location: base + "?" + params.toString(), "Cache-Control": "no-store" },
  });
}

// CSV padrão RFC 4180: aceita aspas, vírgulas e quebras de linha entre aspas.
function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const result: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') {
      if (field.length) throw Error("CSV inválido");
      quoted = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(x => x.trim())) result.push(row);
      row = []; field = "";
    } else field += c;
  }
  if (quoted) throw Error("Aspas sem fechamento");
  row.push(field);
  if (row.some(x => x.trim())) result.push(row);
  return result;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  try {
    const incoming = new URL(origin);
    if (incoming.host.toLowerCase() !== host.toLowerCase() || !["https:", "http:"].includes(incoming.protocol))
      return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  } catch { return NextResponse.json({ error: "Origem inválida" }, { status: 403 }); }
  if (Number(request.headers.get("content-length") || 0) > MAX_TOTAL + 1024 * 1024)
    return response("arquivo");
  const { userId } = await requireAdmin();
  let form: FormData;
  try { form = await request.formData(); } catch { return response("arquivo"); }
  const productId = String(form.get("product_id") ?? "");
  const confirmation = String(form.get("confirm_code") ?? "").trim();
  const manifest = form.get("manifest");
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!/^[a-f\d-]{36}$/i.test(productId) || !(manifest instanceof File) ||
      manifest.size > 128 * 1024 || !files.length || files.length > MAX_ITEMS)
    return response("validacao");

  const db = getSupabaseAdmin();
  const { data: product, error: productError } = await db.from("commerce_v2_products")
    .select("id,code,status").eq("id", productId).maybeSingle();
  if (productError || !product || product.status !== "draft" || confirmation !== product.code)
    return response("produto", productId);

  let entries: Entry[];
  try {
    const rows = parseCsv(await manifest.text());
    const expected = ["codigo_produto", "nome_material", "tipo_codigo", "descricao", "arquivo"];
    if (!rows.length || rows[0].map(v => v.trim().toLowerCase()).join("|") !== expected.join("|"))
      return response("csv", productId);
    entries = rows.slice(1).map(r => {
      if (r.length !== 5) throw Error("Número de colunas incorreto");
      return { code: r[0].trim(), title: r[1].trim(), category: r[2].trim(), description: r[3].trim(), filename: r[4].trim() };
    });
    if (entries.length < 1 || entries.length > MAX_ITEMS ||
      entries.some(e => e.code !== product.code || e.title.length < 2 || e.title.length > 180 ||
        e.description.length > 4000 || !CATEGORIES.has(e.category) ||
        !e.filename || e.filename.length > 255 || e.filename.includes("/") || e.filename.includes("\\")))
      return response("csv", productId);
  } catch { return response("csv", productId); }

  const names = new Set(entries.map(e => e.filename));
  const uploadedNames = new Set(files.map(f => f.name));
  if (names.size !== entries.length || uploadedNames.size !== files.length ||
      names.size !== files.length || [...names].some(n => !uploadedNames.has(n)))
    return response("correspondencia", productId);
  if (files.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL ||
    files.some(f => {
      const ext = f.name.split(".").at(-1)?.toLowerCase() || "";
      return f.size > MAX_FILE || !ACCEPTED[ext]?.includes(f.type);
    })) return response("arquivo", productId);

  // Captura os registros existentes antes da importação; sem exclusão física de arquivos.
  const old = await db.from("commerce_v2_materials")
    .select("id").eq("product_id", productId).eq("is_archived", false);
  if (old.error) return response("consulta", productId);
  const previousIds = (old.data || []).map(m => m.id as string);
  const newPaths: string[] = [];
  let newIds: string[] = [];
  async function rollback() {
    if (newIds.length) await db.from("commerce_v2_materials").delete().in("id", newIds).eq("product_id", productId);
    if (newPaths.length) await db.storage.from(bucket).remove(newPaths);
  }
  try {
    const byName = new Map(files.map(f => [f.name, f]));
    const rows = [];
    for (const entry of entries) {
      const file = byName.get(entry.filename)!;
      const ext = entry.filename.split(".").at(-1)!.toLowerCase();
      const path = productId + "/" + crypto.randomUUID() + "." + ext;
      const { error } = await db.storage.from(bucket).upload(path, await file.arrayBuffer(), {
        contentType: file.type, upsert: false,
      });
      if (error) throw Error("upload: " + error.message);
      newPaths.push(path);
      rows.push({
        product_id: productId, title: entry.title, description: entry.description,
        category: entry.category, storage_path: path, original_filename: entry.filename,
        file_mime: file.type, file_size: file.size,
        created_by: userId, updated_by: userId, updated_at: new Date().toISOString(),
      });
    }
    const inserted = await db.from("commerce_v2_materials")
      .insert(rows).select("id");
    if (inserted.error || !inserted.data || inserted.data.length !== entries.length)
      throw Error("insert");
    newIds = inserted.data.map(m => m.id as string);
    if (previousIds.length) {
      const archived = await db.from("commerce_v2_materials")
        .update({ is_archived: true, updated_at: new Date().toISOString(), updated_by: userId })
        .eq("product_id", productId).in("id", previousIds).select("id");
      if (archived.error || archived.data?.length !== previousIds.length) {
        // Se houver arquivamento parcial, restaurar os registros anteriores.
        await db.from("commerce_v2_materials").update({ is_archived: false, updated_by: userId,
          updated_at: new Date().toISOString() }).eq("product_id", productId).in("id", previousIds);
        throw Error("archive");
      }
    }
    return response("ok", productId);
  } catch (error) {
    console.error("Biblioteca importação em lote:", error instanceof Error ? error.message : "erro");
    await rollback();
    return response("importacao", productId);
  }
}
