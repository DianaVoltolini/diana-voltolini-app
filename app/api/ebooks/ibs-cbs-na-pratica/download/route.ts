// app/api/ebooks/ibs-cbs-na-pratica/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ebookAccessActive, ebookAccessUntil } from "@/lib/ebooks/access";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The uploaded Storage screenshot shows a bucket URL ending in "digital-products%203.".
 // Keep both exact known names to accommodate the actual uploaded bucket,
 // without granting public access to either location.
const BUCKETS = ["digital-products", "digital-products 3."] as const;
const OBJECT_PATH = "ebooks/ibs-cbs-na-pratica/Ebook_IBS_CBS_na_Pratica_Diana_Voltolini.pdf";
const PRODUCT_CODE = "EBOOK-IBSCBS-001";

function denied(status: number) {
  return NextResponse.json(
    { error: status === 401 ? "Entre na Área do Cliente para acessar o e-book." : "Download não autorizado." },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
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
      .from("orders").select("paid_at,created_at")
      .eq("user_id", userId)
      .eq("product_id", product.id)
      .eq("status", "paid")
      .limit(1);
    if (orderError) throw orderError;
    if (!orders?.length) return denied(403);
    const expiresAt = ebookAccessUntil(orders);
    if (!ebookAccessActive(expiresAt)) return NextResponse.json({error:"O período de acesso ao seu e-book foi encerrado."},{status:403,headers:{"Cache-Control":"no-store"}});
    const isDownload = request.nextUrl.searchParams.get("mode") !== "view";

    // Prefere sempre a versão publicada na Torre, inclusive para compradores antigos.
    // Enquanto não houver publicação, mantém a entrega existente sem interrupção.
    const { data: configured, error: deliveryError } = await admin.from("product_deliveries")
      .select("material_name,storage_bucket,storage_path,version")
      .eq("product_id", product.id).maybeSingle();
    if (deliveryError) throw deliveryError;
    if (configured?.storage_bucket && configured.storage_path && configured.version > 0) {
      const safeName=(configured.material_name || "ebook-ibs-cbs").replace(/[^a-zA-Z0-9À-ÿ _.-]/g,"").trim().slice(0,100) + ".pdf";
      const {data:updated,error:updatedError}=await admin.storage.from(configured.storage_bucket)
        .createSignedUrl(configured.storage_path,60,{download:isDownload ? safeName : undefined});
      if(updatedError || !updated?.signedUrl) {
        console.error("Arquivo atualizado indisponível:",updatedError);
        return NextResponse.json({error:"A versão atual do material está temporariamente indisponível."},
          {status:503,headers:{"Cache-Control":"no-store"}});
      }
      return NextResponse.redirect(updated.signedUrl,{status:303,headers:{
        "Cache-Control":"no-store, private","Referrer-Policy":"no-referrer"
      }});
    }

    for (const bucket of BUCKETS) {
      const { data, error: storageError } = await admin.storage.from(bucket)
        .createSignedUrl(OBJECT_PATH, 60, {
          download: isDownload ? "Ebook_IBS_CBS_na_Pratica_Diana_Voltolini.pdf" : undefined,
        });
      if (!storageError && data?.signedUrl) {
        return NextResponse.redirect(data.signedUrl, {
          status: 303,
          headers: { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer" },
        });
      }
      // Only log server-side diagnostics; do not expose storage details to customers.
      console.error("Falha na assinatura do arquivo privado do e-book:", {
        bucket, path: OBJECT_PATH, code: storageError?.name, message: storageError?.message,
      });
    }

    return NextResponse.json(
      { error: "O arquivo está temporariamente indisponível." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Falha ao validar direito de acesso ao e-book:", error);
    return NextResponse.json({ error: "Não foi possível verificar o acesso ao e-book." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
