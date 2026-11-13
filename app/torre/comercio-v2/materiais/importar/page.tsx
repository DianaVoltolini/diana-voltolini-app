// app/torre/comercio-v2/materiais/importar/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import styles from "../materials.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Importar materiais em lote | Biblioteca V2" };

type Query = { produto?: string };
type Product = { id: string; code: string; name: string; status: string };

export default async function ImportMaterialsPage({ searchParams }: { searchParams: Promise<Query> }) {
  await requireAdmin();
  const query = await searchParams;
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("commerce_v2_products")
    .select("id,code,name,status").order("name").limit(500);
  const products = ((data || []) as Product[]).filter(p => p.status === "draft");
  const selected = products.find(p => p.id === query.produto) || products.find(p => p.code === "ENC-RT-2027-001");
  return <main className={styles.page}>
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>TORRE · COMÉRCIO V2 · USO INTERNO</p>
        <h1>Importação de materiais em lote</h1>
        <p>Substitua os materiais ativos de um produto após importar e validar os novos arquivos.</p>
      </div>
      <Link href="/torre/comercio-v2/materiais">Voltar à Biblioteca</Link>
    </header>
    {error && <p className={styles.error}>Não foi possível consultar os produtos.</p>}
    <section className={styles.editor}>
      <form className={styles.editorForm} action="/torre/comercio-v2/materiais/importar/processar" method="POST"
        encType="multipart/form-data">
        <h2>Importar CSV e arquivos</h2>
        <p className={styles.note}>
          Esta ação é exclusiva da Torre. Os arquivos ficam no armazenamento privado do Supabase;
          não são publicados na Área do Cliente. É necessário selecionar o CSV de cadastro e todos
          os arquivos individuais correspondentes. O ZIP serve apenas para organizar o pacote em
          seu computador: extraia-o antes de selecionar os documentos.
        </p>
        <label>Produto
          <select name="product_id" defaultValue={selected?.id || ""} required>
            <option value="" disabled>Selecione um produto</option>
            {products.map(p => <option value={p.id} key={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </label>
        <label>CSV de cadastro (com coluna disponivel_para_aluno)
          <input type="file" name="manifest" accept=".csv,text/csv" required />
        </label>
        <label>Arquivos que constam do CSV (até 20 arquivos)
          <input type="file" name="files" accept=".pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.webp,.zip,.txt"
            multiple required />
        </label>
        <p className={styles.note}>
          No CSV, utilize a coluna <strong>disponivel_para_aluno</strong> com <strong>sim</strong> ou <strong>nao</strong> para cada material. “Sim” permite selecionar o material posteriormente em Produtos → Materiais para entrega; não libera o arquivo ao aluno automaticamente. CSV antigo sem essa coluna é aceito, com todos os materiais marcados como “não”.
        </p>
        <p className={styles.note}>
          O sistema confere os nomes exatos, as categorias, o código do produto, a quantidade
          de arquivos, as extensões e os limites de 25 MB por arquivo e 90 MB por lote.
          Em caso de erro, os materiais anteriores permanecem ativos.
        </p>
        <div className={styles.section}>
          <h3>Confirmação obrigatória</h3>
          <p className={styles.note}>
            Quando a importação terminar, somente os materiais atualmente ativos do produto
            escolhido serão <strong>arquivados</strong>. Eles não serão apagados fisicamente e
            poderão ser restaurados posteriormente. Outros produtos não serão alterados.
          </p>
          <label>Digite o código exato do produto escolhido para confirmar
            <input type="text" name="confirm_code" placeholder="Ex.: ENC-RT-2027-001"
              required autoComplete="off" />
          </label>
        </div>
        <div className={styles.formButtons}>
          <button type="submit" disabled={products.length === 0}>Importar e substituir materiais ativos</button>
          <Link href="/torre/comercio-v2/materiais">Cancelar</Link>
        </div>
      </form>
    </section>
  </main>;
}
