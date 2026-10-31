"use client";
import {useEffect,useState,useTransition} from "react";
import {useRouter} from "next/navigation";
type Props={query:string;subscribed:string;interest:string;interests:string[];origin:string};
export default function LeadFilters({query,subscribed,interest,interests,origin}:Props){
 const router=useRouter();
 const [search,setSearch]=useState(query);
 const [inscrito,setInscrito]=useState(subscribed);
 const [selectedInterest,setSelectedInterest]=useState(interest);
 const [selectedOrigin,setSelectedOrigin]=useState(origin);
 const [pending,startTransition]=useTransition();
 useEffect(()=>{
  const handle=setTimeout(()=>{
   if(search===query&&inscrito===subscribed&&selectedInterest===interest&&selectedOrigin===origin)return;
   const p=new URLSearchParams();
   if(search.trim())p.set("q",search.trim());
   if(inscrito)p.set("inscrito",inscrito);
   if(selectedInterest)p.set("interesse",selectedInterest);
   if(selectedOrigin)p.set("origem",selectedOrigin);
   startTransition(()=>router.replace("/torre/leads"+(p.toString()?"?"+p.toString():""),{scroll:false}));
  },320);
  return ()=>clearTimeout(handle);
 },[search,inscrito,selectedInterest,selectedOrigin,query,subscribed,interest,origin,router]);
 const inputStyle={border:"1px solid #d7e0e9",padding:"11px 12px",borderRadius:7,color:"#102033",background:"#fff",width:"100%"};
 return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,alignItems:"end",margin:"22px 0"}}>
  <label style={{display:"grid",gap:7,fontWeight:700,fontSize:13}}>Pesquisar
   <input aria-label="Pesquisar por nome ou e-mail" placeholder="Digite nome ou e-mail" value={search} onChange={e=>setSearch(e.target.value)} style={inputStyle}/>
  </label>
  <label style={{display:"grid",gap:7,fontWeight:700,fontSize:13}}>Origem
   <select value={selectedOrigin} onChange={e=>setSelectedOrigin(e.target.value)} style={inputStyle}><option value="">Todas as origens</option><option value="landing">Landing Pages</option><option value="newsletter">Newsletter da página principal</option></select>
  </label>
  <label style={{display:"grid",gap:7,fontWeight:700,fontSize:13}}>Inscrito na newsletter
   <select aria-label="Filtrar inscrição" value={inscrito} onChange={e=>setInscrito(e.target.value)} style={inputStyle}><option value="">Todos</option><option value="sim">Sim</option><option value="nao">Não</option></select>
  </label>
  <label style={{display:"grid",gap:7,fontWeight:700,fontSize:13}}>Interesse
   <select aria-label="Filtrar interesse" value={selectedInterest} onChange={e=>setSelectedInterest(e.target.value)} style={inputStyle}><option value="">Todos</option>{interests.map(x=><option key={x} value={x}>{x}</option>)}</select>
  </label>
  <span aria-live="polite" style={{position:"absolute",width:1,height:1,overflow:"hidden"}}>{pending?"Atualizando resultados":""}</span>
 </div>;
}
