// app/api/ebooks/ibs-cbs-na-pratica/download/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "digital-products";
const OBJECT_PATH = "ebooks/ibs-cbs-na-pratica/Ebook_IBS_CBS_na_Pratica_Diana_Voltolini.pdf";
const PRODUCT_CODE = "EBOOK-IBSCBS-001";

function denied(status: number) {
  return NextResponse.json(
    { error: status === 401 ? "Entre na Área do Cliente para acessar o e-book." : "Download não autorizado." },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  const client = await createClient();
  const { data: claims, error: authError } = await client.auth.getClaims();
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  if (authError || !userId) return denied(401);

  try {
    const admin = getSupabaseAdmin();
    const { data: product, error: productError } = await admin
      .from("products").select("id").eq("code", PRODUCT_CODE).eq("active", true).maybeSingle();
    if (productError) throw productError;
    if (!product) return denied(403);

    const { data: orders, error: orderError } = await admin
      .from("orders").select("id")
      .eq("user_id", userId)
      .eq("product_id", product.id)
      .eq("status", "paid")
      .limit(1);
    if (orderError) throw orderError;
    if (!orders?.length) return denied(403);

    const { data, error: storageError } = await admin.storage.from(BUCKET)
      .createSignedUrl(OBJECT_PATH, 60, {
        download: "Ebook_IBS_CBS_na_Pratica_Diana_Voltolini.pdf",
      });
    if (storageError || !data?.signedUrl) {
      console.error("Erro no download protegido do e-book:", storageError);
      return NextResponse.json({ error: "O arquivo está temporariamente indisponível." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.redirect(data.signedUrl, {
      status: 303,
      headers: { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer" },
    });
  } catch (error) {
    console.error("Falha ao validar direito de acesso ao e-book:", error);
    return NextResponse.json({ error: "Não foi possível verificar o acesso ao e-book." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
