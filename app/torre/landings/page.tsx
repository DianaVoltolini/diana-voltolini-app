import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import styles from "./page.module.css";

export const dynamic="force-dynamic";

type LandingRow={
 id:string;
 campaign_name:string|null;
 title:string;
 slug:string;
 status:string;
 created_at:string;
 file_path:string|null;
};

const formatDate=(value:string)=>new Intl.DateTimeFormat("pt-BR",{
 timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",year:"numeric"
}).format(new Date(value));

function fullLandingName(landing:LandingRow){
 const first=(landing.campaign_name??"").trim();
 const second=(landing.title??"").trim();
 return [first,second].filter(Boolean).join(" ").trim()||"Landing sem título";
}

/**
 * Contagem exata dos leads por landing, respeitando o UNIQUE(landing_id,email).
 * Consultas HEAD não transferem dados pessoais e não dependem do limite de
 * 1.000 linhas padrão do Supabase. Lotes evitam muitas conexões simultâneas.
 */
async function leadCounts(db:ReturnType<typeof getSupabaseAdmin>,rows:LandingRow[]){
 const counts=new Map<string,number|null>();
 for(let index=0;index<rows.length;index+=10){
  const batch=rows.slice(index,index+10);
  const results=await Promise.all(batch.map(row=>
   db.from("marketing_leads").select("id",{count:"exact",head:true}).eq("landing_id",row.id)
  ));
  results.forEach((result,offset)=>{
   counts.set(batch[offset].id,result.error?null:(result.count??0));
   if(result.error)console.error("[landings] Falha na contagem de inscritos",{
    landingId:batch[offset].id,code:result.error.code
   });
  });
 }
 return counts;
}

export default async function Landings({searchParams}:{
 searchParams:Promise<{salvo?:string;erro?:string}>
}){
 await requireAdmin();
 const q=await searchParams;
 const db=getSupabaseAdmin();
 const {data,error}=await db.from("marketing_landings")
  .select("id,campaign_name,title,slug,status,file_path,created_at")
  .order("created_at",{ascending:false}).limit(100);
 const rows=(data??[]) as LandingRow[];
 const counts=error?new Map<string,number|null>():await leadCounts(db,rows);
 const published=rows.filter(row=>row.status==="published").length;
 const registered=rows.reduce((sum,row)=>sum+(counts.get(row.id)??0),0);
 const statsComplete=rows.every(row=>counts.get(row.id)!==null&&counts.has(row.id));

 return <main className={styles.main}>
  <header className={styles.header}>
   <div className={styles.headerText}>
    <p className={styles.eyebrow}>MARKETING</p>
    <h1>Landing Pages</h1>
    <p>Gerencie suas páginas, acompanhe as inscrições e acesse os materiais cadastrados.</p>
   </div>
   <Link className={styles.newButton} href="/torre/landings/editor">+ Nova landing</Link>
  </header>

  {q.salvo&&<p role="status" className={styles.success}>Landing salva com sucesso.</p>}
  {q.erro&&<p role="alert" className={styles.error}>Não foi possível concluir: {q.erro}. Confira os dados e o PDF.</p>}

  {!error&&<div className={styles.overview} aria-label="Resumo das landing pages">
   <div><strong>{rows.length}</strong><span>Landings cadastradas</span></div>
   <div><strong>{published}</strong><span>Publicadas</span></div>
   <div><strong>{statsComplete?registered.toLocaleString("pt-BR"):"—"}</strong><span>Cadastros registrados{rows.length===100?" nas páginas exibidas":""}</span></div>
  </div>}

  <section className={styles.list} aria-label="Landing pages cadastradas">
   {error?<p className={styles.error} role="alert">Não foi possível carregar as landings. Tente novamente.</p>:
   rows.length===0?<div className={styles.empty}>Nenhuma landing cadastrada. Crie a primeira página pelo botão acima.</div>:
   rows.map(row=>{
    const url="https://dianavoltolini.com.br/l/"+encodeURIComponent(row.slug);
    const count=counts.get(row.id);
    const isPublished=row.status==="published";
    return <article key={row.id} className={styles.item}>
     <div className={styles.body}>
      <div className={styles.meta}>
       <span className={isPublished?styles.published:styles.draft}>
        <span className={styles.statusDot} aria-hidden="true"/>
        {isPublished?"Publicada":"Rascunho"}
       </span>
       <span className={styles.date}>Criada em {formatDate(row.created_at)}</span>
      </div>
      <h2>{fullLandingName(row)}</h2>
      <div className={styles.publicUrl}>
       {isPublished?<a href={url} target="_blank" rel="noopener noreferrer" title="Abrir a landing pública">
        dianavoltolini.com.br/l/{row.slug} <span aria-hidden="true">↗</span>
       </a>:<span title="O link fica disponível quando a landing for publicada">
        /l/{row.slug} · Link indisponível até a publicação
       </span>}
      </div>
     </div>
     <div className={styles.metrics}>
      <strong>{count===null||count===undefined?"—":count.toLocaleString("pt-BR")}</strong>
      <span>Cadastros para receber</span>
     </div>
     <nav className={styles.actions} aria-label={"Ações da landing "+fullLandingName(row)}>
      <Link className={styles.edit} href={"/torre/landings/editor?id="+row.id}>Editar</Link>
      {row.file_path&&<a href={"/torre/landings/download/"+row.id}>Baixar PDF</a>}
      {isPublished&&<a href={url} target="_blank" rel="noopener noreferrer">Abrir página ↗</a>}
     </nav>
    </article>;
   })}
  </section>
 </main>;
}
