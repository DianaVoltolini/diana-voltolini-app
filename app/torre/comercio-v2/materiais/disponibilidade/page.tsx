// app/torre/comercio-v2/materiais/disponibilidade/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import styles from "../materials.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Atualizar disponibilidade | Biblioteca" };
type Product = { id: string; code: string; name: string };
type Query = { produto?: string; atualizado?: string; erro?: string };
const messages: Record<string, string> = {
  validacao: "Confira o produto, o código de confirmação e o arquivo CSV.",
  csv: "CSV inválido. Use o cadastro com a coluna disponivel_para_aluno (sim/nao).",
  materiais: "Os nomes do CSV não correspondem de forma única aos arquivos ativos deste produto. Nenhuma alteração foi feita.",
  salvar: "Não foi possível concluir a atualização. Verifique os registros.",
};
export default async function AvailabilityPage({searchParams}: {searchParams: Promise<Query>}) {
  await requireAdmin();
  const query = await searchParams;
  const db = getSupabaseAdmin();
  const result = await db.from("commerce_v2_products").select("id,code,name").order("name").limit(500);
  const products = (result.data || []) as Product[];
  const selected = products.find(p=>p.id===query.produto) || products.find(p=>p.code==="ENC-RT-2027-001");
  return <main className={styles.page}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>TORRE · BIBLIOTECA · USO INTERNO</p>
        <h1>Disponibilidade dos materiais por CSV</h1>
        <p>Altere apenas a opção “Disponível para aluno” em documentos existentes, sem reenviar arquivos.</p>
      </div>
      <Link href="/torre/comercio-v2/materiais">Voltar à Biblioteca</Link>
    </header>
    {query.atualizado==="1" && <p className={styles.message} role="status">Disponibilidade dos materiais atualizada. Confira a coluna “Disponível para aluno” na Biblioteca.</p>}
    {query.erro && <p className={styles.error} role="alert">{messages[query.erro] || "Falha na atualização."}</p>}
    {result.error && <p className={styles.error}>Não foi possível consultar os produtos.</p>}
    <section className={styles.editor}>
      <form className={styles.editorForm} action="/torre/comercio-v2/materiais/disponibilidade/processar"
        method="POST" encType="multipart/form-data">
        <h2>Atualizar materiais já cadastrados</h2>
        <p className={styles.note}>
          Esta ação não importa documentos, não arquiva nem elimina registros. Apenas atualiza
          o campo de disponibilidade dos materiais ativos cujos nomes correspondam exatamente ao CSV.
          A marcação “sim” torna o material selecionável em Produtos → Materiais para entrega,
          sem liberá-lo automaticamente aos alunos.
        </p>
        <label>Produto
          <select name="product_id" defaultValue={selected?.id || ""} required>
            <option value="" disabled>Selecione um produto</option>
            {products.map(p=><option value={p.id} key={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </label>
        <label>CSV com a coluna disponivel_para_aluno (sim ou nao)
          <input type="file" name="manifest" accept=".csv,text/csv" required />
        </label>
        <p className={styles.note}>
          Se algum arquivo não for encontrado, estiver arquivado ou tiver um nome duplicado,
          nenhum registro será atualizado. O arquivo CSV precisa conter todos os nomes desejados.
        </p>
        <label>Digite o código exato do produto para confirmar
          <input name="confirm_code" required placeholder="ENC-RT-2027-001" autoComplete="off" />
        </label>
        <div className={styles.formButtons}>
          <button type="submit" disabled={products.length===0}>Atualizar disponibilidade sem reenviar arquivos</button>
          <Link href="/torre/comercio-v2/materiais">Cancelar</Link>
        </div>
      </form>
    </section>
  </main>;
}
