// app/painel/ebooks/page.tsx
import type { Metadata } from "next";
import ProductPage from "../product-page";
import ProductOffer from "../product-offer";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ebookAccessDateLabel } from "@/lib/ebooks/access";
import { getEbookPurchaseAccess } from "@/lib/ebooks/purchase-access";

export const metadata: Metadata = {
  title: "Meus E-books | Diana Voltolini",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";


export default async function EbooksPage() {
  const auth = await createClient();
  const { data: claims, error: authError } = await auth.auth.getClaims();
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  if (authError || !userId) redirect("/login?retorno=%2Fpainel%2Febooks");

  const access = await getEbookPurchaseAccess(userId);
  const { hasDirectEbookOrder, directEbookExpiresAt, directEbookActive } = access;
  if(!hasDirectEbookOrder) return <ProductPage title="IBS e CBS na Prática" description="E-book digital para compreender a Reforma Tributária e aplicar o conhecimento ao faturamento.">
    <ProductOffer eyebrow="GUIA PRÁTICO · REFORMA TRIBUTÁRIA" headline="Entenda IBS e CBS na prática" lead="Compras, vendas, créditos e notas fiscais explicados de forma simples e objetiva, com exemplos e roteiro para organizar sua preparação." price="R$ 29,90 · pagamento único" checkout="https://dianavoltolini.com.br/checkout/ibs-cbs-na-pratica" cta="Quero garantir meu e-book" features={["E-book digital com 21 páginas","Compras, vendas e créditos","NF-e, CST e cClassTrib","Split payment e transição","Checklist e glossário para consulta","Exemplos práticos para rotinas fiscais"]}>

    </ProductOffer>
  </ProductPage>;
  return (
    <ProductPage title="Meus E-books" description="Seus materiais digitais e o acesso às compras realizadas.">
        <section style={{ border: "1px solid #e1e7ed", borderTop: "4px solid #c9a227", borderRadius: 9, background: "#fff", padding: "32px" }}>
          <p style={{ color: "#9f7d17", fontSize: 12, fontWeight: 800, letterSpacing: 1.5 }}>E-BOOK DIGITAL</p>
          <h2 style={{ fontFamily: "Georgia,serif", fontSize: 27, margin: "0 0 16px" }}>IBS e CBS na Prática</h2>
          <p>Guia de 21 páginas sobre IBS, CBS, compras, vendas, créditos e emissão de notas fiscais.</p>
          {hasDirectEbookOrder ? (
            <>
              <p style={{ fontWeight: 700, color: "#167241" }}>Pagamento confirmado</p>
              <p>Seu acesso ao e-book termina em <strong>{directEbookExpiresAt ? ebookAccessDateLabel(directEbookExpiresAt) : "data indisponível"}</strong>.</p>
              <p>Durante os 90 dias após o pagamento, você pode visualizar e baixar a versão mais recente, incluindo eventuais atualizações sem custo adicional.</p>
              {directEbookActive ? <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:12}}>
                <a href="/api/ebooks/ibs-cbs-na-pratica/download"
                  style={{display:"inline-block",background:"#c9a227",color:"#0d1b2a",padding:"12px 20px",borderRadius:5,fontWeight:700}}>Baixar e-book (PDF) ↓</a>
              </div> : <p style={{fontWeight:700,color:"#765b2b"}}>O período de acesso ao seu e-book foi encerrado.</p>}
            </>
          ) : (
            <>
              <p style={{color:"#586a7c",lineHeight:1.75}}>Um guia direto para compreender os principais conceitos do IBS e da CBS e seus impactos nas operações de compras, vendas e emissão de notas fiscais.</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,margin:"20px 0"}}>
               {["Fundamentos do IBS e da CBS","Compras, vendas e créditos","Emissão de notas fiscais","Glossário de termos práticos"].map(item=><div key={item} style={{background:"#f4f6f8",borderRadius:8,padding:15,color:"#243549",fontWeight:700,fontSize:13}}>{item}</div>)}
              </div>
              <p style={{fontSize:23,fontWeight:850,color:"#102033"}}>R$ 29,90</p>
              <a href="https://dianavoltolini.com.br/checkout/ebook-ibs-cbs" style={{display:"inline-block",marginTop:12,background:"#c9a227",color:"#0d1b2a",padding:"13px 20px",borderRadius:8,fontWeight:800,textDecoration:"none"}}>Adquirir meu e-book →</a>
              <p style={{fontSize:12,color:"#65717e",marginTop:12}}>O pagamento é finalizado pelo checkout seguro do site. Após a confirmação, o e-book ficará disponível nesta mesma Área do Cliente.</p>
            </>
          )}
        </section>
    </ProductPage>
  );
}
