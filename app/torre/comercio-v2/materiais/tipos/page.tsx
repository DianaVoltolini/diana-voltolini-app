// app/torre/comercio-v2/materiais/tipos/page.tsx
import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {saveMaterialType} from "./actions";
import styles from "../materials.module.css";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Tipos de Material | Área Comercial"};
type Query={editar?:string;salvo?:string;erro?:string};
type MaterialType={code:string;name:string;is_active:boolean};
const messages:Record<string,string>={validacao:"Informe um código válido e um nome de 2 a 80 caracteres.",
 duplicado:"Esse código já está cadastrado.",salvar:"Não foi possível salvar o tipo."};
export default async function MaterialTypes({searchParams}:{searchParams:Promise<Query>}){
 await requireAdmin();
 const q=await searchParams,db=getSupabaseAdmin();
 const {data,error}=await db.from("commerce_v2_material_types")
   .select("code,name,is_active").order("name").limit(500);
 const types=(data??[]) as MaterialType[];
 const edit=types.find(t=>t.code===q.editar);
 return <main className={styles.page}>
   <header className={styles.header}><div>
     <p className={styles.eyebrow}>TORRE · ÁREA COMERCIAL · BIBLIOTECA</p>
     <h1>Tipos de Material</h1>
     <p>Cadastre e edite os tipos usados nos materiais. Os códigos internos permanecem estáveis para preservar arquivos existentes.</p>
   </div><Link className={styles.button} href="/torre/comercio-v2/materiais">Voltar à Biblioteca</Link></header>
   {q.salvo&&<p className={styles.message}>Tipo salvo com sucesso.</p>}
   {q.erro&&<p className={styles.error}>{messages[q.erro]??"Erro ao salvar."}</p>}
   {error?<p className={styles.error}>Cadastro de tipos indisponível. Execute a migração SQL antes de utilizar esta tela.</p>:<>
     <section className={styles.section}>
       <h2>Tipos cadastrados ({types.length})</h2>
       <div className={styles.typeList}>{types.map(t=><div key={t.code} className={styles.typeItem}>
         <div><strong>{t.name}</strong><small>Código: {t.code} · {t.is_active?"Disponível":"Inativo"}</small></div>
         <Link className={styles.iconButton} href={"/torre/comercio-v2/materiais/tipos?editar="+encodeURIComponent(t.code)+"#cadastro"} title={"Editar "+t.name} aria-label={"Editar "+t.name}>
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 5 3 3M4 20l4.2-.8L20 7.4 16.6 4 4.8 15.8 4 20Z"/></svg>
         </Link>
       </div>)}</div>
     </section>
     <section className={styles.section} id="cadastro">
       <h2>{edit?"Editar tipo":"Cadastrar tipo"}</h2>
       {edit&&<p><Link href="/torre/comercio-v2/materiais/tipos#cadastro">+ Novo tipo</Link></p>}
       <form key={edit?.code??"new"} action={saveMaterialType} className={styles.editorForm}>
         <input type="hidden" name="edit" value={edit?"yes":"no"}/>
         <div className={styles.editorRow}>
           <label>Código interno<input name="code" required maxLength={30} pattern="[a-z][a-z0-9_]{1,29}"
             readOnly={Boolean(edit)} defaultValue={edit?.code??""} placeholder="ex.: modelo_nfe"/></label>
           <label>Nome do tipo<input name="name" required maxLength={80} minLength={2}
             defaultValue={edit?.name??""} placeholder="Ex.: Modelo de NF-e"/></label>
         </div>
         <label className={styles.choiceRow}>
           <input type="checkbox" name="is_active" value="yes" defaultChecked={edit?.is_active??true}/>
           <span>Disponível para selecionar nos cadastros de materiais</span>
         </label>
         <p className={styles.note}>Desativar um tipo apenas impede novas seleções; os materiais já classificados continuam preservados.</p>
         <div className={styles.formButtons}><button type="submit">Salvar tipo</button></div>
       </form>
     </section>
   </>}
 </main>;
}
