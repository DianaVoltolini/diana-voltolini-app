import {notFound} from "next/navigation";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import LandingEditorForm from "./LandingEditorForm";
import styles from "./page.module.css";
export const dynamic="force-dynamic";
export default async function EditLanding({searchParams}:{searchParams:Promise<{id?:string}>}){
 await requireAdmin();const {id}=await searchParams;
 const {data,error}=id?await getSupabaseAdmin().from("marketing_landings").select("*").eq("id",id).maybeSingle():{data:null,error:null};
 if(id&&(!data||error))notFound();
 return <main className={styles.main}><Link href="/torre/landings">← Voltar para Landing Pages</Link><p className={styles.kicker}>CONSTRUTOR DE LANDING</p><h1>{data?"Editar landing":"Nova landing"}</h1><p>Modelo padrão para entregar gratuitamente um PDF. A newsletter é opcional para o visitante.</p>
 <LandingEditorForm landing={data}/></main>;
}
