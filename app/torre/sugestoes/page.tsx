import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {updateSuggestion} from "./actions";
import styles from "../painel.module.css";
export const metadata:Metadata={title:"Sugestões de conteúdo | Torre"};
export const dynamic="force-dynamic";
const statusText:Record<string,string>={pending:"Pendente",approved:"Em análise",planned:"Planejado",published:"Publicado",rejected:"Rejeitado"};
export default async function SuggestionsAdmin({searchParams}:{searchParams:Promise<{ok?:string;erro?:string}>}){
 await requireAdmin();
 const params=await searchParams;
 const {data,error}=await getSupabaseAdmin().from("fiscal_content_suggestions")
  .select("id,title,description,author_name,author_email,newsletter_opt_in,status,published_url,created_at,fiscal_content_votes(count)")
  .order("created_at",{ascending:false}).limit(300);
 return <main className={styles.page}><section className={styles.content}>
  <header className={styles.pageHeader}><div><p className={styles.eyebrow}>MARKETING · PARTICIPAÇÃO DO LEITOR</p><h1>Sugestões de conteúdo</h1><p>Analise as ideias enviadas pelo site, aprove os temas e vincule os conteúdos publicados.</p></div></header>
  {params.ok&&<p style={{color:"#17673c"}} role="status">Sugestão atualizada.</p>}
  {params.erro&&<p style={{color:"#b42318"}} role="alert">Não foi possível salvar. Confira o status e o endereço do conteúdo publicado.</p>}
  <p><Link href="https://dianavoltolini.com.br/sugestoes" target="_blank">Ver página pública ↗</Link></p>
  {error?<p role="alert">Não foi possível carregar sugestões. Confira se a migração SQL foi aplicada no Supabase.</p>:
   <div style={{display:"grid",gap:14,marginTop:20}}>
    {(data??[]).length===0&&<p>Nenhuma sugestão cadastrada ainda.</p>}
    {(data??[]).map(item=><article key={item.id} style={{background:"#fff",border:"1px solid #dfe7ed",borderRadius:12,padding:22}}>
     <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"space-between"}}>
      <strong style={{fontSize:18}}>{item.title}</strong><span>{statusText[item.status]??item.status} · {Array.isArray(item.fiscal_content_votes)?item.fiscal_content_votes[0]?.count??0:0} votos</span>
     </div>
     <p style={{whiteSpace:"pre-wrap",lineHeight:1.65,margin:"12px 0"}}>{item.description}</p>
     <p style={{fontSize:12,color:"#64748b"}}>{item.author_name?("Enviado por "+item.author_name+" · "):""}{item.author_email?(item.author_email+" · "):""}{item.newsletter_opt_in?"Newsletter autorizada · ":""}{new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(item.created_at))}</p>
     <form action={updateSuggestion} style={{display:"flex",alignItems:"end",flexWrap:"wrap",gap:12,marginTop:16}}>
      <input type="hidden" name="id" value={item.id}/>
      <label style={{display:"grid",gap:5}}>Situação<select name="status" defaultValue={item.status} style={{padding:10,border:"1px solid #cbd5e1",borderRadius:8}}>
       {Object.entries(statusText).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label style={{display:"grid",gap:5,flex:"1 1 250px"}}>Endereço do conteúdo (quando publicado)<input name="published_url" type="text" defaultValue={item.published_url??""} placeholder="/blog/slug-do-conteudo" maxLength={350} style={{padding:10,border:"1px solid #cbd5e1",borderRadius:8,width:"100%"}}/></label>
      <button type="submit" style={{padding:"11px 16px",border:0,borderRadius:8,background:"#caa323",fontWeight:750,cursor:"pointer"}}>Salvar</button>
     </form>
    </article>)}
   </div>}
 </section></main>;
}
