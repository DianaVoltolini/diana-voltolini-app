// app/torre/comercio-v2/materiais/arquivo/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
const idPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export async function GET(request: NextRequest, { params }: Context) {
  await requireAdmin();
  const { id } = await params;
  if (!idPattern.test(id)) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("commerce_v2_materials")
    .select("storage_path,original_filename,file_mime,is_archived")
    .eq("id", id).eq("is_archived", false).maybeSingle();
  if (error) return NextResponse.json({ error: "Falha ao consultar material." }, { status: 503 });
  if (!data?.storage_path || !data.original_filename) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }
  const requestedView = request.nextUrl.searchParams.get("modo") === "visualizar";
  const safeInline = ["application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain"]
    .includes(data.file_mime ?? "");
  const { data: signed, error: signedError } = await db.storage
    .from("commerce-v2-materials")
    .createSignedUrl(data.storage_path, 60, {
      download: requestedView && safeInline ? undefined : data.original_filename,
    });
  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: "Arquivo temporariamente indisponível." }, { status: 503 });
  }
  return NextResponse.redirect(signed.signedUrl, {
    status: 303,
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
}
