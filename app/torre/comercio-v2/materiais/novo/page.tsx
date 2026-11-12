// app/torre/comercio-v2/materiais/novo/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { materialCategories } from "../categories";
import styles from "../materials.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Novo conteúdo | Biblioteca V2" };
type Query = { produto?: string; editar?: string };
type Product = { id: string; code: string; name: string };
type Material = {
  id: string; product_id: string; title: string; category: string;
  description: string; original_filename: string | null; is_archived: boolean;
};
const back = "/torre/comercio-v2/materiais";

export default async function MaterialEditor({ searchParams }: { searchParams: Promise<Query> }) {
  await requireAdmin();
  const query = await searchParams;
  const db = getSupabaseAdmin();
  const [productsResult, materialResult] = await Promise.all([
    db.from("commerce_v2_products").select("id,code,name").order("name").limit(500),
    query.editar
      ? db.from("commerce_v2_materials")
          .select("id,product_id,title,category,description,original_filename,is_archived")
          .eq("id", query.editar).eq("is_archived", false).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const products = (productsResult.data ?? []) as Product[];
  const material = materialResult.data as Material | null;
  const selectedProduct = material?.product_id ??
    (products.some(p => p.id === query.produto) ? query.produto : "");
  const invalidEdit = Boolean(query.editar && (materialResult.error || !material));
  return <main className={styles.page}>
    <div className={styles.editor}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>COMÉRCIO V2 · BIBLIOTECA DE MATERIAIS</p>
          <h1>{material ? "Editar conteúdo" : "Novo conteúdo"}</h1>
          <p>Cadastre o material e o associe ao produto correspondente.</p>
        </div>
        <Link href={back}>Voltar à lista</Link>
      </header>
      {(productsResult.error || materialResult.error) && <p className={styles.error} role="alert">Não foi possível consultar os dados do editor.</p>}
      {invalidEdit && <p className={styles.error} role="alert">Material indisponível para edição. Volte à Biblioteca.</p>}
      {!productsResult.error && !invalidEdit && <form
        className={styles.editorForm}
        action="/torre/comercio-v2/materiais/salvar"
        method="POST"
        encType="multipart/form-data"
      >
        <input type="hidden" name="id" value={material?.id ?? ""} />
        <label>Produto
          <select name="product_id" required defaultValue={selectedProduct} key={selectedProduct}>
            <option value="" disabled>Selecione um produto</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </label>
        {products.length === 0 && <p className={styles.note}>Primeiro cadastre um produto em <Link href="/torre/comercio-v2/produtos">Produtos piloto</Link>.</p>}
        <label>Nome do material
          <input type="text" name="title" maxLength={180} minLength={2} required
            defaultValue={material?.title ?? ""} placeholder="Ex.: Caderno de Exercícios 2027" />
        </label>
        <label>Tipo do material
          <select name="category" defaultValue={material?.category ?? "support"}>
            {Object.entries(materialCategories).map(([key, name]) => <option value={key} key={key}>{name}</option>)}
          </select>
        </label>
        <label>Descrição — o que contém este material
          <textarea name="description" maxLength={4000} rows={5}
            defaultValue={material?.description ?? ""}
            placeholder="Descreva a finalidade e o conteúdo do arquivo." />
        </label>
        <label>{material ? "Substituir arquivo (opcional)" : "Enviar arquivo (opcional)"}
          <input type="file" name="file" accept=".pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.webp,.zip,.txt" />
        </label>
        {material?.original_filename && <p className={styles.note}>
          Arquivo atual: <strong>{material.original_filename}</strong>. Deixe o campo vazio para manter o arquivo existente.
        </p>}
        <p className={styles.note}>Arquivos de até 25 MB. É possível cadastrar a descrição agora e enviar o arquivo depois. Os arquivos permanecem privados.</p>
        <div className={styles.formButtons}>
          <button type="submit" disabled={products.length === 0}>Salvar conteúdo</button>
          <Link href={back}>Cancelar</Link>
        </div>
      </form>}
    </div>
  </main>;
}
