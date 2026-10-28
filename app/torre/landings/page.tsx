import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
export default async function Landings({searchParams}:{searchParams:Promise<{salvo?:string;erro?:string}>}){
 await requireAdmin();const q=await searchParams;
 const {data,error}=await getSupabaseAdmin().from("marketing_landings").select("id,title,slug,status,created_at").order("created_at",{ascending:false}).limit(100);
 return <main style={{padding:28,maxWidth:1200,margin:"auto"}}><p style={{color:"#9b7516",fontWeight:800,fontSize:12}}>MARKETING</p><h1 style={{fontFamily:"Georgia,serif",fontSize:38}}>Landing Pages</h1><p>Crie campanhas e disponibilize materiais gratuitos aos visitantes.</p><Link href="/torre/landings/editor" style={{display:"inline-block",background:"#c9a227",padding:14,borderRadius:7,color:"#102033",fontWeight:800,textDecoration:"none"}}>+ Nova landing</Link>{q.salvo&&<p role="status" style={{color:"green"}}>Landing salva.</p>}{q.erro&&<p role="alert" style={{color:"firebrick"}}>Não foi possível concluir: {q.erro}. Confira os dados e o PDF.</p>}
 <div style={{display:"grid",gap:14,marginTop:26}}>{error?<p>Não foi possível consultar as campanhas. Confira a migração SQL.</p>:(data??[]).map(x=><article key={x.id} style={{padding:20,border:"1px solid #d9e1e9",borderRadius:10,background:"#fff",display:"flex",justifyContent:"space-between",gap:15,flexWrap:"wrap"}}><div><strong>{x.title}</strong><p>{x.status==="published"?"Publicada":"Rascunho"} · dianavoltolini.com.br/l/{x.slug}</p></div><div style={{display:"flex",gap:15}}><Link href={"/torre/landings/editor?id="+x.id}>Editar</Link>{x.status==="published"&&<a href={"https://dianavoltolini.com.br/l/"+x.slug} target="_blank" rel="noreferrer">Abrir página</a>}</div></article>)}</div></main>
}
