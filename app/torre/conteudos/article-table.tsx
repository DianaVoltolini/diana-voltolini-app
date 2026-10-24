"use client";
import { useMemo,useState } from "react";
import Link from "next/link";
import { Save, Pencil } from "lucide-react";
import { updateFiscalArticleQuick } from "./actions";
type Article={id:string;title:string;slug:string;category:string;visibility:string;status:string;published_at:string|null};
type Props={articles:Article[]};
const date=(value:string|null)=>value?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(value)):"—";
const inputStyle={padding:"9px",border:"1px solid #ccd7e2",borderRadius:7,background:"#fff",color:"#0d1b2a",maxWidth:"100%",fontSize:13};
export default function FiscalArticleTable({articles}:Props){
 const [term,setTerm]=useState("");
 const [access,setAccess]=useState("all");
 const [status,setStatus]=useState("all");
 const [category,setCategory]=useState("all");
 const categories=useMemo(()=>Array.from(new Set(articles.map(a=>a.category))).sort((a,b)=>a.localeCompare(b,"pt-BR")),[articles]);
 const filtered=articles.filter(a=>(access==="all"||a.visibility===access)&&(status==="all"||a.status===status)
 &&(category==="all"||a.category===category)&&[a.title,a.slug,a.category].join(" ").toLocaleLowerCase("pt-BR").includes(term.trim().toLocaleLowerCase("pt-BR")));
 return <>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:12,margin:"18px 0 16px"}}>
 <label style={{fontSize:12,fontWeight:700}}>Pesquisar<input style={{...inputStyle,display:"block",width:"100%",marginTop:7}} value={term} onChange={e=>setTerm(e.target.value)} type="search" placeholder="Título, slug ou categoria"/></label>
 <label style={{fontSize:12,fontWeight:700}}>Acesso<select style={{...inputStyle,display:"block",width:"100%",marginTop:7}} value={access} onChange={e=>setAccess(e.target.value)}><option value="all">Todos</option><option value="subscriber">Assinante</option><option value="public">Gratuito</option></select></label>
 <label style={{fontSize:12,fontWeight:700}}>Status<select style={{...inputStyle,display:"block",width:"100%",marginTop:7}} value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Todos</option><option value="draft">Rascunho</option><option value="published">Aprovado</option></select></label>
 <label style={{fontSize:12,fontWeight:700}}>Categoria<select style={{...inputStyle,display:"block",width:"100%",marginTop:7}} value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Todas</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
 </div>
 <p style={{fontSize:12,color:"#65758a",margin:"0 0 12px"}}>{filtered.length} {filtered.length===1?"conteúdo encontrado":"conteúdos encontrados"}. Altere acesso e status na linha e clique no ícone de salvar. Aprovado significa publicação imediata para o público selecionado.</p>
 <div style={{overflowX:"auto",width:"100%"}}>
 <table style={{width:"100%",borderCollapse:"collapse",background:"#fff",fontSize:14}}>
 <thead><tr style={{textAlign:"left",background:"#f1f5f9",color:"#41546a"}}>
 {["DATA","TÍTULO","CATEGORIA","ACESSO","STATUS","AÇÕES"].map(h=><th key={h} style={{padding:"16px 12px",borderBottom:"1px solid #dce4ec",fontSize:12}}>{h}</th>)}</tr></thead>
 <tbody>{filtered.map(a=><tr key={a.id}>
 <td style={{padding:"16px 12px",borderBottom:"1px solid #e0e7ee",whiteSpace:"nowrap"}}>{date(a.published_at)}</td>
 <td style={{padding:"16px 12px",borderBottom:"1px solid #e0e7ee",minWidth:220}}><strong>{a.title}</strong><small style={{display:"block",color:"#758397",marginTop:6}}>{a.slug}</small></td>
 <td style={{padding:"16px 12px",borderBottom:"1px solid #e0e7ee",minWidth:140}}>{a.category}</td>
 <td style={{padding:"16px 12px",borderBottom:"1px solid #e0e7ee"}}><select form={`quick-${a.id}`} name="visibility" defaultValue={a.visibility} aria-label={`Acesso: ${a.title}`} style={inputStyle}><option value="subscriber">Assinante</option><option value="public">Gratuito</option></select></td>
 <td style={{padding:"16px 12px",borderBottom:"1px solid #e0e7ee"}}><select form={`quick-${a.id}`} name="status" defaultValue={a.status} aria-label={`Status: ${a.title}`} style={inputStyle}><option value="draft">Rascunho</option><option value="published">Aprovado</option></select></td>
 <td style={{padding:"16px 12px",borderBottom:"1px solid #e0e7ee",whiteSpace:"nowrap"}}>
 <form id={`quick-${a.id}`} action={updateFiscalArticleQuick} style={{display:"inline-flex",gap:8,alignItems:"center"}}>
 <input type="hidden" name="id" value={a.id}/>
 <button type="submit" style={{cursor:"pointer",border:0,background:"#c9a227",borderRadius:7,padding:"10px 13px",fontWeight:800}} title="Salvar alterações" aria-label={`Salvar alterações: ${a.title}`}><Save size={18} aria-hidden="true"/></button>
 <Link href={`/torre/conteudos?editar=${a.id}`} style={{border:"1px solid #d6dfe8",borderRadius:7,padding:"9px 12px",color:"#253649",textDecoration:"none",fontWeight:750}} title="Editar conteúdo" aria-label={`Editar conteúdo: ${a.title}`}><Pencil size={18} aria-hidden="true"/></Link>
 </form></td></tr>)}
 {filtered.length===0&&<tr><td colSpan={6} style={{padding:25,textAlign:"center",color:"#64748b"}}>Nenhum conteúdo corresponde aos filtros selecionados.</td></tr>}
 </tbody></table></div>
 </>;
}
