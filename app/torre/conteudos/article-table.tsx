"use client";
import { useMemo,useState } from "react";
import Link from "next/link";

import { updateFiscalArticleQuick, deleteFiscalArticle } from "./actions";
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
 <button type="submit" style={{cursor:"pointer",border:0,background:"#c9a227",borderRadius:7,padding:"10px 13px",fontWeight:800}} title="Salvar alterações" aria-label={`Salvar alterações: ${a.title}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg></button>
 <Link href={`/torre/conteudos/editor?editar=${a.id}`} style={{border:"1px solid #d6dfe8",borderRadius:7,padding:"9px 12px",color:"#253649",textDecoration:"none",fontWeight:750}} title="Editar conteúdo" aria-label={`Editar conteúdo: ${a.title}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 5 3 3M4 20l4.2-.8L20 7.4 16.6 4 4.8 15.8 4 20Z"/></svg></Link>
 </form>
 <form action={deleteFiscalArticle} style={{display:"inline-flex",marginLeft:8}} onSubmit={e=>{if(!window.confirm(`Excluir definitivamente o artigo "${a.title}"?\n\nO registro será apagado do Supabase e não poderá mais ser acessado no Blog ou na biblioteca. Esta ação não pode ser desfeita.`))e.preventDefault()}}>
 <input type="hidden" name="id" value={a.id}/>
 <input type="hidden" name="slug" value={a.slug}/>
 <button type="submit" style={{cursor:"pointer",border:"1px solid #e6c4c4",background:"#fff7f7",color:"#a42323",borderRadius:7,padding:"9px 12px"}} title="Excluir definitivamente" aria-label={`Excluir conteúdo: ${a.title}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v7M14 10v7"/></svg></button>
 </form></td></tr>)}
 {filtered.length===0&&<tr><td colSpan={6} style={{padding:25,textAlign:"center",color:"#64748b"}}>Nenhum conteúdo corresponde aos filtros selecionados.</td></tr>}
 </tbody></table></div>
 </>;
}
