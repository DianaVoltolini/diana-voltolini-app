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
  const title = field(form, "title", 180);
  const description = field(form, "description", 4000);
  const category = field(form, "category", 30);
  const availableToStudent = form.get("available_to_student") === "yes";
  const eligibleProductIds = [...new Set(form.getAll("eligible_product_ids").map(value=>String(value)))];
  const uploaded = form.get("file");
  const file = uploaded instanceof File && uploaded.size > 0 ? uploaded : null;
  if ((id && !uuid.test(id)) ||
    eligibleProductIds.length === 0 || eligibleProductIds.length > 100 ||
    eligibleProductIds.some(value=>!uuid.test(value)) ||
    title.length < 2 || title.length > 180 || description.length > 4000 || !/^[a-z][a-z0-9_]{1,29}$/.test(category)) {
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
  const {data:allowedType,error:typeError}=await db.from("commerce_v2_material_types")
    .select("code,is_active").eq("code",category).maybeSingle();
  if(typeError||!allowedType)return back("erro","tipo");
  const {data:allowedProducts,error:allowedError} = await db.from("commerce_v2_products")
    .select("id").in("id",eligibleProductIds).eq("status","draft");
  if(allowedError || (allowedProducts??[]).length!==eligibleProductIds.length)
    return back("erro","produto");

  const existingResult = id ? await db.from("commerce_v2_materials")
    .select("id,product_id,storage_path").eq("id", id).eq("is_archived", false).maybeSingle() : null;
  if(!allowedType.is_active){
    if(!id)return back("erro","tipo");
    const {data:existingType,error:existingTypeError}=await db.from("commerce_v2_materials")
      .select("category").eq("id",id).maybeSingle();
    if(existingTypeError||existingType?.category!==category)return back("erro","tipo");
  }
  if (id && (existingResult?.error || !existingResult?.data))
    return back("erro", "material");

  // O campo product_id permanece no banco por compatibilidade com o acervo existente.
  // Na criação, é derivado de um produto selecionado. Na edição, preserva-se o valor
  // original, sem exigir um segundo vínculo visível e redundante no formulário.
  const productId = existingResult?.data?.product_id ?? eligibleProductIds[0];

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
    title, description, category, available_to_student: availableToStudent, updated_by: userId,
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

  const materialId = result.data.id as string;
  // Atualizar os produtos permitidos sem duplicar o material ou o arquivo.
  // Gravar novos vínculos primeiro; manter os anteriores em caso de erro.
  const {error:eligibleError}=await db.from("commerce_v2_material_product_eligibility")
    .upsert(eligibleProductIds.map(linkedId=>({material_id:materialId,product_id:linkedId})),
      {onConflict:"material_id,product_id",ignoreDuplicates:true});
  if(eligibleError){
    console.error("Commerce V2 eligibility:",eligibleError.code);
    return back("erro","salvar");
  }
  const {data:previousLinks,error:previousLinksError}=await db.from("commerce_v2_material_product_eligibility")
    .select("product_id").eq("material_id",materialId);
  if(previousLinksError)return back("erro","salvar");
  const removed=(previousLinks??[]).map(link=>link.product_id)
    .filter(linkedId=>!eligibleProductIds.includes(linkedId));
  if(removed.length){
    // Não manter programações para produtos que perderam a elegibilidade.
    const {error:removeSchedulesError}=await db.from("commerce_v2_product_materials")
      .delete().eq("material_id",materialId).in("product_id",removed);
    if(removeSchedulesError){
      console.error("Commerce V2 schedules:",removeSchedulesError.code);
      return back("erro","salvar");
    }
    const {error:removeLinksError}=await db.from("commerce_v2_material_product_eligibility")
      .delete().eq("material_id",materialId).in("product_id",removed);
    if(removeLinksError)return back("erro","salvar");
  }

  const previousPath = existingResult?.data?.storage_path;
  if (path && previousPath && previousPath !== path) {
    const { error } = await db.storage.from(bucket).remove([previousPath]);
    if (error) console.error("Commerce V2 cleanup:", error.message);
  }

  const params = new URLSearchParams({ produto: productId, salvo: "1" });
  return new NextResponse(null, { status: 303, headers: { Location: base + "?" + params.toString(), "Cache-Control": "no-store" } });
}
