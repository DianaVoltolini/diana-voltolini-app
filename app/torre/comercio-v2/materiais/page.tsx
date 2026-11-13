// app/torre/comercio-v2/materiais/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import MaterialsTable, { type MaterialRow, type ProductOption } from "./materials-table";
import styles from "./materials.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Biblioteca de Materiais | Comércio V2" };

type Query = { produto?: string; salvo?: string; excluido?: string; restaurado?: string; importado?: string; erro?: string };
const errors: Record<string, string> = {
  validacao: "Confira os dados informados.",
  arquivo: "Arquivo inválido ou maior que 25 MB.",
  produto: "Produto não encontrado ou indisponível.",
  material: "Material não encontrado ou vinculado a outro produto.",
  upload: "Não foi possível enviar o arquivo.",
  salvar: "Não foi possível salvar o material.",
  excluir: "Não foi possível arquivar o material.",
  restaurar: "Não foi possível restaurar o material.",
  csv: "CSV inválido, incompleto ou incompatível com o produto.",
  correspondencia: "Os arquivos selecionados não correspondem exatamente aos nomes do CSV.",
  consulta: "Não foi possível consultar os materiais existentes.",
  importacao: "Falha ao importar. Confira os arquivos e tente novamente; os materiais anteriores foram preservados.",
};
export default async function MaterialsPage({ searchParams }: { searchParams: Promise<Query> }) {
  await requireAdmin();
  const query = await searchParams;
  const db = getSupabaseAdmin();
  const [productsResult, initialMaterialsResult, eligibilityResult] = await Promise.all([
    db.from("commerce_v2_products").select("id,code,name").order("name").limit(500),
    db.from("commerce_v2_materials")
      .select("id,product_id,title,description,category,original_filename,file_mime,file_size,storage_path,is_archived,available_to_student,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(500),
    db.from("commerce_v2_material_product_eligibility").select("material_id,product_id").limit(5000),
  ]);

  // Em ambientes ainda sem a coluna opcional de liberação, manter a Biblioteca
  // consultável. Não esconder erros de leitura dos materiais ou dos produtos.
  let materialsResult = initialMaterialsResult;
  if (initialMaterialsResult.error?.code === "42703" ||
      initialMaterialsResult.error?.code === "PGRST204") {
    console.warn("Biblioteca V2: coluna opcional ausente:", initialMaterialsResult.error.message);
    const fallback = await db.from("commerce_v2_materials")
      .select("id,product_id,title,description,category,original_filename,file_mime,file_size,storage_path,is_archived,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(500);
    materialsResult = fallback as typeof initialMaterialsResult;
  }
  if (productsResult.error) console.error("Biblioteca V2 products:", productsResult.error.message);
  if (materialsResult.error) console.error("Biblioteca V2 materials:", materialsResult.error.message);
  if (eligibilityResult.error) console.warn("Biblioteca V2 eligibility:", eligibilityResult.error.message);
  const products = (productsResult.data ?? []) as ProductOption[];
  const eligibilityAvailable = !eligibilityResult.error;
  const links = eligibilityAvailable ? (eligibilityResult.data ?? []) : [];
  // Quando a tabela auxiliar não responder, preservar o vínculo principal antigo
  // por product_id como fallback de leitura, sem criar nem excluir vínculos.
  const materials = (materialsResult.data ?? []).map(material => ({
    ...material,
    available_to_student: "available_to_student" in material ? material.available_to_student : false,
    eligible_product_ids: eligibilityAvailable
      ? links.filter(link => link.material_id === material.id).map(link => link.product_id)
      : [material.product_id],
  })) as MaterialRow[];
  const chosenProduct = products.some(p => p.id === query.produto) ? query.produto : "";
  const newUrl = "/torre/comercio-v2/materiais/novo" + (chosenProduct ? "?produto=" + encodeURIComponent(chosenProduct) : "");
  return <main className={styles.page}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>TORRE · ÁREA COMERCIAL</p>
        <h1>Biblioteca de Materiais</h1>
        <p>Organize e consulte os arquivos vinculados aos produtos. Acesso privado da Torre.</p>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className={styles.button} href={newUrl}>+ Novo conteúdo</Link>
        <Link className={styles.button} href="/torre/comercio-v2/materiais/limpeza-storage">Auditar arquivos órfãos</Link>
        <Link className={styles.button} href={"/torre/comercio-v2/materiais/importar" + (chosenProduct ? "?produto=" + encodeURIComponent(chosenProduct) : "")}>Importar em lote</Link>
      </div>
    </header>
    {query.importado === "1" && <p className={styles.message} role="status">Importação concluída. Os materiais anteriores deste produto foram arquivados.</p>}
    {query.salvo === "1" && <p className={styles.message} role="status">Material salvo com sucesso.</p>}
    {query.excluido === "1" && <p className={styles.message} role="status">Material arquivado. Você pode restaurá-lo pelo filtro Situação.</p>}
    {query.restaurado === "1" && <p className={styles.message} role="status">Material restaurado.</p>}
    {query.erro && <p className={styles.error} role="alert">{errors[query.erro] ?? "Não foi possível concluir."}</p>}
    <section className={styles.section}>
      <h2>Materiais cadastrados</h2>
      {!eligibilityAvailable && <p className={styles.note} role="status">Os vínculos adicionais entre materiais e produtos não puderam ser consultados. Exibindo o produto principal de cada cadastro até a regularização da consulta.</p>}
      {(productsResult.error || materialsResult.error)
        ? <p className={styles.error} role="alert">Não foi possível consultar a Biblioteca de Materiais.</p>
        : <MaterialsTable materials={materials} products={products} initialProduct={chosenProduct ?? ""} />}
      {!productsResult.error && !materialsResult.error && materials.length === 500 &&
        <p className={styles.note}>Mostrando os 500 registros mais recentes. A paginação será incluída antes de ultrapassar esse limite.</p>}
    </section>
  </main>;
}
