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

export default async function EbooksPage({searchParams}:{searchParams:Promise<{consulta?:string}>}) {
  const {consulta}=await searchParams;
  const auth = await createClient();
  const { data: claims, error: authError } = await auth.auth.getClaims();
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  if (authError || !userId) redirect("/login?retorno=%2Fpainel%2Febooks");

  // Reaproveita a verificação da identidade e o vínculo de compras sem dono.
  await getEbookPurchaseAccess(userId);

  const {data:verified,error:identityError}=await auth.auth.getUser();
  if(identityError||verified.user?.id!==userId||!verified.user.email)
    redirect("/login?retorno=%2Fpainel%2Febooks");
  const verifiedEmail=verified.user.email.trim().toLowerCase();

  async function verifyPendingPayment(formData:FormData) {
    "use server";
    const orderId=String(formData.get("orderId")??"").trim();
    if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(orderId))
      redirect("/painel/ebooks?consulta=erro");
    const client=await createClient();
    const {data:identity,error:identityError}=await client.auth.getUser();
    if(identityError||!identity.user?.email)redirect("/login?retorno=%2Fpainel%2Febooks");
    const {data:session}=await client.auth.getSession();
    const jwt=session.session?.access_token;
    if(!jwt)redirect("/login?retorno=%2Fpainel%2Febooks");
    const db=getSupabaseAdmin();
    const {data:order,error:orderError}=await db.from("orders")
      .select("id,customer_email,user_id,status,product_id").eq("id",orderId).maybeSingle();
    const {data:product,error:productError}=await db.from("products")
      .select("id").eq("code",EBOOK_PRODUCT_CODE).maybeSingle();
    if(orderError||productError||!order||!product||order.product_id!==product.id
      ||order.customer_email?.trim().toLowerCase()!==identity.user.email.trim().toLowerCase()
      ||(order.user_id&&order.user_id!==identity.user.id))
      redirect("/painel/ebooks?consulta=erro");
    if(order.status==="paid")redirect("/painel/ebooks?consulta=pago");
    if(order.status!=="pending")redirect("/painel/ebooks?consulta=erro");
    let result="erro";
    try {
      const response=await fetch("https://dianavoltolini.com.br/api/cron/payments/sync",{
        method:"PUT",
        headers:{Authorization:"Bearer "+jwt,"Content-Type":"application/json"},
        body:JSON.stringify({orderId}),cache:"no-store",signal:AbortSignal.timeout(16000),
      });
      const payload=await response.json() as {status?:string};
      result=payload.status==="paid"?"pago":payload.status==="pending"?"pendente":response.status===429?"aguarde":"erro";
    } catch(error) {
      console.error("[ebook-payment-check] Falha",error instanceof Error?error.message:"Falha desconhecida");
    }
    redirect("/painel/ebooks?consulta="+result);
  }

  const db=getSupabaseAdmin();
  const {data:products,error:productsError}=await db.from("products")
    .select("id,code,name").like("code","EBOOK-%");
  if(productsError) throw new Error("Não foi possível consultar o catálogo de e-books.");
  const catalog=(products??[]) as Book[];
  const productIds=catalog.map(item=>item.id);

  const {data:pendingRows,error:pendingError}=productIds.length
    ?await db.from("orders").select("id,product_id,amount_cents,created_at")
      .in("product_id",productIds).ilike("customer_email",verifiedEmail)
      .eq("status","pending").order("created_at",{ascending:false}).limit(10)
    :{data:[],error:null};
  if(pendingError)throw new Error("Não foi possível verificar seus pedidos.");
  const pending=pendingRows??[];

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


  const feedback=consulta==="pago"?"Pagamento confirmado. Seu e-book está disponível abaixo.":
    consulta==="pendente"?"O Bling ainda não confirmou o pagamento. Consulte novamente mais tarde.":
    consulta==="aguarde"?"Aguarde antes de consultar novamente.":consulta==="erro"?"Não foi possível consultar o pagamento neste momento.":null;
  const pendingCard=pending.length>0?<section style={{border:"1px solid #e1e7ed",borderRadius:9,padding:24,background:"#fff",marginBottom:20}}>
    <h2>Pagamento em conferência</h2>
    <p>Você já pode utilizar sua Área do Cliente. O material será liberado após a confirmação do pagamento.</p>
    {pending.map(order=><div key={order.id} style={{borderTop:"1px solid #e1e7ed",paddingTop:12,marginTop:12}}>
      <p><strong>E-book IBS e CBS na Prática</strong> · R$ {(order.amount_cents/100).toFixed(2).replace(".",",")}</p>
      <form action={verifyPendingPayment}>
        <input type="hidden" name="orderId" value={order.id}/>
        <button type="submit" style={{background:"#c9a227",border:0,borderRadius:6,padding:"12px 20px",fontWeight:800,cursor:"pointer"}}>
          Já paguei — verificar pagamento
        </button>
      </form>
      <p style={{fontSize:13}}>A confirmação será consultada diretamente no Bling. Este botão não cria cobranças.</p>
    </div>)}
  </section>:null;

  if(!ownedBooks.length) return (
    <ProductPage title="IBS e CBS na Prática" description="E-book digital para compreender a Reforma Tributária e aplicar o conhecimento ao faturamento.">
      {feedback&&<p role="status">{feedback}</p>}
      {pendingCard}
      {!pending.length&&<ProductOffer eyebrow="GUIA PRÁTICO · REFORMA TRIBUTÁRIA"
        headline="Entenda IBS e CBS na prática"
        lead="Compras, vendas, créditos e notas fiscais explicadas de forma simples e objetiva, com exemplos e roteiro para organizar sua preparação."
        price="R$ 29,90 · pagamento único"
        checkout="https://dianavoltolini.com.br/checkout/ibs-cbs-na-pratica"
        cta="Quero garantir meu e-book"
        features={["E-book digital com 21 páginas","Compras, vendas e créditos","NF-e, CST e cClassTrib","Split payment e transição","Checklist e glossário para consulta","Exemplos práticos para rotinas fiscais"]}/> }
    </ProductPage>
  );

  return (
    <ProductPage title="Meus E-books" description="Os e-books adquiridos, organizados individualmente para download durante o prazo de acesso.">
      {feedback&&<p role="status">{feedback}</p>}
      {pendingCard}
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
