"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import DeleteEmailTemplateButton from "./delete-email-template-button";
import css from "./models-list.module.css";

type EmailModel={
 id:string;name:string;description:string|null;subject:string;
 active:boolean;kind:string;auto_enabled:boolean|null;created_at:string;
};
const BLOG_TEMPLATE_ID="b10b0000-0000-4000-8000-000000000001";
const normalize=(text:string)=>text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
const deliveryType=(model:EmailModel)=>model.id.toLowerCase()===BLOG_TEMPLATE_ID||model.kind==="transactional"||model.auto_enabled||model.kind==="welcome"?"automatico":"manual";
const date=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",year:"numeric"});

export default function EmailModelsTable({models}:{models:EmailModel[]}){
 const [query,setQuery]=useState("");
 const [type,setType]=useState("todos");
 const [status,setStatus]=useState("todos");
 const filtered=useMemo(()=>{
  const search=normalize(query.trim());
  return models.filter(model=>{
   if(type!=="todos"&&deliveryType(model)!==type)return false;
   if(status==="disponivel"&&!model.active)return false;
   if(status==="desativado"&&model.active)return false;
   return !search||normalize([model.name,model.description??"",model.subject].join(" ")).includes(search);
  });
 },[models,query,type,status]);
 const clear=()=>{setQuery("");setType("todos");setStatus("todos");};
 const isFiltering=Boolean(query.trim())||type!=="todos"||status!=="todos";
 return <>
  <div className={css.filterPanel}>
   <label className={css.filterSearch}>
    <span>Pesquisar por texto</span>
    <input type="search" placeholder="Nome, assunto ou descrição..." value={query} onChange={event=>setQuery(event.target.value)}/>
   </label>
   <label className={css.filterSelect}>
    <span>Tipo de envio</span>
    <select value={type} onChange={event=>setType(event.target.value)}>
     <option value="todos">Todos</option>
     <option value="manual">Manual</option>
     <option value="automatico">Automático</option>
    </select>
   </label>
   <label className={css.filterSelect}>
    <span>Situação</span>
    <select value={status} onChange={event=>setStatus(event.target.value)}>
     <option value="todos">Todas</option>
     <option value="disponivel">Disponível</option>
     <option value="desativado">Desativado</option>
    </select>
   </label>
   <button type="button" className={css.clearFilters} onClick={clear} disabled={!isFiltering}>Limpar filtros</button>
  </div>
  <p className={css.resultsCount} role="status">{filtered.length} {filtered.length===1?"modelo encontrado":"modelos encontrados"}{isFiltering?" com os filtros selecionados":""}</p>
  <div className={css.scroll}><table className={css.table}><thead><tr><th>Data</th><th>Nome da Campanha</th><th>Descrição</th><th>Tipo de envio</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
   {filtered.map(model=><tr key={model.id}>
    <td className={css.date}>{date.format(new Date(model.created_at))}</td>
    <td><strong>{model.name}</strong><small>{model.subject}</small></td>
    <td>{model.description||"—"}</td>
    <td>{deliveryType(model)==="automatico"?"Automático":"Manual"}</td>
    <td>{model.active?"Disponível":"Desativado"}</td>
    <td><div className={css.actions}>
     <Link href={"/torre/modelos-email/editor?editar="+encodeURIComponent(model.id)} className={css.edit} title={"Editar "+model.name} aria-label={"Editar "+model.name}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 20h9M4 17l-1 4 4-1L19 8l-3-3L4 17ZM14 7l3 3"/></svg></Link>
     <DeleteEmailTemplateButton id={model.id} name={model.name} locked={model.id.toLowerCase()===BLOG_TEMPLATE_ID||model.kind==="transactional"}/>
    </div></td>
   </tr>)}
   {!filtered.length&&<tr><td colSpan={6} className={css.noResults}>{models.length?"Nenhum modelo encontrado com os filtros selecionados.":"Nenhum modelo cadastrado."}{isFiltering&&<div><button type="button" className={css.resetInline} onClick={clear}>Limpar filtros</button></div>}</td></tr>}
  </tbody></table></div>
 </>;
}
