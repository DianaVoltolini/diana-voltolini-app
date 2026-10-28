import {notFound} from "next/navigation";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {saveLanding} from "../actions";
import styles from "./page.module.css";
export const dynamic="force-dynamic";
export default async function EditLanding({searchParams}:{searchParams:Promise<{id?:string}>}){
 await requireAdmin();const {id}=await searchParams;
 const {data,error}=id?await getSupabaseAdmin().from("marketing_landings").select("*").eq("id",id).maybeSingle():{data:null,error:null};
 if(id&&(!data||error))notFound();
 return <main className={styles.main}><Link href="/torre/landings">← Voltar para Landing Pages</Link><p className={styles.kicker}>CONSTRUTOR DE LANDING</p><h1>{data?"Editar landing":"Nova landing"}</h1><p>Modelo padrão para entregar gratuitamente um PDF. A newsletter é opcional para o visitante.</p>
 <form action={saveLanding} className={styles.form} encType="multipart/form-data">
 <input type="hidden" name="id" value={data?.id??""}/>
 <div className={styles.grid}>
 <label>Nome da landing (primeira linha da página)<input name="campaign_name" maxLength={120} defaultValue={data?.campaign_name??""} placeholder="E-book gratuito"/></label>
 <label>Título principal (segunda linha)<input required name="title" maxLength={160} defaultValue={data?.title??""}/></label>
 <label>Endereço da campanha (slug)<input required name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={data?.slug??""} placeholder="checklist-ibs-cbs"/></label>
 <label>Identificação superior<input name="eyebrow" maxLength={100} defaultValue={data?.eyebrow??"MATERIAL GRATUITO"}/></label>
 <label>Texto do botão<input name="button_text" maxLength={100} defaultValue={data?.button_text??"Receber material gratuito"}/></label>
 </div>
 <label>Descrição da oferta<textarea required name="summary" rows={4} maxLength={1000} defaultValue={data?.summary??""}/></label>
 <div className={styles.grid}>
 <label>Benefício 1<input name="benefit_1" maxLength={160} defaultValue={data?.benefit_1??""}/></label>
 <label>Benefício 2<input name="benefit_2" maxLength={160} defaultValue={data?.benefit_2??""}/></label>
 <label>Benefício 3<input name="benefit_3" maxLength={160} defaultValue={data?.benefit_3??""}/></label>
 </div>
 <label>Capa da landing (PNG, JPG, WebP ou PDF, máximo 5 MB)<input type="file" name="cover" accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"/>{data?.cover_path&&<small>Capa já cadastrada. Selecione uma nova para substituir.</small>}</label>
 <label>Título da entrega<input name="delivery_title" maxLength={180} defaultValue={data?.delivery_title??"Seu material está pronto"}/></label>
 <label>Material para download — PDF (máximo 10 MB)<input type="file" name="file" accept="application/pdf"/>{data?.file_path&&<small>Arquivo já cadastrado. Envie outro apenas para substituir a entrega nas próximas inscrições.</small>}</label>
 <label>Status<select name="status" defaultValue={data?.status??"draft"}><option value="draft">Rascunho</option><option value="published">Publicada</option></select></label>
 <button type="submit">Salvar landing</button>
 </form></main>;
}
