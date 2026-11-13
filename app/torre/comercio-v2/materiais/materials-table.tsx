// app/torre/comercio-v2/materiais/materials-table.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { archiveCommerceV2Material, restoreCommerceV2Material } from "./actions";
import styles from "./materials.module.css";
import { materialCategories } from "./categories";

export type ProductOption = { id: string; code: string; name: string };
export type MaterialRow = {
  id: string; product_id: string; eligible_product_ids: string[]; title: string; description: string;
  category: string; original_filename: string | null; file_mime: string | null;
  file_size: number | null; storage_path: string | null;
  is_archived: boolean; available_to_student: boolean; created_at: string; updated_at: string;
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
      if (product && !item.eligible_product_ids.includes(product)) return false;
      if (category !== "todos" && item.category !== category) return false;
      if (status === "ativos" && item.is_archived) return false;
      if (status === "arquivados" && !item.is_archived) return false;
      const relatedProducts = item.eligible_product_ids.map(id=>productMap.get(id)).filter(Boolean);
      const parent = productMap.get(item.product_id);
      return !search || normalize([
        item.title, item.description, item.original_filename ?? "",
        ...relatedProducts.flatMap(p => [p?.name ?? "",p?.code ?? ""]),
      ].join(" ")).includes(search);
    });
  }, [materials, productMap, query, product, category, status]);
  const clear = () => { setQuery(""); setProduct(""); setCategory("todos"); setStatus("ativos"); };
  const filtering = Boolean(query.trim()) || Boolean(product) || category !== "todos" || status !== "ativos";
  return <>
    <div className={styles.filterPanel}>
      <label className={styles.filterField}>
        <span>Pesquisar por texto</span>
        <input type="search" placeholder="Nome, arquivo ou descrição..." value={query} onChange={e => setQuery(e.target.value)} />
      </label>
      <label className={styles.filterField}>
        <span>Produto</span>
        <select value={product} onChange={e => setProduct(e.target.value)}>
          <option value="">Todos os produtos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>
      </label>
      <label className={styles.filterField}>
        <span>Tipo</span>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="todos">Todos</option>
          {Object.entries(materialCategories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <label className={styles.filterField}>
        <span>Situação</span>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="ativos">Ativos</option>
          <option value="arquivados">Arquivados</option>
          <option value="todos">Todos</option>
        </select>
      </label>
      <button type="button" className={styles.filterButton} onClick={clear} disabled={!filtering}>Limpar filtros</button>
    </div>
    <p role="status" className={styles.resultsCount}>
      {filtered.length} {filtered.length === 1 ? "material encontrado" : "materiais encontrados"}
    </p>

    <div className={styles.materialCards}>
      {filtered.map(m=>{
        const parents=m.eligible_product_ids.map(id=>productMap.get(id)).filter((p):p is ProductOption=>Boolean(p));
        return <article key={m.id} className={styles.materialCard}>
          <div className={styles.materialCardTop}>
            <div>
              <p className={styles.materialCategory}>{materialCategories[m.category]??m.category} · {m.is_archived?"Arquivado":"Ativo"}</p>
              <h3>{m.title}</h3>
              <p className={styles.note}>{m.description||"Sem descrição"}</p>
              <p className={styles.note}>{m.original_filename??"Sem arquivo"}{m.file_size!==null?" · "+size(m.file_size):""} · {dateFormatter.format(new Date(m.created_at))}</p>
            </div>
            <div className={styles.actions}>
              {!m.is_archived&&<>
                <Link className={styles.iconButton} title={"Editar "+m.title} aria-label={"Editar "+m.title} href={"/torre/comercio-v2/materiais/novo?editar="+encodeURIComponent(m.id)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 5 3 3M4 20l4.2-.8L20 7.4 16.6 4 4.8 15.8 4 20Z"/></svg>
                </Link>
                {m.storage_path&&<>
                  {previewable.has(m.file_mime??"")&&<a className={styles.iconButton} title={"Visualizar "+m.title} aria-label={"Visualizar "+m.title} href={"/torre/comercio-v2/materiais/arquivo/"+m.id+"?modo=visualizar"} target="_blank" rel="noopener noreferrer">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  </a>}
                  <a className={styles.iconButton} title={"Baixar "+m.title} aria-label={"Baixar "+m.title} href={"/torre/comercio-v2/materiais/arquivo/"+m.id}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/></svg>
                  </a>
                </>}
                <form action={archiveCommerceV2Material}>
                  <input type="hidden" name="id" value={m.id}/><input type="hidden" name="confirm" value="yes"/>
                  <button type="submit" title={"Arquivar "+m.title} aria-label={"Arquivar "+m.title} className={styles.dangerIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h18v4H3zM5 8v12h14V8M10 12h4"/></svg>
                  </button>
                </form>
              </>}
              {m.is_archived&&<form action={restoreCommerceV2Material}>
                <input type="hidden" name="id" value={m.id}/>
                <button type="submit" className={styles.iconButton} aria-label={"Restaurar "+m.title} title={"Restaurar "+m.title}>Restaurar</button>
              </form>}
            </div>
          </div>
          <div className={styles.materialCardFooter}>
            <div><strong>Produtos relacionados</strong>
              {parents.length?<ul className={styles.productList}>{parents.map(p=><li key={p.id}><span>{p.name}</span><small>{p.code}</small></li>)}</ul>:<p className={styles.note}>Nenhum produto relacionado.</p>}
            </div>
            <p className={styles.availability}><strong>Disponível para aluno (cliente):</strong> {m.available_to_student&&!m.is_archived?"Sim":"Não — somente Torre"}</p>
          </div>
        </article>;
      })}
      {!filtered.length&&<div className={styles.materialCard}>
        <p>{materials.length===0?"Nenhum material cadastrado.":"Nenhum material encontrado com estes filtros."}</p>
        {filtering&&<button className={styles.filterButton} type="button" onClick={clear}>Limpar filtros</button>}
      </div>}
    </div>
  </>;
}
