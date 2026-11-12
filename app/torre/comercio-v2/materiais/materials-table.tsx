// app/torre/comercio-v2/materiais/materials-table.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { archiveCommerceV2Material, restoreCommerceV2Material } from "./actions";
import css from "../../modelos-email/models-list.module.css";
import styles from "./materials.module.css";

export type ProductOption = { id: string; code: string; name: string };
export type MaterialRow = {
  id: string; product_id: string; title: string; description: string;
  category: string; original_filename: string | null; file_mime: string | null;
  file_size: number | null; storage_path: string | null;
  is_archived: boolean; created_at: string; updated_at: string;
};
export const materialCategories: Record<string, string> = {
  slides: "Slides", ebook: "E-book", worksheet: "Planilha", checklist: "Checklist",
  script: "Roteiro", exercises: "Exercícios", image: "Imagem",
  support: "Material de apoio", other: "Outro",
};
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const previewable = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain"]);
function size(bytes: number | null) { return bytes === null ? "" : (bytes / 1048576).toFixed(2).replace(".", ",") + " MB"; }
export default function MaterialsTable({
  materials, products, initialProduct = "",
}: {
  materials: MaterialRow[]; products: ProductOption[]; initialProduct?: string;
}) {
  const [query, setQuery] = useState("");
  const [product, setProduct] = useState(initialProduct);
  const [category, setCategory] = useState("todos");
  const [status, setStatus] = useState("ativos");
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const filtered = useMemo(() => {
    const search = normalize(query.trim());
    return materials.filter(item => {
      if (product && item.product_id !== product) return false;
      if (category !== "todos" && item.category !== category) return false;
      if (status === "ativos" && item.is_archived) return false;
      if (status === "arquivados" && !item.is_archived) return false;
      const parent = productMap.get(item.product_id);
      return !search || normalize([
        item.title, item.description, item.original_filename ?? "",
        parent?.name ?? "", parent?.code ?? "",
      ].join(" ")).includes(search);
    });
  }, [materials, productMap, query, product, category, status]);
  const clear = () => { setQuery(""); setProduct(""); setCategory("todos"); setStatus("ativos"); };
  const filtering = Boolean(query.trim()) || Boolean(product) || category !== "todos" || status !== "ativos";
  return <>
    <div className={styles.filterPanel}>
      <label className={css.filterSearch}>
        <span>Pesquisar por texto</span>
        <input type="search" placeholder="Nome, arquivo ou descrição..." value={query} onChange={e => setQuery(e.target.value)} />
      </label>
      <label className={css.filterSelect}>
        <span>Produto</span>
        <select value={product} onChange={e => setProduct(e.target.value)}>
          <option value="">Todos os produtos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>
      </label>
      <label className={css.filterSelect}>
        <span>Tipo</span>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="todos">Todos</option>
          {Object.entries(materialCategories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <label className={css.filterSelect}>
        <span>Situação</span>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="ativos">Ativos</option>
          <option value="arquivados">Arquivados</option>
          <option value="todos">Todos</option>
        </select>
      </label>
      <button type="button" className={css.clearFilters} onClick={clear} disabled={!filtering}>Limpar filtros</button>
    </div>
    <p role="status" className={css.resultsCount}>
      {filtered.length} {filtered.length === 1 ? "material encontrado" : "materiais encontrados"}
    </p>
    <div className={css.scroll}>
      <table className={css.table}>
        <thead><tr>
          <th>Data</th><th>Material</th><th>Produto</th><th>Descrição</th><th>Tipo</th><th>Situação</th><th>Ações</th>
        </tr></thead>
        <tbody>
          {filtered.map(m => {
            const parent = productMap.get(m.product_id);
            return <tr key={m.id}>
              <td className={css.date}>{dateFormatter.format(new Date(m.created_at))}</td>
              <td><strong>{m.title}</strong><small>{m.original_filename ?? "Sem arquivo"}{m.file_size !== null ? " · " + size(m.file_size) : ""}</small></td>
              <td>{parent?.name ?? "Produto não encontrado"}<small>{parent?.code ?? ""}</small></td>
              <td className={styles.description}>{m.description || "—"}</td>
              <td>{materialCategories[m.category] ?? m.category}</td>
              <td>{m.is_archived ? "Arquivado" : "Ativo"}</td>
              <td><div className={css.actions}>
                {!m.is_archived && <>
                  <Link className={css.edit} title={"Editar " + m.title} aria-label={"Editar " + m.title}
                    href={"/torre/comercio-v2/materiais/novo?editar=" + encodeURIComponent(m.id)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 20h9M4 17l-1 4 4-1L19 8l-3-3L4 17ZM14 7l3 3" /></svg>
                  </Link>
                  {m.storage_path && <>
                    {previewable.has(m.file_mime ?? "") && <a className={styles.actionText} href={"/torre/comercio-v2/materiais/arquivo/" + m.id + "?modo=visualizar"} target="_blank" rel="noopener noreferrer">Visualizar</a>}
                    <a className={styles.actionText} href={"/torre/comercio-v2/materiais/arquivo/" + m.id}>Baixar</a>
                  </>}
                  <form action={archiveCommerceV2Material}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="confirm" value="yes" />
                    <button type="submit" title={"Arquivar " + m.title} className={styles.archive}>Arquivar</button>
                  </form>
                </>}
                {m.is_archived && <form action={restoreCommerceV2Material}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className={styles.restore}>Restaurar</button>
                </form>}
              </div></td>
            </tr>;
          })}
          {!filtered.length && <tr><td colSpan={7} className={css.noResults}>
            {materials.length === 0 ? "Nenhum material cadastrado." : "Nenhum material encontrado com estes filtros."}
            {filtering && <div><button type="button" className={css.resetInline} onClick={clear}>Limpar filtros</button></div>}
          </td></tr>}
        </tbody>
      </table>
    </div>
  </>;
}
