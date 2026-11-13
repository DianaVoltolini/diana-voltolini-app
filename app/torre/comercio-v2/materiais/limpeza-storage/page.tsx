// app/torre/comercio-v2/materiais/limpeza-storage/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { auditStorage } from "./audit";
import { removeSelectedOrphans } from "./actions";
import css from "../../commercial.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Limpeza do Storage | Área Comercial" };
const errors: Record<string, string> = {
  confirmacao: "Marque a confirmação explícita antes de excluir.",
  selecao: "Selecione de 1 a 100 arquivos válidos.",
  auditoria: "A auditoria falhou. Nenhum arquivo foi excluído.",
  alterado: "A lista mudou ou contém um arquivo em uso. Atualize a página; nenhuma exclusão foi feita.",
  referencia: "Foi encontrada uma referência ao arquivo. Exclusão cancelada.",
  exclusao: "A API do Storage não confirmou a exclusão. Verifique novamente antes de repetir.",
};
export default async function StorageCleanup({ searchParams }: {
  searchParams: Promise<{ erro?: string; excluidos?: string }>;
}) {
  await requireAdmin();
  const q = await searchParams;
  let report: Awaited<ReturnType<typeof auditStorage>> | null = null;
  let failure = "";
  try { report = await auditStorage(); }
  catch (e) { failure = e instanceof Error ? e.message : "Falha na auditoria."; }
  return <main className={css.page}>
    <header className={css.header}><div>
      <p className={css.eyebrow}>TORRE · ÁREA COMERCIAL · BIBLIOTECA</p>
      <h1 className={css.title}>Limpeza de arquivos de teste</h1>
      <p className={css.subtitle}>Auditoria restrita ao bucket privado commerce-v2-materials. Nenhuma exclusão é automática.</p>
    </div><Link className={css.secondary} href="/torre/comercio-v2/materiais">Voltar à Biblioteca</Link></header>
    <div className={css.banner}><strong>Exclusão definitiva</strong>
      Arquivos físicos excluídos do Storage não podem ser recuperados pela Torre. A rotina preserva caminhos associados à Biblioteca, revalida a seleção e não altera checkout ou compras.</div>
    {q.erro && <p className={css.error} role="alert">{errors[q.erro] ?? "Falha na operação."}</p>}
    {q.excluidos !== undefined && <p className={css.message} role="status">Arquivos cuja exclusão foi retornada pela API: {q.excluidos}. Confira a nova auditoria abaixo.</p>}
    {failure && <p className={css.error} role="alert">{failure} Nenhuma exclusão está disponível.</p>}
    {report && <section className={css.section}>
      <h2>Conferência atual</h2>
      <p>Arquivos encontrados: <strong>{report.total}</strong> · Referenciados e protegidos: <strong>{report.protectedCount}</strong> · Candidatos órfãos: <strong>{report.orphanPaths.length}</strong>.</p>
      <p className={css.note}>A rotina só considera arquivos com nomenclatura padrão UUID/UUID.ext dentro das pastas de produtos V2. Outros arquivos exigem auditoria separada.</p>
      {report.orphanPaths.length ? <form action={removeSelectedOrphans} className={css.form}>
        <div className={css.tableScroll}><table className={css.table}>
          <thead><tr><th>Selecionar</th><th>Caminho do arquivo sem vínculo</th></tr></thead>
          <tbody>{report.orphanPaths.map(path => <tr key={path}><td><input type="checkbox" name="paths" value={path} aria-label={"Excluir " + path}/></td><td style={{overflowWrap:"anywhere"}}>{path}</td></tr>)}</tbody>
        </table></div>
        <label style={{display:"flex",alignItems:"center",gap:10}}>
          <input type="checkbox" name="confirm" value="EXCLUIR TESTES" style={{width:20}} required/>
          Confirmo que os arquivos selecionados são testes e autorizo sua exclusão definitiva.
        </label>
        <div><button type="submit">Excluir apenas os arquivos selecionados</button></div>
      </form> : <p className={css.message}>Nenhum arquivo órfão elegível encontrado.</p>}
    </section>}
  </main>;
}
