// app/torre/comercio-v2/materiais/novo/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import styles from "../materials.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Novo conteúdo | Biblioteca de Materiais" };
type Query = { produto?: string; editar?: string };
type Product = { id: string; code: string; name: string };
type Material = {
  id: string; product_id: string | null; title: string; category: string; subject_code: string;
  description: string; original_filename: string | null; is_archived: boolean; available_to_student: boolean;
};
const back = "/torre/comercio-v2/materiais";

export default async function MaterialEditor({ searchParams }: { searchParams: Promise<Query> }) {
  await requireAdmin();
  const query = await searchParams;
  const db = getSupabaseAdmin();
  const [productsResult, materialResult, typesResult, subjectsResult] = await Promise.all([
    db.from("commerce_v2_products").select("id,code,name").order("name").limit(500),
    query.editar
      ? db.from("commerce_v2_materials")
          .select("id,product_id,title,category,subject_code,description,original_filename,is_archived,available_to_student")
          .eq("id", query.editar).eq("is_archived", false).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db.from("commerce_v2_material_types").select("code,name,is_active").order("name").limit(500),
    db.from("commerce_v2_material_subjects").select("code,name,is_active").order("name").limit(500),
  ]);
  const products = (productsResult.data ?? []) as Product[];
  const typeOptions=(typesResult.data??[]).filter(t=>t.is_active||t.code===materialResult.data?.category);
  const subjectOptions=(subjectsResult.data??[]).filter(t=>t.is_active||t.code===materialResult.data?.subject_code);
  const material = materialResult.data as Material | null;
  const eligibilityResult = material ? await db.from("commerce_v2_material_product_eligibility")
    .select("product_id").eq("material_id", material.id)
    : { data: [] as {product_id:string}[], error: null };
  const eligibilityIds = new Set((eligibilityResult.data ?? []).map(item => item.product_id));
  const selectedProduct = material?.product_id ??
    (products.some(p => p.id === query.produto) ? query.produto : "");
  const invalidEdit = Boolean(query.editar && (materialResult.error || !material));
  return <main className={styles.page}>
    <div className={styles.editor}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>ÁREA COMERCIAL · BIBLIOTECA DE MATERIAIS</p>
          <h1>{material ? "Editar conteúdo" : "Novo conteúdo"}</h1>
          <p>Guarde seus arquivos e vincule-os às aulas e produtos quando desejar.</p>
        </div>
        <Link href={back}>Voltar à lista</Link>
      </header>
      {(productsResult.error || materialResult.error || eligibilityResult.error || typesResult.error || subjectsResult.error) && <p className={styles.error} role="alert">Não foi possível consultar os dados do editor.</p>}
      {invalidEdit && <p className={styles.error} role="alert">Material indisponível para edição. Volte à Biblioteca.</p>}
      {!productsResult.error && !eligibilityResult.error && !typesResult.error && !subjectsResult.error && !invalidEdit && <form
        className={styles.editorForm}
        action="/torre/comercio-v2/materiais/salvar"
        method="POST"
        encType="multipart/form-data"
      >
        <input type="hidden" name="id" value={material?.id ?? ""} />
        <div className={styles.editorRow}>
          <label>Título do material
            <input type="text" name="title" maxLength={180} minLength={2} required
              defaultValue={material?.title ?? ""} placeholder="Ex.: Guia Prático do Simples Nacional" />
          </label>
          <label>Tipo do material
            <select name="category" defaultValue={material?.category ?? "support"} required>
              {typeOptions.map(t=><option value={t.code} key={t.code}>{t.name}{t.is_active?"":" (inativo)"}</option>)}
            </select>
          </label>
          <label>Classificação
            <select name="subject_code" defaultValue={material?.subject_code ?? "geral"} required>
              {subjectOptions.map(t=><option value={t.code} key={t.code}>{t.name}{t.is_active?"":" (inativa)"}</option>)}
            </select>
          </label>
        </div>
        <div className={styles.editorShortcuts}>
          <Link href="/torre/comercio-v2/materiais/tipos">+ Tipos de Material</Link>
          <Link href="/torre/comercio-v2/materiais/categorias">+ Categoria</Link>
        </div>
        <label>Descrição — o que contém este material
          <textarea name="description" maxLength={4000} rows={4}
            defaultValue={material?.description ?? ""}
            placeholder="Descreva a finalidade e o conteúdo do arquivo." />
        </label>
        <label>{material?.original_filename ? "Substituir arquivo" : "Enviar arquivo"}
          <input type="file" name="file" required={!material?.original_filename}
            accept=".pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.webp,.zip,.txt" />
        </label>
        {material?.original_filename && <p className={styles.note}>
          Arquivo atual: <strong>{material.original_filename}</strong>. Envie outro somente para substituir.
        </p>}
        <p className={styles.note}>Arquivo obrigatório no cadastro, com até 25 MB. Os materiais permanecem privados na Torre.</p>
        <label className={styles.choiceRow}>
          <input type="checkbox" name="available_to_student" value="yes" defaultChecked={material?.available_to_student ?? false}/>
          Disponível para aluno — permite selecionar o material para entrega em Produtos. Não publica automaticamente.
        </label>
        <fieldset className={styles.choiceList}>
          <legend style={{fontWeight:750}}>Em quais produtos este material será entregue?</legend>
          <p className={styles.note}>Opcional. Deixe todos desmarcados para guardar na Biblioteca e vincular a cursos posteriormente.</p>
          {products.map(product=><label key={product.id} className={styles.choiceRow}>
            <input type="checkbox" name="eligible_product_ids" value={product.id}
              defaultChecked={material ? eligibilityIds.has(product.id) : product.id === selectedProduct}/>
            <span>{product.code} — {product.name}</span>
          </label>)}
          {!products.length && <p className={styles.note}>Nenhum produto cadastrado. Você ainda pode salvar o arquivo na Biblioteca.</p>}
        </fieldset>
        <div className={styles.formButtons}>
          <button type="submit">Salvar material</button>
          <Link href={back}>Cancelar</Link>
        </div>
      </form>}
    </div>
  </main>;
}
