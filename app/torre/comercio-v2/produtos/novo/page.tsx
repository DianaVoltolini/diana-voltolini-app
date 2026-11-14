// app/torre/comercio-v2/produtos/novo/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { saveCommerceV2Product } from "../actions";
import css from "../../commercial.module.css";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Cadastrar Produto | Área Comercial"};
const types: Record<string, string> = { ebook: "E-book", online_event: "Encontro online", course: "Curso", service: "Serviço", other: "Outro" };
const messages: Record<string,string> = {
  validacao: "Verifique os campos obrigatórios e o tamanho dos textos.",
  url: "O link da página deve usar HTTPS. Verifique o endereço informado.",
  codigo: "Código inválido.",
  codigo_vinculado: "Este produto já está vinculado às vendas ou entregas. Não é seguro alterar seu código.",
  codigo_consulta: "Não foi possível conferir os vínculos do código. Nenhuma alteração foi realizada.",
  indisponivel: "Não foi possível localizar este produto para edição.",
  salvar: "Não foi possível salvar as alterações. Tente novamente.",
  duplicado: "Já existe um produto cadastrado com esse código.",
};
export default async function ProductEditor({searchParams}:{searchParams:Promise<{editar?:string;erro?:string}>}){
  await requireAdmin();
  const q=await searchParams,db=getSupabaseAdmin();
  const result=q.editar?await db.from("commerce_v2_products")
    .select("id,code,name,product_type,description,delivery_description,sales_page_url")
    .eq("id",q.editar).maybeSingle():null;
  const product=result?.data;
  return <main className={css.page}>
    <header className={css.header}><div><p className={css.eyebrow}>TORRE · ÁREA COMERCIAL · PRODUTOS</p>
      <h1 className={css.title}>{product?"Editar produto":"Cadastrar Produto"}</h1>
      <p className={css.subtitle}>Primeiro cadastre o produto. Depois selecione os materiais na Biblioteca.</p>
    </div><Link className={css.secondary} href="/torre/comercio-v2/produtos">Voltar aos produtos</Link></header>
    {q.erro&&<p role="alert" className={css.error}>{messages[q.erro]??"Não foi possível salvar o produto."}</p>}
    {result?.error&&<p role="alert" className={css.error}>Falha ao consultar o produto. Nenhuma alteração foi realizada.</p>}
    {q.editar&&!product&&!result?.error&&<p className={css.error}>Produto não encontrado. Nenhuma alteração foi realizada.</p>}
    {(!q.editar||product)&&<section className={css.section}>
      <form action={saveCommerceV2Product} className={`${css.form} ${css.formWide}`}>
        <input type="hidden" name="id" value={product?.id??""}/>
        <div className={css.formRowTriple}>
          <label>Tipo de produto<select name="product_type" defaultValue={product?.product_type??"online_event"}>
            {Object.entries(types).map(([key,label])=><option key={key} value={key}>{label}</option>)}
          </select></label>
          <label>Código interno<input name="code" required maxLength={60} minLength={3} pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,59}" placeholder="EX: ENC-RT-2027-001" defaultValue={product?.code??""}/></label>
          <label>Nome do produto<input name="name" required minLength={3} maxLength={180} placeholder="Nome do produto" defaultValue={product?.name??""}/></label>
        </div>
        <label>Descrição<textarea name="description" rows={5} maxLength={8000} defaultValue={product?.description??""}/></label>
        <label>O que será entregue<textarea name="delivery_description" rows={3} maxLength={4000} defaultValue={product?.delivery_description??""} placeholder="Ex.: e-book, aula ao vivo e exercícios. A seleção de arquivos é feita na Biblioteca."/></label>
        <label>Link da página (referência)<input name="sales_page_url" type="url" maxLength={500} placeholder="https://..." defaultValue={product?.sales_page_url??""}/></label>
        <p className={css.note}>O código pode ser alterado enquanto não houver vínculo com o catálogo de vendas. O cadastro não ativa entregas nem modifica o checkout.</p>
        <div className={css.actions}><button type="submit">Salvar produto</button><Link className={css.secondary} href="/torre/comercio-v2/produtos">Cancelar</Link></div>
      </form>
    </section>}
  </main>;
}
