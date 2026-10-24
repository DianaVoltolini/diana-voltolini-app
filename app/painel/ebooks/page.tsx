// app/painel/ebooks/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { logout } from "../actions";
import ProductPage from "../product-page";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Meus E-books | Diana Voltolini",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const PRODUCT_CODE = "EBOOK-IBSCBS-001";
const PAGE_URL = "https://dianavoltolini.com.br/ibs-cbs-na-pratica";

export default async function EbooksPage() {
  const auth = await createClient();
  const { data: claims, error: authError } = await auth.auth.getClaims();
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  if (authError || !userId) redirect("/login?retorno=%2Fpainel%2Febooks");

  const admin = getSupabaseAdmin();
  const { data: product, error: productError } = await admin.from("products")
    .select("id, name").eq("code", PRODUCT_CODE).eq("active", true).maybeSingle();
  if (productError) throw new Error("Não foi possível verificar o e-book.");

  let hasPaidOrder = false;
  if (product) {
    const { data: orders, error: orderError } = await admin.from("orders")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", product.id)
      .eq("status", "paid")
      .limit(1);
    if (orderError) throw new Error("Não foi possível verificar sua compra.");
    hasPaidOrder = Boolean(orders?.length);
  }

  return (
    <ProductPage title="Meus E-books" description="Seus materiais digitais e o acesso às compras realizadas.">
        <section style={{ border: "1px solid #e1e7ed", borderTop: "4px solid #c9a227", borderRadius: 9, background: "#fff", padding: "32px" }}>
          <p style={{ color: "#9f7d17", fontSize: 12, fontWeight: 800, letterSpacing: 1.5 }}>E-BOOK DIGITAL</p>
          <h2 style={{ fontFamily: "Georgia,serif", fontSize: 27, margin: "0 0 16px" }}>IBS e CBS na Prática</h2>
          <p>Guia de 21 páginas sobre IBS, CBS, compras, vendas, créditos e emissão de notas fiscais.</p>
          {hasPaidOrder ? (
            <>
              <p style={{ fontWeight: 700, color: "#167241" }}>Pagamento confirmado</p>
              <p>Seu e-book está disponível para download.</p>
              <a href="/api/ebooks/ibs-cbs-na-pratica/download"
                style={{ display: "inline-block", marginTop: 12, background: "#c9a227", color: "#0d1b2a", padding: "12px 20px", borderRadius: 5, fontWeight: 700 }}>
                Baixar e-book (PDF) ↓
              </a>
            </>
          ) : (
            <>
              <p style={{ color: "#65717e" }}>Nenhuma compra confirmada deste material foi encontrada nesta conta.</p>
              <a href={PAGE_URL} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-block", marginTop: 12, background: "#c9a227", color: "#0d1b2a", padding: "12px 20px", borderRadius: 5, fontWeight: 700 }}>
                Conhecer o e-book ↗
              </a>
            </>
          )}
        </section>
    </ProductPage>
  );
}
