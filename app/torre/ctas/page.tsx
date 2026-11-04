import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {saveFiscalCta,deleteFiscalCta} from "./actions";
import styles from "../painel.module.css";

export const metadata:Metadata={title:"CTAs do Blog | Torre de Controle",robots:{index:false}};
export const dynamic="force-dynamic";
const field={display:"block",width:"100%",padding:11,border:"1px solid #cbd5e1",borderRadius:8,marginTop:6,background:"#fff",color:"#102033"} as const;
export default async function CtaCatalog({searchParams}:{searchParams:Promise<{editar?:string;salvo?:string;excluido?:string;erro?:string}>}){
 await requireAdmin();
 const params=await searchParams;
 const db=getSupabaseAdmin();
 const [{data:ctas,error},{data:refs,error:refsError}]=await Promise.all([
  db.from("fiscal_ctas").select("id,name,title,description,button_label,url,active").order("name",{ascending:true}).limit(500),
  db.from("fiscal_articles").select("cta_id").not("cta_id","is",null).limit(1000)
 ]);
 const edit=(ctas??[]).find(c=>c.id===params.editar);
 const used=new Map<string,number>();for(const r of refs??[])if(r.cta_id)used.set(r.cta_id,(used.get(r.cta_id)??0)+1);
 return <main className={styles.page}><section className={styles.content}><div className="container" style={{maxWidth:1100}}>
  <header className={styles.pageHeader}><div><p className={styles.eyebrow}>BLOG · MARKETING</p><h1>CTAs do Blog</h1><p>Cadastre chamadas para ação uma única vez e selecione-as nos conteúdos. Alterações em um CTA são aplicadas aos conteúdos vinculados.</p></div></header>
  <p><Link href="/torre/conteudos" style={{color:"#87650d",fontWeight:750}}>← Voltar ao Blog</Link></p>
  {params.salvo&&<p role="status" style={{color:"#167143",fontWeight:700}}>CTA salvo com sucesso.</p>}
  {params.excluido&&<p role="status" style={{color:"#167143",fontWeight:700}}>CTA excluído.</p>}
  {params.erro&&<p role="alert" style={{color:"#b42318",fontWeight:700}}>{params.erro==="emuso"?"Este CTA está vinculado a conteúdos. Retire os vínculos antes de excluí-lo.":params.erro==="dados"?"Preencha todos os campos e use um link seguro dos domínios Diana Voltolini.":"Não foi possível salvar. Verifique o cadastro no Supabase."}</p>}
  {error||refsError?<p role="alert">Não foi possível carregar os CTAs. Confirme a migração do Supabase.</p>:<>
   <section style={{background:"#fff",border:"1px solid #dce4ec",borderRadius:12,padding:24,margin:"20px 0 26px"}}>
    <h2 style={{margin:"0 0 17px",fontSize:22}}>{edit?"Editar CTA":"Cadastrar novo CTA"}</h2>
    <form action={saveFiscalCta} style={{display:"grid",gap:14}}>
     <input type="hidden" name="id" value={edit?.id??""}/>
     <label>Nome interno do CTA<input required maxLength={120} name="name" style={field} defaultValue={edit?.name??""} placeholder="Diagnóstico Expresso IBS/CBS"/></label>
     <label>Título exibido no Blog<input required maxLength={180} name="title" style={field} defaultValue={edit?.title??""} placeholder="Seu faturamento está preparado para IBS e CBS?"/></label>
     <label>Descrição exibida no Blog<textarea required maxLength={600} name="description" style={field} rows={3} defaultValue={edit?.description??""} placeholder="Explique o benefício da oferta para o leitor."/></label>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
      <label>Texto do botão<input required maxLength={80} name="button_label" style={field} defaultValue={edit?.button_label??""} placeholder="Quero meu diagnóstico"/></label>
      <label>Endereço do botão<input required maxLength={500} name="url" style={field} defaultValue={edit?.url??""} placeholder="https://dianavoltolini.com.br/diagnostico-ibs-cbs"/></label>
     </div>
     <label style={{display:"flex",gap:9,alignItems:"center"}}><input type="checkbox" name="active" value="yes" defaultChecked={edit?.active??true}/> Disponível para selecionar nos conteúdos</label>
     <div style={{display:"flex",gap:12,alignItems:"center"}}><button type="submit" className={styles.openLink} style={{cursor:"pointer",border:0}}>Salvar CTA</button>{edit&&<Link href="/torre/ctas" style={{color:"#87650d"}}>Cancelar edição</Link>}</div>
    </form>
   </section>
   <section style={{background:"#fff",border:"1px solid #dce4ec",borderRadius:12,padding:24}}>
    <h2 style={{margin:"0 0 16px",fontSize:22}}>CTAs cadastrados</h2>
    <div style={{display:"grid",gap:12}}>
     {(ctas??[]).map(c=><article key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:15,flexWrap:"wrap",padding:15,border:"1px solid #e2e7ee",borderRadius:9}}>
      <div style={{flex:"1 1 310px"}}><strong>{c.name}</strong><p style={{margin:"6px 0",fontSize:13,color:"#52667b"}}>{c.title}</p><small>{c.active?"Ativo":"Inativo"} · {used.get(c.id)??0} conteúdo(s) vinculado(s)</small></div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
       <Link href={"/torre/ctas?editar="+encodeURIComponent(c.id)} style={{fontWeight:700,color:"#87650d"}}>Editar</Link>
       {(used.get(c.id)??0)===0?<form action={deleteFiscalCta}><input type="hidden" name="id" value={c.id}/><button type="submit" style={{background:"transparent",border:"1px solid #d5a0a0",color:"#9f2929",borderRadius:6,padding:"9px 12px",cursor:"pointer"}}>Excluir</button></form>:<span title="Desvincule dos conteúdos antes de excluir" style={{color:"#607184",fontSize:12}}>Em uso</span>}
      </div>
     </article>)}
     {!ctas?.length&&<p style={{color:"#607184"}}>Nenhum CTA cadastrado.</p>}
    </div>
   </section>
  </>}
 </div></section></main>;
}
