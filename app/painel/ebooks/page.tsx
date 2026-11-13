// app/painel/ebooks/page.tsx
import type { Metadata } from "next";
import ProductPage from "../product-page";
import ProductOffer from "../product-offer";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ebookAccessDateLabel, ebookAccessUntil, ebookAccessActive } from "@/lib/ebooks/access";
import { EBOOK_PRODUCT_CODE, getEbookPurchaseAccess } from "@/lib/ebooks/purchase-access";
import { getStudentMaterialsForOrder } from "@/lib/commerce-v2/student-delivery";

export const metadata: Metadata = {
  title: "Meus E-books | Diana Voltolini",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
type Book={id:string;code:string;name:string};
type BookOrder={id:string;product_id:string;paid_at:string;created_at:string};

export default async function EbooksPage() {
  const auth = await createClient();
  const { data: claims, error: authError } = await auth.auth.getClaims();
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  if (authError || !userId) redirect("/login?retorno=%2Fpainel%2Febooks");

  // Reaproveita a verificação da identidade e o vínculo de compras sem dono.
  await getEbookPurchaseAccess(userId);
  const db=getSupabaseAdmin();
  const {data:products,error:productsError}=await db.from("products")
    .select("id,code,name").like("code","EBOOK-%");
  if(productsError) throw new Error("Não foi possível consultar o catálogo de e-books.");
  const catalog=(products??[]) as Book[];
  const productIds=catalog.map(item=>item.id);
  const {data:orders,error:ordersError}=productIds.length
    ? await db.from("orders")
      .select("id,product_id,paid_at,created_at").eq("user_id",userId)
      .in("product_id",productIds).eq("status","paid")
      .not("paid_at","is",null).order("paid_at",{ascending:false}).limit(200)
    : {data:[] as BookOrder[],error:null};
  if(ordersError) throw new Error("Não foi possível verificar seus e-books.");
  const bought=(orders??[]) as BookOrder[];
  const ownedBooks=catalog.filter(product=>bought.some(order=>order.product_id===product.id));
  const byProduct=new Map(await Promise.all(ownedBooks.map(async book=>{
    const order=bought.find(item=>item.product_id===book.id);
    return [book.id,order?await getStudentMaterialsForOrder(order):[]] as const;
  })));

  if(!ownedBooks.length) return (
    <ProductPage title="IBS e CBS na Prática" description="E-book digital para compreender a Reforma Tributária e aplicar o conhecimento ao faturamento.">
      <ProductOffer eyebrow="GUIA PRÁTICO · REFORMA TRIBUTÁRIA"
        headline="Entenda IBS e CBS na prática"
        lead="Compras, vendas, créditos e notas fiscais explicadas de forma simples e objetiva, com exemplos e roteiro para organizar sua preparação."
        price="R$ 29,90 · pagamento único"
        checkout="https://dianavoltolini.com.br/checkout/ibs-cbs-na-pratica"
        cta="Quero garantir meu e-book"
        features={["E-book digital com 21 páginas","Compras, vendas e créditos","NF-e, CST e cClassTrib","Split payment e transição","Checklist e glossário para consulta","Exemplos práticos para rotinas fiscais"]}/>
    </ProductPage>
  );

  return (
    <ProductPage title="Meus E-books" description="Os e-books adquiridos, organizados individualmente para download durante o prazo de acesso.">
      <div style={{display:"grid",gap:22}}>
        {ownedBooks.map(book=>{
          const expiresAt=ebookAccessUntil(bought.filter(order=>order.product_id===book.id));
          const active=ebookAccessActive(expiresAt);
          const isIbsCbs=book.code===EBOOK_PRODUCT_CODE;
          const planned=byProduct.get(book.id)??[];
          const newEbookReady=planned.some(item=>item.category==="ebook"&&item.isReleased);
          return <section key={book.id} style={{border:"1px solid #e1e7ed",borderTop:"4px solid #c9a227",borderRadius:9,background:"#fff",padding:"32px"}}>
            <p style={{color:"#9f7d17",fontSize:12,fontWeight:800,letterSpacing:1.5}}>E-BOOK DIGITAL</p>
            <h2 style={{fontFamily:"Georgia,serif",fontSize:27,margin:"0 0 16px"}}>{isIbsCbs?"IBS e CBS na Prática":book.name}</h2>
            {isIbsCbs&&<p>Guia de 21 páginas sobre IBS, CBS, compras, vendas, créditos e emissão de notas fiscais.</p>}
            <p style={{fontWeight:700,color:"#167241"}}>Pagamento confirmado</p>
            <p>Seu acesso ao e-book termina em <strong>{expiresAt?ebookAccessDateLabel(expiresAt):"data indisponível"}</strong>.</p>
            <p>Durante o período de acesso, você pode baixar a versão mais recente do material, incluindo eventuais atualizações sem custo adicional.</p>
            {active&&isIbsCbs&&!newEbookReady?
              <a href="/api/ebooks/ibs-cbs-na-pratica/download"
                style={{display:"inline-block",background:"#c9a227",color:"#0d1b2a",padding:"12px 20px",borderRadius:5,fontWeight:700}}>
                Baixar e-book (PDF) ↓
              </a>:
              !active||(!newEbookReady&&planned.length===0)?<p style={{fontWeight:700,color:"#765b2b"}}>
                {!active?"O período de acesso ao seu e-book foi encerrado.":"O arquivo deste e-book será disponibilizado conforme as informações da compra."}
              </p>:null}
            {planned.length>0&&<div style={{display:"grid",gap:12,marginTop:20}}>
              {planned.map(material=><div key={material.id} style={{
                border:"1px solid #e1e7ed",padding:18,borderRadius:8,background:"#fff"
              }}>
                <strong>{material.title}</strong>
                {material.isReleased?
                  <p><a href={`/api/commerce-v2/materials/${material.id}/download?pedido=${bought.find(order=>order.product_id===book.id)?.id}`}
                    style={{display:"inline-block",background:"#c9a227",color:"#102033",padding:"12px 20px",borderRadius:6,fontWeight:800,marginTop:12}}>
                    Baixar material ↓
                  </a></p>:
                  <p>{!active?"Prazo de acesso encerrado.":material.releaseDate?
                    "Disponível a partir de "+material.releaseDate.split("-").reverse().join("/"):"Aguardando liberação."}</p>}
              </div>)}
            </div>}
          </section>;
        })}
      </div>
    </ProductPage>
  );
}
