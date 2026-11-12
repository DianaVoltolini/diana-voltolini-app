// app/torre/comercio-v2/produtos/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { saveCommerceV2Product } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Produtos V2 (piloto) | Torre" };
type Query = { edit?: string; salvo?: string; erro?: string };
type Product = {
  id: string; code: string; name: string; short_name: string | null;
  product_type: string; summary: string | null; description: string | null;
  delivery_description: string | null; sales_page_url: string | null;
  status: string; created_at: string;
};
const errorText: Record<string, string> = {
  validacao: "Confira os campos obrigatórios e seus limites.",
  url: "Informe uma URL HTTPS válida.",
  duplicado: "Este código já está cadastrado.",
  codigo: "O código não pode ser alterado após o cadastro.",
  salvar: "Não foi possível salvar. Confira a migração e tente novamente.",
  indisponivel: "Produto não encontrado ou cadastro V2 indisponível.",
};
const types: Record<string, string> = {
  ebook: "E-book", online_event: "Encontro online", course: "Curso",
  service: "Serviço", other: "Outro",
};
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "12px", borderRadius: 8,
  border: "1px solid #cbd5e1", background: "#fff", color: "#142137",
  marginTop: 6, boxSizing: "border-box",
};
const fieldStyle: React.CSSProperties = { display: "block", fontSize: 14, fontWeight: 600, marginBottom: 14 };
function humanDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
export default async function ProductsV2({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("commerce_v2_products")
    .select("id,code,name,short_name,product_type,summary,description,delivery_description,sales_page_url,status,created_at")
    .order("created_at", { ascending: false }).limit(100);
  const products = (data ?? []) as Product[];
  const edit = query.edit ? products.find(p => p.id === query.edit) : null;

  return <main style={{ maxWidth: 1150, margin: "0 auto", padding: "28px 20px 64px" }}>
    <p style={{ color: "#956f18", fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>TORRE · COMÉRCIO V2 · PILOTO ISOLADO</p>
    <h1 style={{ fontSize: 32, marginBottom: 8 }}>Produtos V2</h1>
    <p style={{ color: "#475569", maxWidth: 780, lineHeight: 1.6 }}>
      Cadastro experimental independente dos produtos em venda. Organize os arquivos de cada produto na Biblioteca de Materiais. Nesta fase, tudo permanece em rascunho:
      não existem checkout, publicação, Bling ou entrega automática na V2.
    </p>
    <p><Link href="/torre/comercio-v2/materiais">Abrir Biblioteca de Materiais</Link></p>
    {query.salvo === "1" && <p role="status" style={{ color: "#166534" }}>Produto V2 salvo em rascunho.</p>}
    {query.erro && <p role="alert" style={{ color: "#b91c1c" }}>{errorText[query.erro] ?? "Não foi possível concluir a operação."}</p>}
    {error && <section role="alert" style={{ padding: 18, border: "1px solid #fca5a5", borderRadius: 10 }}>
      O catálogo V2 não está disponível. Verifique se a migração SQL específica da V2 foi aplicada.
      <p style={{ fontSize: 12 }}>Nenhum cadastro legado foi alterado.</p>
    </section>}
    {!error && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24, marginTop: 28, alignItems: "start" }}>
      <section style={{ background: "#fff", border: "1px solid #dbe2ee", borderRadius: 14, padding: 22 }}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>{edit ? "Editar produto piloto" : "Novo produto piloto"}</h2>
        {edit && <Link href="/torre/comercio-v2/produtos">+ Cadastrar outro</Link>}
        <form action={saveCommerceV2Product} style={{ marginTop: 20 }}>
          <input type="hidden" name="id" value={edit?.id ?? ""} />
          <label style={fieldStyle}>Código interno
            <input style={{ ...inputStyle, background: edit ? "#f1f5f9" : "#fff" }}
              name="code" required maxLength={60} minLength={3}
              pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,59}"
              defaultValue={edit?.code ?? "TESTE-FLUXO-001"} readOnly={Boolean(edit)} />
          </label>
          <label style={fieldStyle}>Nome comercial
            <input style={inputStyle} name="name" required minLength={3} maxLength={180}
              defaultValue={edit?.name ?? "Produto piloto — Validação da Torre V2"} />
          </label>
          <label style={fieldStyle}>Nome resumido
            <input style={inputStyle} name="short_name" maxLength={120} defaultValue={edit?.short_name ?? ""} />
          </label>
          <label style={fieldStyle}>Tipo
            <select style={inputStyle} name="product_type" defaultValue={edit?.product_type ?? "online_event"}>
              {Object.entries(types).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
            </select>
          </label>
          <label style={fieldStyle}>Descrição curta
            <textarea style={inputStyle} name="summary" rows={3} maxLength={600} defaultValue={edit?.summary ?? ""} />
          </label>
          <label style={fieldStyle}>Descrição completa
            <textarea style={inputStyle} name="description" rows={5} maxLength={8000} defaultValue={edit?.description ?? ""} />
          </label>
          <label style={fieldStyle}>O que será entregue
            <textarea style={inputStyle} name="delivery_description" rows={4} maxLength={4000}
              defaultValue={edit?.delivery_description ?? "Material demonstrativo, sem cobrança ou entrega real."} />
          </label>
          <label style={fieldStyle}>Link da página (somente referência)
            <input style={inputStyle} name="sales_page_url" type="url" maxLength={500}
              placeholder="https://..." defaultValue={edit?.sales_page_url ?? ""} />
          </label>
          <p style={{ fontSize: 13, color: "#64748b" }}>
            Situação: <strong>Rascunho obrigatório.</strong> Preço, ofertas, links públicos e checkout serão implantados em etapas separadas.
          </p>
          <button type="submit" style={{ padding: "13px 18px", background: "#173c71", color: "#fff", border: 0, borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Salvar rascunho</button>
        </form>
      </section>
      <section style={{ background: "#fff", border: "1px solid #dbe2ee", borderRadius: 14, padding: 22 }}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>Cadastros V2 ({products.length})</h2>
        {products.length === 0 && <p>Nenhum produto piloto cadastrado.</p>}
        {products.map(product => <article key={product.id} style={{ padding: "16px 0", borderBottom: "1px solid #e2e8f0" }}>
          <strong>{product.name}</strong>
          <p style={{ fontSize: 13, color: "#64748b", margin: "6px 0" }}>{product.code} · {types[product.product_type] ?? product.product_type} · Rascunho</p>
          <p style={{ fontSize: 12, color: "#64748b" }}>Criado em {humanDate(product.created_at)}</p>
          <Link href={"/torre/comercio-v2/produtos?edit=" + encodeURIComponent(product.id)}>Editar cadastro</Link> <span style={{ margin: "0 8px" }}>·</span> <Link href={"/torre/comercio-v2/materiais?produto=" + encodeURIComponent(product.id)}>Ver materiais</Link>
        </article>)}
      </section>
    </div>}
  </main>;
}
