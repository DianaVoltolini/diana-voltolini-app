// app/torre/comercio-v2/materiais/arquivo/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const inlineMime = new Set([
  "application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain",
]);
const bucket = "commerce-v2-materials";
const noStore = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: NextRequest, { params }: Context) {
  await requireAdmin();
  const { id } = await params;
  if (!uuid.test(id)) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400, headers: noStore });
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("commerce_v2_materials")
    .select("storage_path,original_filename,file_mime,file_size")
    .eq("id", id).eq("is_archived", false).maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Falha ao consultar material." }, { status: 503, headers: noStore });
  }
  if (!data?.storage_path || !data.original_filename || !data.file_mime) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404, headers: noStore });
  }

  const view = request.nextUrl.searchParams.get("modo") === "visualizar";
  if (view) {
    if (!inlineMime.has(data.file_mime)) {
      return NextResponse.json(
        { error: "Este formato não possui prévia no navegador. Utilize Baixar." },
        { status: 415, headers: noStore },
      );
    }
    // Preview autenticada: obter o arquivo privado e devolvê-lo inline pelo próprio servidor,
    // sem depender dos cabeçalhos Content-Disposition do Storage.
    const { data: file, error: downloadError } = await db.storage.from(bucket).download(data.storage_path);
    if (downloadError || !file) {
      return NextResponse.json({ error: "Não foi possível abrir a prévia." }, { status: 503, headers: noStore });
    }
    const filename = data.original_filename.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 150) || "material";
    return new NextResponse(file, {
      status: 200,
      headers: {
        ...noStore,
        "Content-Type": data.file_mime,
        "Content-Disposition": 'inline; filename="' + filename + '"',
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  }

  // Download usa o link temporário do bucket privado com instrução explícita para baixar.
  const { data: signed, error: signedError } = await db.storage.from(bucket)
    .createSignedUrl(data.storage_path, 60, { download: data.original_filename });
  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: "Arquivo temporariamente indisponível." }, { status: 503, headers: noStore });
  }
  return NextResponse.redirect(signed.signedUrl, {
    status: 303,
    headers: { ...noStore, "Referrer-Policy": "no-referrer" },
  });
}
