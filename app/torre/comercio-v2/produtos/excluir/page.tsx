// app/torre/comercio-v2/produtos/excluir/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { deleteCommerceV2Product } from "../actions";
import css from "../../commercial.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Excluir Produto | Área Comercial" };
export default async function DeleteProductPage({ searchParams }: {
  searchParams: Promise<{ produto?: string }>
}) {
  await requireAdmin();
  const q=await searchParams;
  const db=getSupabaseAdmin();
  const { data: product, error }=q.produto
    ? await db.from("commerce_v2_products").select("id,code,name,status")
      .eq("id",q.produto).maybeSingle()
    : {data:null,error:null};
  return <main className={css.page}>
    <header className={css.header}>
      <div><p className={css.eyebrow}>TORRE · ÁREA COMERCIAL</p>
      <h1 className={css.title}>Excluir produto</h1></div>
      <Link className={css.secondary} href="/torre/comercio-v2/produtos">Voltar à lista</Link>
    </header>
    {error || !product
      ? <p role="alert" className={css.error}>Produto não encontrado. Nenhum dado foi alterado.</p>
      : <section className={css.section}>
        <h2>{product.name}</h2>
        <p><strong>Código interno:</strong> {product.code}</p>
        <p>Esta ação só será permitida se o produto ainda for um rascunho sem materiais,
          ofertas, páginas, entregas ou vínculos com vendas. O sistema verificará esses vínculos
          antes de excluir; não removerá arquivos ou registros associados.</p>
        <form action={deleteCommerceV2Product} className={css.form}>
          <input type="hidden" name="id" value={product.id}/>
          <label style={{display:"flex",alignItems:"center",gap:10}}>
            <input type="checkbox" required name="confirm" value="yes" style={{width:18,height:18}}/>
            Confirmo que desejo excluir este produto sem vínculos.
          </label>
          <div className={css.actions}>
            <button type="submit" disabled={product.status!=="draft"}>Excluir produto</button>
            <Link className={css.secondary} href="/torre/comercio-v2/produtos">Cancelar</Link>
          </div>
        </form>
      </section>}
  </main>;
}
