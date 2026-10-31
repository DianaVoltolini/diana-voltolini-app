import LeadFilters from "./lead-filters";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
const date=(v:string|null)=>v?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(v)):"—";
export default async function LeadsPage({searchParams}:{searchParams:Promise<{page?:string;q?:string;inscrito?:string;interesse?:string;origem?:string}>}){
 await requireAdmin();
 const {page:rawPage,q:rawQ,inscrito:rawInscrito,interesse:rawInteresse,origem:rawOrigem}=await searchParams;
 const inscrito=rawInscrito==="sim"||rawInscrito==="nao"?rawInscrito:"";
 const interesse=(rawInteresse||"").trim().slice(0,120);
 const origem=rawOrigem==="landing"||rawOrigem==="newsletter"?rawOrigem:"";
 const page=Math.max(1,Math.min(10000,Number.parseInt(rawPage||"1",10)||1));
 const q=(rawQ||"").trim().slice(0,100);
 const db=getSupabaseAdmin();
 const size=25;
 const {data:interestRows}=await db.from("marketing_leads").select("interest").not("interest","is",null).limit(2000);
 const interests=Array.from(new Set((interestRows??[]).map(row=>row.interest).filter((v):v is string=>typeof v==="string"&&v.length>0))).sort((a,b)=>a.localeCompare(b,"pt-BR"));
 const clean=q.replace(/[%_,()]/g,"");
 const filterQuery=(rows:{id:string;created_at:string;name:string|null;email:string;interest:string|null;newsletter_opt_in:boolean;origin:string}[])=>rows.filter(x=>(!inscrito||x.newsletter_opt_in===(inscrito==="sim"))&&(!interesse||x.interest===interesse)&&(!origem||x.origin===origem)&&(!clean||((x.name??"")+" "+x.email).toLowerCase().includes(clean.toLowerCase())));
 const [{data:leadRows,error:leadError},{data:newsletterRows,error:newsletterError},{data:unsubRows,error:unsubError}]=await Promise.all([
  db.from("marketing_leads").select("id,created_at,name,email,interest,newsletter_opt_in").order("created_at",{ascending:false}).limit(3000),
  db.from("marketing_newsletter_subscribers").select("id,created_at,name,email,newsletter_opt_in").order("created_at",{ascending:false}).limit(3000),
  db.from("marketing_email_unsubscribes").select("email").limit(3000)
 ]);
 const blocked=new Set((unsubRows??[]).map(v=>v.email.trim().toLowerCase()));
 const combined=[
  ...(leadRows??[]).map(x=>({...x,origin:"landing"})),
  ...(newsletterRows??[]).map(x=>({...x,interest:null as string|null,origin:"newsletter"}))
 ].map(x=>({...x,newsletter_opt_in:x.newsletter_opt_in&&!blocked.has(x.email.trim().toLowerCase())}));
 const filtered=filterQuery(combined).sort((a,b)=>b.created_at.localeCompare(a.created_at));
 const total=filtered.length;
 const data=filtered.slice((page-1)*size,page*size);
 const error=leadError||newsletterError||unsubError;
 const filters=new URLSearchParams();if(q)filters.set("q",q);if(inscrito)filters.set("inscrito",inscrito);if(interesse)filters.set("interesse",interesse);if(origem)filters.set("origem",origem);
 const pageHref=(p:number)=>{const params=new URLSearchParams(filters);params.set("page",String(p));return "/torre/leads?"+params.toString()};
 return <main style={{maxWidth:1200,margin:"auto",padding:28,color:"#102033"}}>
  <p style={{color:"#9b7516",fontWeight:800,fontSize:12,letterSpacing:"0.1em"}}>MARKETING</p>
  <h1 style={{fontFamily:"Georgia,serif",fontSize:38,margin:"12px 0"}}>Leads</h1>
  <p style={{color:"#607184"}}>Contatos cadastrados pelas landing pages e pela newsletter da página principal. Inscrições canceladas aparecem como não inscritas.</p>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}><strong>{total} cadastro(s) encontrado(s)</strong><Link href="/torre/leads/enviar/manual" style={{background:"#c9a227",padding:"12px 18px",borderRadius:7,color:"#102033",fontWeight:800,textDecoration:"none"}}>Enviar e-mail</Link></div>
  <LeadFilters query={q} subscribed={inscrito} interest={interesse} interests={interests} origin={origem}/>
  {error?<p role="alert">Não foi possível consultar os leads.</p>:<div style={{overflowX:"auto",background:"#fff",border:"1px solid #dce4ec",borderRadius:12}}>
   <table style={{borderCollapse:"collapse",width:"100%",minWidth:920,fontSize:13}}>
    <thead style={{background:"#102033",color:"#fff"}}><tr>{["Data","Nome","E-mail","Origem","Inscrito","Interesse"].map(x=><th key={x} scope="col" style={{textAlign:"left",padding:14,borderBottom:"3px solid #c9a227"}}>{x}</th>)}</tr></thead>
    <tbody>{(data??[]).map((lead,i)=><tr key={lead.id} style={{background:i%2?"#f8fafc":"#fff"}}>
      <td style={{padding:13,borderBottom:"1px solid #e6ebf0",whiteSpace:"nowrap"}}>{date(lead.created_at)}</td>
      <td style={{padding:13,borderBottom:"1px solid #e6ebf0"}}>{lead.name}</td>
      <td style={{padding:13,borderBottom:"1px solid #e6ebf0",overflowWrap:"anywhere"}}>{lead.email}</td>
      <td style={{padding:13,borderBottom:"1px solid #e6ebf0"}}>{lead.origin==="newsletter"?"Newsletter da página principal":"Landing Page"}</td>
      <td style={{padding:13,borderBottom:"1px solid #e6ebf0",color:lead.newsletter_opt_in?"#197148":"#607184",fontWeight:700}}>{lead.newsletter_opt_in?"Sim":"Não"}</td>
      <td style={{padding:13,borderBottom:"1px solid #e6ebf0"}}>{lead.interest||"—"}</td>
     </tr>)}</tbody>
   </table>{!data?.length&&<p style={{padding:22}}>Nenhum lead encontrado.</p>}
  </div>}
  <nav aria-label="Páginas de leads" style={{display:"flex",justifyContent:"space-between",marginTop:24}}>
   {page>1?<a href={pageHref(page-1)}>← Anterior</a>:<span/>}
   <span>Página {page} de {Math.max(1,Math.ceil(total/size))}</span>
   {page*size<total?<a href={pageHref(page+1)}>Próxima →</a>:<span/>}
  </nav>
 </main>;
}
