// app/torre/comercio-v2/paginas/previa/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import css from "../../../commercial.module.css";
import styles from "../../pages.module.css";

export const dynamic="force-dynamic";
export const metadata: Metadata = { title:"Prévia restrita | Área Comercial", robots:{index:false,follow:false} };
type Context={params:Promise<{id:string}>};
type Page={
 id:string; product_id:string; offer_id:string; title:string; eyebrow:string|null;
 headline:string; subtitle:string|null; benefits:string|null; audience:string|null;
 details:string|null; faq:string|null; cta_label:string; template:string; status:string;
};
type Offer={name:string;regular_price_cents:number;promotional_price_cents:number|null;promo_starts_on:string|null;promo_ends_on:string|null};
const brl=(v:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v/100);
export default async function PagePreview({params}:Context){
 await requireAdmin();
 const {id}=await params;
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
 if(!uuid.test(id))notFound();
 const db=getSupabaseAdmin();
 const {data,error}=await db.from("commerce_v2_pages").select("id,product_id,offer_id,title,eyebrow,headline,subtitle,benefits,audience,details,faq,cta_label,template,status").eq("id",id).eq("status","draft").maybeSingle();
 if(error||!data)notFound();
 const page=data as Page;
 const [productResult,offerResult]=await Promise.all([
  db.from("commerce_v2_products").select("name").eq("id",page.product_id).maybeSingle(),
  db.from("commerce_v2_offers").select("name,regular_price_cents,promotional_price_cents,promo_starts_on,promo_ends_on").eq("id",page.offer_id).maybeSingle(),
 ]);
 const offer=offerResult.data as Offer|null;
 if(productResult.error||offerResult.error||!offer)notFound();
 const now=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const promo=Boolean(offer.promotional_price_cents!==null&&offer.promo_starts_on&&offer.promo_ends_on&&now>=offer.promo_starts_on&&now<=offer.promo_ends_on);
 const price=promo?offer.promotional_price_cents!:offer.regular_price_cents;
 return <main className={css.page}>
  <header className={css.header}>
   <div><p className={css.eyebrow}>ÁREA COMERCIAL · PRÉVIA ADMINISTRATIVA</p>
    <h1 className={css.title}>Pré-visualização</h1>
    <p className={css.subtitle}>Simulação visual. Não é uma página publicada nem possui botão de compra.</p>
   </div>
   <div className={css.actions}>
    <Link className={css.secondary} href={"/torre/comercio-v2/paginas/novo?editar="+encodeURIComponent(id)}>Editar</Link>
    <Link className={css.secondary} href="/torre/comercio-v2/paginas">Voltar à lista</Link>
   </div>
  </header>
  <div className={css.banner}><strong>Rascunho privado</strong>Este endereço exige acesso administrativo. Nenhum comprador pode acessar ou pagar por esta prévia.</div>
  <section className={styles.preview} aria-label="Prévia da página comercial">
   <div className={styles.previewHero}>
    <small>{page.eyebrow||"APRESENTAÇÃO DO PRODUTO"}</small>
    <h2>{page.headline}</h2>
    {page.subtitle&&<p>{page.subtitle}</p>}
    <span className={styles.previewCta} aria-disabled="true">{page.cta_label} · indisponível</span>
   </div>
   <article className={styles.previewCard}>
    <h3>{productResult.data?.name??page.title}</h3>
    <p>Oferta: {offer.name}</p>
    {promo&&<p>Valor normal: <s>{brl(offer.regular_price_cents)}</s></p>}
    <p className={styles.price}>{brl(price)}</p>
    <p className={css.note}>Preço apenas ilustrativo nesta prévia; nenhuma cobrança habilitada.</p>
   </article>
   {([
    ["O que está incluído",page.benefits],
    ["Para quem é",page.audience],
    ["Informações importantes",page.details],
    ["Perguntas frequentes",page.faq],
   ] as const).filter(([,body])=>Boolean(body)).map(([heading,body])=>
    <article className={styles.previewCard} key={heading}><h3>{heading}</h3><div>{body}</div></article>
   )}
  </section>
 </main>;
}
