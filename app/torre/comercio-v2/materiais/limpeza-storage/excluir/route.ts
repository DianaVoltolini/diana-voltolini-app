// app/torre/comercio-v2/materiais/limpeza-storage/excluir/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { auditStorage, BUCKET, validMaterialPath } from "../audit";

export const runtime = "nodejs";
const BASE = "/torre/comercio-v2/materiais/limpeza-storage";

function back(request: NextRequest, key: string, value: string) {
  const url = new URL(BASE, request.url);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  // Rota administrativa com validação explícita de origem antes de processar a ação.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  try {
    const source = new URL(origin ?? "");
    if (!host || source.host.toLowerCase() !== host.toLowerCase() ||
        !["http:", "https:"].includes(source.protocol)) {
      return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }

  await requireAdmin();
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return back(request, "erro", "selecao");
  }
  if (form.get("confirm") !== "EXCLUIR TESTES") {
    return back(request, "erro", "confirmacao");
  }
  const paths = [...new Set(form.getAll("paths").map(String))];
  if (!paths.length || paths.length > 100 || paths.some(p => !validMaterialPath(p))) {
    return back(request, "erro", "selecao");
  }

  try {
    // Não confiar nos caminhos enviados pelo formulário: refazer a auditoria.
    const report = await auditStorage();
    const allowed = new Set(report.orphanPaths);
    if (paths.some(p => !allowed.has(p))) {
      return back(request, "erro", "alterado");
    }
    const db = getSupabaseAdmin();
    const { data: existing, error: dbError } = await db.from("commerce_v2_materials")
      .select("storage_path").in("storage_path", paths);
    if (dbError || !existing || existing.length) {
      return back(request, "erro", "referencia");
    }

    // Uma última consulta da lista confirma que todos os arquivos continuam órfãos.
    const secondAudit = await auditStorage();
    const secondAllowed = new Set(secondAudit.orphanPaths);
    if (paths.some(p => !secondAllowed.has(p))) {
      return back(request, "erro", "alterado");
    }

    const { data, error } = await db.storage.from(BUCKET).remove(paths);
    if (error) {
      console.error("[commerce-v2-storage-cleanup] Storage error", error.message);
      return back(request, "erro", "exclusao");
    }
    return back(request, "excluidos", String(data?.length ?? 0));
  } catch (error) {
    console.error("[commerce-v2-storage-cleanup] Unexpected error", error);
    return back(request, "erro", "auditoria");
  }
}
