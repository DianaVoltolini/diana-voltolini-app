// app/torre/comercio-v2/materiais/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { archiveCommerceV2Material, restoreCommerceV2Material } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Biblioteca de materiais | Comércio V2" };
type Query = { produto?: string; categoria?: string; busca?: string; edit?: string; salvo?: string; excluido?: string; restaurado?: string; arquivados?: string; erro?: string };
type Product = { id: string; code: string; name: string };
type Material = {
  id: string; product_id: string; title: string; description: string; category: string;
  original_filename: string | null; file_mime: string | null; file_size: number | null;
  storage_path: string | null; is_archived: boolean; created_at: string; updated_at: string;
};
const categories: Record<string, string> = {
  slides: "Slides", ebook: "E-book", worksheet: "Planilha", checklist: "Checklist",
  script: "Roteiro", image: "Imagem", support: "Material de apoio", exercises: "Exercícios", other: "Outro",
};
const errors: Record<string, string> = {
  validacao: "Revise os campos informados.",
  arquivo: "Arquivo inválido. Aceitos: PDF, DOCX, PPTX, XLSX, PNG, JPG, WEBP, ZIP e TXT, até 25 MB.",
  produto: "Produto V2 inexistente ou indisponível.",
  material: "Material não encontrado ou pertence a outro produto.",
  upload: "Não foi possível enviar o arquivo ao armazenamento privado.",
  salvar: "Não foi possível salvar o material. Confira se a migração foi executada.",
  excluir: "Não foi possível retirar o material da biblioteca.",
  restaurar: "Não foi possível restaurar o material.",
};
const field: React.CSSProperties = { display: "block", marginBottom: 13, fontSize: 14, fontWeight: 700 };
const control: React.CSSProperties = {
  display: "block", width: "100%", marginTop: 6, padding: 11, borderRadius: 8,
  border: "1px solid #cbd5e1", color: "#1e293b", background: "white", boxSizing: "border-box",
};
const small: React.CSSProperties = { color: "#64748b", fontSize: 13 };
function formatSize(value: number | null) {
  return value ? (value / 1048576).toFixed(2).replace(".", ",") + " MB" : "";
}
function linkTo(query: Query) {
  const params = new URLSearchParams();
  if (query.produto) params.set("produto", query.produto);
  if (query.categoria) params.set("categoria", query.categoria);
  if (query.busca) params.set("busca", query.busca);
  if (query.arquivados) params.set("arquivados", query.arquivados);
  return "/torre/comercio-v2/materiais?" + params.toString();
}

export default async function MaterialsPage({ searchParams }: { searchParams: Promise<Query> }) {
  await requireAdmin();
  const query = await searchParams;
  const db = getSupabaseAdmin();
  const [productsResult, materialsResult] = await Promise.all([
    db.from("commerce_v2_products").select("id,code,name").order("name").limit(500),
    db.from("commerce_v2_materials").select(
      "id,product_id,title,description,category,original_filename,file_mime,file_size,storage_path,is_archived,created_at,updated_at",
    ).order("created_at", { ascending: false }).limit(500),
  ]);
  const products = (productsResult.data ?? []) as Product[];
  const materials = (materialsResult.data ?? []) as Material[];
  const map = new Map(products.map(p => [p.id, p]));
  const validProduct = query.produto && map.has(query.produto) ? query.produto : "";
  const category = query.categoria && categories[query.categoria] ? query.categoria : "";
  const term = (query.busca ?? "").trim().toLocaleLowerCase("pt-BR").slice(0, 120);
  const archived = query.arquivados === "1";
  const canPreview = (mime: string | null) => ["application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain"].includes(mime ?? "");
  const filtered = materials.filter(m =>
    m.is_archived === archived &&
    (!validProduct || m.product_id === validProduct) &&
    (!category || m.category === category) &&
    (!term || [m.title, m.description, m.original_filename ?? "", map.get(m.product_id)?.name ?? "",
      map.get(m.product_id)?.code ?? ""].some(v => v.toLocaleLowerCase("pt-BR").includes(term)))
  );
  const edit = query.edit ? materials.find(m => m.id === query.edit && !m.is_archived) : null;
  const selectedProduct = edit?.product_id ?? validProduct ?? "";
  const hasError = Boolean(productsResult.error || materialsResult.error);

  return <main style={{ padding: "28px 20px 70px", maxWidth: 1200, margin: "auto" }}>
    <p style={{ color: "#926c13", fontSize: 12, letterSpacing: 1, fontWeight: 800 }}>TORRE · COMÉRCIO V2</p>
    <h1 style={{ fontSize: 32, marginBottom: 8 }}>Biblioteca de materiais</h1>
    <p style={{ maxWidth: 840, color: "#475569", lineHeight: 1.6 }}>
      Organize os arquivos por produto: slides, roteiros, planilhas, e-books e outros materiais de trabalho.
      Os arquivos são privados da Torre e não são entregues automaticamente a compradores.
    </p>
    <p><Link href="/torre/comercio-v2/produtos">Produtos V2</Link> · <Link href="/torre/comercio-v2">Visão geral</Link></p>
    {query.salvo === "1" && <p role="status" style={{ color: "#166534" }}>Material salvo com sucesso.</p>}
    {query.excluido === "1" && <p role="status" style={{ color: "#166534" }}>Material arquivado. É possível restaurá-lo pelo filtro Arquivados.</p>}
    {query.restaurado === "1" && <p role="status" style={{ color: "#166534" }}>Material restaurado.</p>}
    {query.erro && <p role="alert" style={{ color: "#b91c1c" }}>{errors[query.erro] ?? "Falha na operação."}</p>}
    {hasError ? <p role="alert" style={{ color: "#b91c1c" }}>
      Biblioteca indisponível. Confirme a migração SQL do Comércio V2.
    </p> : <div style={{
      display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))",
      alignItems: "start", gap: 24,
    }}>
      <section style={{ padding: 22, border: "1px solid #dce4eb", borderRadius: 12, background: "#fff" }}>
        <h2 style={{ marginTop: 0, fontSize: 21 }}>{edit ? "Editar material" : "Adicionar material"}</h2>
        {edit && <Link href={linkTo({ produto: selectedProduct })}>+ Adicionar outro material</Link>}
        <form action="/torre/comercio-v2/materiais/salvar" method="POST" encType="multipart/form-data" style={{ marginTop: 18 }}>
          <input type="hidden" name="id" value={edit?.id ?? ""} />
          <label style={field}>Produto
            <select name="product_id" style={control} required defaultValue={selectedProduct} key={edit?.id ?? selectedProduct}>
              <option value="" disabled>Selecione o produto</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </label>
          {products.length === 0 && <p style={small}>Cadastre primeiro o produto em Produtos V2.</p>}
          <label style={field}>Nome do material
            <input name="title" required minLength={2} maxLength={180} style={control} defaultValue={edit?.title ?? ""} />
          </label>
          <label style={field}>Tipo
            <select name="category" style={control} defaultValue={edit?.category ?? "support"}>
              {Object.entries(categories).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
            </select>
          </label>
          <label style={field}>Descrição — o que contém este material
            <textarea name="description" rows={4} maxLength={4000} style={control}
              defaultValue={edit?.description ?? ""} placeholder="Ex.: slides da aula, parte 1, conceitos de IBS/CBS."/>
          </label>
          <label style={field}>{edit ? "Substituir arquivo (opcional)" : "Enviar arquivo (opcional)"}
            <input name="file" type="file" style={control}
              accept=".pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.webp,.zip,.txt" />
          </label>
          {edit?.original_filename && <p style={small}>Arquivo atual: {edit.original_filename}. Se enviar outro, ele será substituído.</p>}
          <p style={small}>Até 25 MB por arquivo. Materiais sem arquivo podem ser cadastrados e receber o arquivo depois.</p>
          <button type="submit" disabled={products.length === 0} style={{
            background: "#173c71", color: "#fff", padding: "12px 20px", border: "none", borderRadius: 9,
            fontWeight: 800, cursor: "pointer",
          }}>Salvar material</button>
        </form>
      </section>
      <section style={{ padding: 22, border: "1px solid #dce4eb", borderRadius: 12, background: "#fff" }}>
        <h2 style={{ marginTop: 0, fontSize: 21 }}>Materiais cadastrados ({filtered.length})</h2>
        <form method="GET" style={{ display: "grid", gap: 10, marginBottom: 20 }}>
          <label style={field}>Filtrar por produto
            <select name="produto" defaultValue={validProduct} style={control}>
              <option value="">Todos os produtos</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </label>
          <label style={field}>Filtrar por tipo
            <select name="categoria" defaultValue={category} style={control}>
              <option value="">Todos os tipos</option>
              {Object.entries(categories).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
            </select>
          </label>
          <label style={field}>Situação
            <select name="arquivados" defaultValue={archived ? "1" : ""} style={control}>
              <option value="">Ativos</option>
              <option value="1">Arquivados</option>
            </select>
          </label>
          <label style={field}>Buscar por nome ou descrição
            <input type="search" name="busca" style={control} defaultValue={query.busca ?? ""} maxLength={120} />
          </label>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <button type="submit" style={{ background: "#173c71", color: "#fff", padding: "10px 15px", border: 0, borderRadius: 8 }}>Filtrar</button>
            <Link href="/torre/comercio-v2/materiais">Limpar filtros</Link>
          </div>
        </form>
        {filtered.length === 0 && <p style={small}>Nenhum material encontrado.</p>}
        {filtered.map(m => <article key={m.id} style={{ borderTop: "1px solid #e2e8f0", padding: "18px 0" }}>
          <strong style={{ display: "block" }}>{m.title}</strong>
          <p style={{ ...small, margin: "6px 0" }}>{map.get(m.product_id)?.name ?? "Produto"} · {categories[m.category] ?? "Outro"}</p>
          {m.description && <p style={{ whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.5 }}>{m.description}</p>}
          <p style={small}>{m.original_filename ? `${m.original_filename} · ${formatSize(m.file_size)}` : "Sem arquivo anexado"}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", fontSize: 14 }}>
            {!archived && m.storage_path && <>{canPreview(m.file_mime) && <a target="_blank" rel="noopener noreferrer"
              href={`/torre/comercio-v2/materiais/arquivo/${m.id}?modo=visualizar`}>Visualizar</a>}
              <a href={`/torre/comercio-v2/materiais/arquivo/${m.id}`}>Baixar</a></>}
            {!archived && <Link href={linkTo({ produto: m.product_id }) + "&edit=" + encodeURIComponent(m.id)}>Editar</Link>}
            {!archived ? <form action={archiveCommerceV2Material} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="confirm" value="yes" />
              <button type="submit" style={{ color: "#b91c1c", border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
                Arquivar / retirar da lista
              </button>
            </form> : <form action={restoreCommerceV2Material} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={m.id} />
              <button type="submit" style={{ color: "#166534", background: "transparent", border: "none", cursor: "pointer" }}>Restaurar</button>
            </form>}
          </div>
        </article>)}
        {materials.length >= 500 && <p style={small}>Mostrando até 500 registros. A paginação será adicionada antes de uso em escala.</p>}
      </section>
    </div>}
  </main>;
}
