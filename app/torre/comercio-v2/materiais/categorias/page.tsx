// app/torre/comercio-v2/materiais/categorias/page.tsx
import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {saveMaterialSubject} from "./actions";
import styles from "../materials.module.css";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Categorias de Materiais | Torre"};
type Query={editar?:string;salvo?:string;erro?:string};
const message:Record<string,string>={validacao:"Informe um nome entre 2 e 80 caracteres.",duplicado:"Esta categoria já existe.",salvar:"Não foi possível salvar a categoria."};
export default async function CategoriesPage({searchParams}:{searchParams:Promise<Query>}){
 await requireAdmin();
 const query=await searchParams;
 const {data,error}=await getSupabaseAdmin().from("commerce_v2_material_subjects")
  .select("code,name,is_active").order("name").limit(500);
 const subjects=data??[];
 const current=subjects.find(s=>s.code===query.editar);
 return <main className={styles.page}>
  <header className={styles.header}><div>
    <p className={styles.eyebrow}>TORRE · ÁREA COMERCIAL</p>
    <h1>Categorias dos Materiais</h1>
    <p>Classifique os arquivos por assunto, independentemente do tipo e dos produtos.</p>
   </div><Link href="/torre/comercio-v2/materiais/novo">Voltar ao cadastro</Link></header>
  {query.salvo&&<p className={styles.message} role="status">Categoria salva com sucesso.</p>}
  {query.erro&&<p className={styles.error} role="alert">{message[query.erro]??"Não foi possível salvar."}</p>}
  {error?<p className={styles.error}>Não foi possível consultar as categorias.</p>:<>
   <section className={styles.section}>
    <form key={current?.code??"novo"} action={saveMaterialSubject} className={styles.typeSimpleForm}>
     <input type="hidden" name="code" value={current?.code??""}/>
     <input type="hidden" name="edit" value={current?"yes":"no"}/>
     <label>Categoria
      <input name="name" required minLength={2} maxLength={80}
       defaultValue={current?.name??""} placeholder="Ex.: Lucro Presumido"/>
     </label>
     <button type="submit">{current?"Salvar alteração":"Salvar categoria"}</button>
     {current&&<Link href="/torre/comercio-v2/materiais/categorias">Cancelar</Link>}
    </form>
   </section>
   <section className={styles.section}><h2>Categorias cadastradas ({subjects.length})</h2>
    <div className={styles.typeList}>{subjects.map(s=><div key={s.code} className={styles.typeItem}>
     <strong>{s.name}{!s.is_active&&<span className={styles.note}> (inativa)</span>}</strong>
     <Link href={"/torre/comercio-v2/materiais/categorias?editar="+encodeURIComponent(s.code)}
      className={styles.actionText} aria-label={"Editar "+s.name}>Editar</Link>
    </div>)}</div>
   </section>
  </>}
 </main>;
}
