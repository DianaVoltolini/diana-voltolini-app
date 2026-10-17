// app/painel/ebooks/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { logout } from "../actions";
import styles from "../painel.module.css";
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
    <>
      <header className={styles.header}>
        <div className={`container ${styles.headerContent}`}>
          <a href="https://dianavoltolini.com.br" aria-label="Acessar o site Diana Voltolini">
            <Image className={styles.logo} src="/brand/logo-light.png" alt="Diana Voltolini" width={1535} height={538} priority />
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/painel" style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "11px 15px", color: "#0d1b2a", fontWeight: 700, fontSize: 13 }}>Voltar ao painel</Link>
            <form action={logout}><button className={styles.logoutButton} type="submit">Sair</button></form>
          </div>
        </div>
      </header>
      <main style={{ minHeight: "75vh", background: "#f7f9fb", padding: "64px 20px", color: "#0d1b2a" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <p style={{ margin: "36px 0 9px", fontSize: 12, color: "#9f7d17", fontWeight: 800, letterSpacing: 2 }}>ÁREA DO CLIENTE</p>
        <h1 style={{ fontFamily: "Georgia,serif", fontSize: "clamp(32px,5vw,46px)", margin: "0 0 12px" }}>Meus E-books</h1>
        <p style={{ color: "#65717e", marginBottom: 32 }}>Seus materiais digitais e o acesso às compras realizadas.</p>
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
      </div>
      </main>
    </>
  );
}
