// app/torre/comercio-v2/materiais/tipos/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { saveMaterialType } from "./actions";
import styles from "../materials.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tipos de Material | Área Comercial" };
type Query = { editar?: string; salvo?: string; erro?: string };
type MaterialType = { code: string; name: string; is_active: boolean };
const messages: Record<string, string> = {
  validacao: "Informe um nome entre 2 e 80 caracteres.",
  duplicado: "Esse tipo de material já existe.",
  salvar: "Não foi possível salvar o tipo.",
};

export default async function MaterialTypes({ searchParams }: { searchParams: Promise<Query> }) {
  await requireAdmin();
  const q = await searchParams;
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("commerce_v2_material_types")
    .select("code,name,is_active").order("name").limit(500);
  const types = (data ?? []) as MaterialType[];
  const edit = types.find(t => t.code === q.editar);

  return <main className={styles.page}>
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>TORRE · ÁREA COMERCIAL · BIBLIOTECA</p>
        <h1>Tipos de Material</h1>
        <p>Cadastre um tipo ou edite o nome de um já existente.</p>
      </div>
      <Link className={styles.button} href="/torre/comercio-v2/materiais">Voltar à Biblioteca</Link>
    </header>
    {q.salvo && <p className={styles.message} role="status">Tipo salvo com sucesso.</p>}
    {q.erro && <p className={styles.error} role="alert">{messages[q.erro] ?? "Erro ao salvar."}</p>}
    {error ? <p className={styles.error}>Não foi possível consultar os tipos de materiais.</p> : <>
      <section className={styles.section}>
        <form key={edit?.code ?? "novo"} action={saveMaterialType} className={styles.typeSimpleForm}>
          <input type="hidden" name="code" value={edit?.code ?? ""}/>
          <input type="hidden" name="edit" value={edit ? "yes" : "no"}/>
          <label htmlFor="material-type-name">Tipo de material
            <input id="material-type-name" name="name" required minLength={2} maxLength={80}
              defaultValue={edit?.name ?? ""} placeholder="Ex.: Material complementar"/>
          </label>
          <button type="submit">{edit ? "Salvar alteração" : "Salvar"}</button>
          {edit && <Link href="/torre/comercio-v2/materiais/tipos">Cancelar</Link>}
        </form>
      </section>
      <section className={styles.section}>
        <h2>Tipos cadastrados ({types.length})</h2>
        <div className={styles.typeList}>
          {types.map(t => <div key={t.code} className={styles.typeItem}>
            <strong>{t.name}{!t.is_active && <span className={styles.note}> (inativo)</span>}</strong>
            <Link className={styles.iconButton}
              href={"/torre/comercio-v2/materiais/tipos?editar=" + encodeURIComponent(t.code)}
              title={"Editar " + t.name} aria-label={"Editar " + t.name}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m16 5 3 3M4 20l4.2-.8L20 7.4 16.6 4 4.8 15.8 4 20Z"/>
              </svg>
            </Link>
          </div>)}
        </div>
      </section>
    </>}
  </main>;
}
