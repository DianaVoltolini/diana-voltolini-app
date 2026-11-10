"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
type Row={id:string;name:string;email:string;document:string;phone:string;address:string;products:string[];registered:string};
const field={background:"#fff",border:"1px solid #d4dfe8",borderRadius:8,padding:"11px 12px",fontSize:13,width:"100%"};
export default function ClientDirectory({rows,products}:{rows:Row[];products:{id:string;name:string}[]}){
 const [q,setQ]=useState(""),[purchase,setPurchase]=useState("all");
 const offers=useMemo(()=>Array.from(new Set(rows.flatMap(r=>r.products))).sort(),[rows]);
 const results=rows.filter(r=>(purchase==="all"||r.products.includes(purchase))&&[r.name,r.email,r.document,r.phone,r.address,...r.products].join(" ").toLocaleLowerCase("pt-BR").includes(q.trim().toLocaleLowerCase("pt-BR")));
 return <>
 <div style={{display:"grid",gridTemplateColumns:"minmax(230px,2fr) minmax(200px,1fr)",gap:12,marginBottom:14}}>
 <label style={{fontWeight:700,fontSize:13}}>Pesquisar cliente<input type="search" style={field} value={q} onChange={e=>setQ(e.target.value)} placeholder="Nome, e-mail, CPF/CNPJ, WhatsApp, cidade"/></label>
 <label style={{fontWeight:700,fontSize:13}}>Produto adquirido<select style={field} value={purchase} onChange={e=>setPurchase(e.target.value)}><option value="all">Todos</option>{offers.map(o=><option key={o}>{o}</option>)}</select></label>
 </div>
 <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap",marginBottom:12}}><p style={{fontSize:12,color:"#68788a"}}>{results.length} clientes encontrados. Dados ausentes aparecem como não informados.</p><Link href={"/torre/clientes/campanhas"+(purchase!=="all"&&products.some(p=>p.name===purchase)?"?produto="+encodeURIComponent(products.find(p=>p.name===purchase)!.id):"")} style={{background:"#c9a227",borderRadius:7,padding:"11px 14px",color:"#102033",fontWeight:700,textDecoration:"none"}}>Criar campanha para este público</Link></div>
 <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
 <thead><tr style={{textAlign:"left",background:"#f1f5f9"}}>{["Cadastro","Cliente / E-mail","CPF/CNPJ","WhatsApp","Endereço","Produtos adquiridos"].map(h=><th key={h} style={{padding:13,borderBottom:"1px solid #dce4ec"}}>{h}</th>)}</tr></thead>
 <tbody>{results.map(r=><tr key={r.id}>{[r.registered,r.name+"\n"+r.email,r.document,r.phone,r.address,r.products.join(", ")||"Nenhuma compra confirmada"].map((v,i)=><td key={i} style={{padding:13,borderBottom:"1px solid #e4eaf0",verticalAlign:"top",whiteSpace:"pre-line",minWidth:i===4?180:undefined}}>{v||"Não informado"}</td>)}</tr>)}{results.length===0&&<tr><td colSpan={6} style={{padding:20}}>Nenhum cadastro encontrado.</td></tr>}</tbody></table></div>
 </>;
}