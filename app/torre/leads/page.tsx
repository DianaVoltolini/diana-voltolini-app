import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
const date=(v:string|null)=>v?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(v)):"—";
export default async function LeadsPage({searchParams}:{searchParams:Promise<{page?:string;q?:string}>}){
 await requireAdmin();
 const {page:rawPage,q:rawQ}=await searchParams;
 const page=Math.max(1,Math.min(10000,Number.parseInt(rawPage||"1",10)||1));
 const q=(rawQ||"").trim().slice(0,100);
 const db=getSupabaseAdmin();
 const size=25;
 let request=db.from("marketing_leads")
  .select("id,created_at,name,email,interest,newsletter_opt_in,landing_id",{count:"exact"})
  .order("created_at",{ascending:false});
 if(q)request=request.or(`name.ilike.%${q.replace(/[%_,()]/g,"")}%,email.ilike.%${q.replace(/[%_,()]/g,"")}%`);
 const {data,error,count}=await request.range((page-1)*size,page*size-1);
 const total=count??0;
 return <main style={{maxWidth:1200,margin:"auto",padding:28,color:"#102033"}}>
  <p style={{color:"#9b7516",fontWeight:800,fontSize:12,letterSpacing:"0.1em"}}>MARKETING</p>
  <h1 style={{fontFamily:"Georgia,serif",fontSize:38,margin:"12px 0"}}>Leads</h1>
  <p style={{color:"#607184"}}>Pessoas que solicitaram materiais gratuitos nas landing pages. O consentimento da newsletter é apresentado separadamente.</p>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap",margin:"24px 0"}}>
   <strong>{total} cadastro(s)</strong>
   <form action="/torre/leads" method="get" style={{display:"flex",gap:8}}>
    <input name="q" aria-label="Pesquisar por nome ou e-mail" placeholder="Pesquisar nome ou e-mail" defaultValue={q} style={{padding:"11px 12px",border:"1px solid #d7e0e9",borderRadius:7,minWidth:220}}/>
    <button type="submit" style={{background:"#c9a227",color:"#102033",padding:"11px 16px",border:0,borderRadius:7,fontWeight:750}}>Buscar</button>
   </form>
  </div>
  {error?<p role="alert">Não foi possível consultar os leads.</p>:<div style={{overflowX:"auto",background:"#fff",border:"1px solid #dce4ec",borderRadius:12}}>
   <table style={{borderCollapse:"collapse",width:"100%",minWidth:780,fontSize:13}}>
    <thead style={{background:"#102033",color:"#fff"}}><tr>{["Data","Nome","E-mail","Inscrito","Interesse"].map(x=><th key={x} scope="col" style={{textAlign:"left",padding:14,borderBottom:"3px solid #c9a227"}}>{x}</th>)}</tr></thead>
    <tbody>{(data??[]).map((lead,i)=><tr key={lead.id} style={{background:i%2?"#f8fafc":"#fff"}}>
      <td style={{padding:13,borderBottom:"1px solid #e6ebf0",whiteSpace:"nowrap"}}>{date(lead.created_at)}</td>
      <td style={{padding:13,borderBottom:"1px solid #e6ebf0"}}>{lead.name}</td>
      <td style={{padding:13,borderBottom:"1px solid #e6ebf0",overflowWrap:"anywhere"}}>{lead.email}</td>
      <td style={{padding:13,borderBottom:"1px solid #e6ebf0",color:lead.newsletter_opt_in?"#197148":"#607184",fontWeight:700}}>{lead.newsletter_opt_in?"Sim":"Não"}</td>
      <td style={{padding:13,borderBottom:"1px solid #e6ebf0"}}>{lead.interest||"—"}</td>
     </tr>)}</tbody>
   </table>{!data?.length&&<p style={{padding:22}}>Nenhum lead encontrado.</p>}
  </div>}
  <nav aria-label="Páginas de leads" style={{display:"flex",justifyContent:"space-between",marginTop:24}}>
   {page>1?<a href={`/torre/leads?page=${page-1}&q=${encodeURIComponent(q)}`}>← Anterior</a>:<span/>}
   <span>Página {page} de {Math.max(1,Math.ceil(total/size))}</span>
   {page*size<total?<a href={`/torre/leads?page=${page+1}&q=${encodeURIComponent(q)}`}>Próxima →</a>:<span/>}
  </nav>
 </main>;
}
