// app/torre/auditoria/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { saveAuditTask, addAuditChecklistItem, toggleAuditChecklistItem, removeAuditChecklistItem } from "./actions";
import css from "./auditoria.module.css";

export const metadata:Metadata={title:"Auditoria | Torre de Controle"};
export const dynamic="force-dynamic";
type Query={filtro?:string;area?:string;tarefa?:string;salvo?:string;erro?:string};
type Task={id:string;area:string;title:string;description:string|null;priority:string;status:string;due_date:string|null;owner_name:string|null;notes:string|null;created_at:string};
type Item={id:string;task_id:string;title:string;is_done:boolean;created_at:string};
const priorityNames:Record<string,string>={critica:"Crítica",alta:"Alta",media:"Média",baixa:"Baixa"};
const statusNames:Record<string,string>={pendente:"Pendente",em_andamento:"Em andamento",bloqueada:"Bloqueada",concluida:"Concluída",validada:"Validada"};
const done=(s:string)=>s==="concluida"||s==="validada";
const formatDate=(d:string|null)=>d?d.split("-").reverse().join("/"):"Sem prazo";
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const url=(query:Record<string,string|undefined>)=>"/torre/auditoria?"+new URLSearchParams(Object.entries(query).filter((x):x is [string,string]=>!!x[1])).toString();

export default async function AuditHome({searchParams}:{searchParams:Promise<Query>}){
 await requireAdmin();
 const q=await searchParams;
 const db=getSupabaseAdmin();
 const [tasksResult,itemsResult]=await Promise.all([
  db.from("torre_audit_tasks").select("id,area,title,description,priority,status,due_date,owner_name,notes,created_at").order("created_at",{ascending:false}).limit(500),
  db.from("torre_audit_checklist").select("id,task_id,title,is_done,created_at").order("created_at",{ascending:true}).limit(5000),
 ]);
 const tasks=(tasksResult.data??[]) as Task[],items=(itemsResult.data??[]) as Item[];
 const error=Boolean(tasksResult.error||itemsResult.error);
 const areas=Array.from(new Set(tasks.map(t=>t.area))).sort((a,b)=>a.localeCompare(b,"pt-BR"));
 const selected=tasks.find(t=>t.id===q.tarefa)??null;
 const now=today();
 const overdue=(t:Task)=>Boolean(t.due_date&&t.due_date<now&&!done(t.status));
 const upcoming=(t:Task)=>Boolean(t.due_date&&t.due_date>=now&&!done(t.status));
 const view=tasks.filter(t=>
   (!q.area||t.area===q.area)&&
   (q.filtro==="concluidas"?done(t.status):
    q.filtro==="urgentes"?(t.priority==="critica"||t.priority==="alta")&&!done(t.status):
    q.filtro==="vencidas"?overdue(t):
    q.filtro==="abertas"?!done(t.status):true)
 );
 const completed=tasks.filter(t=>done(t.status)).length;
 const urgent=tasks.filter(t=>!done(t.status)&&(t.priority==="alta"||t.priority==="critica")).length;
 const late=tasks.filter(overdue).length;
 const inProgress=tasks.filter(t=>t.status==="em_andamento").length;
 const checklistByTask=(id:string)=>items.filter(i=>i.task_id===id);
 return <main className={css.page}>
   <header className={css.header}>
    <div><p className={css.eyebrow}>TORRE DE CONTROLE · ACOMPANHAMENTO</p>
     <h1>Auditoria</h1>
     <p>Controle de melhorias, correções e homologações. Independente das pendências operacionais.</p>
    </div>
    <a className={css.primary} href="#cadastro">{selected?"Editar pendência":"+ Nova pendência"}</a>
   </header>
   {error&&<p className={css.error}>Não foi possível consultar o módulo Auditoria. Execute primeiro sql/torre_auditoria_v1.sql no Supabase.</p>}
   {q.salvo==="1"&&<p className={css.success}>Registro atualizado.</p>}
   {q.erro&&<p className={css.error}>Não foi possível salvar. Confira os campos e a configuração do banco.</p>}
   <section className={css.summary} aria-label="Indicadores da auditoria">
    <Link href={url({filtro:"abertas"})}><small>Abertas</small><strong>{tasks.length-completed}</strong></Link>
    <Link href={url({filtro:"urgentes"})}><small>Alta ou crítica</small><strong>{urgent}</strong></Link>
    <Link href={url({filtro:"vencidas"})}><small>Vencidas</small><strong>{late}</strong></Link>
    <Link href={url({filtro:"concluidas"})}><small>Concluídas / validadas</small><strong>{completed}</strong></Link>
   </section>
   <section className={css.section}>
    <div className={css.sectionHead}><div><h2>Áreas acompanhadas</h2><p>Selecione uma área para acompanhar somente suas pendências.</p></div><Link className={css.simpleLink} href="/torre/auditoria">Ver todas</Link></div>
    <div className={css.areas}>
     {areas.map(area=><Link key={area} className={q.area===area?css.areaActive:css.area}
        href={url({area,filtro:q.filtro})}>{area}<span>{tasks.filter(t=>t.area===area&&!done(t.status)).length} abertas</span></Link>)}
     {!areas.length&&<p>Nenhuma área cadastrada. Use o formulário para criar a primeira pendência.</p>}
    </div>
   </section>
   <section className={css.section}>
    <div className={css.sectionHead}><div><h2>Pendências ({view.length})</h2><p>Prioridade, prazo, situação e progresso das etapas.</p></div>
     <nav className={css.filters} aria-label="Filtros das pendências">
      {([["todas","Todas"],["abertas","Abertas"],["urgentes","Urgentes"],["vencidas","Vencidas"],["concluidas","Concluídas"]] as const).map(([id,label])=>
       <Link key={id} className={(q.filtro??"todas")===id?css.filterActive:css.filter}
        href={url({filtro:id==="todas"?undefined:id,area:q.area})}>{label}</Link>)}
     </nav>
    </div>
    <div className={css.tableScroll}><table className={css.table}>
     <thead><tr><th>Área / Pendência</th><th>Prioridade</th><th>Prazo</th><th>Situação</th><th>Checklist</th><th>Ação</th></tr></thead>
     <tbody>
     {view.map(t=>{
      const list=checklistByTask(t.id),count=list.filter(x=>x.is_done).length;
      return <tr key={t.id}>
       <td><small>{t.area}</small><strong>{t.title}</strong></td>
       <td><span className={t.priority==="critica"||t.priority==="alta"?css.priorityHigh:css.priority}>{priorityNames[t.priority]??t.priority}</span></td>
       <td><span className={overdue(t)?css.late:undefined}>{formatDate(t.due_date)}</span></td>
       <td>{statusNames[t.status]??t.status}</td>
       <td>{count}/{list.length}</td>
       <td><Link className={css.simpleLink} href={url({tarefa:t.id,area:q.area,filtro:q.filtro})}>Abrir / Editar</Link></td>
      </tr>;
     })}
     {!view.length&&<tr><td colSpan={6}>Nenhuma pendência encontrada para este filtro.</td></tr>}
     </tbody></table></div>
    {tasks.length===500&&<p className={css.note}>Limite de visualização: 500 registros. Implementar paginação antes de ultrapassar esse volume.</p>}
   </section>
   <section className={css.section} id="cadastro">
    <div className={css.sectionHead}><div><h2>{selected?"Editar pendência":"Cadastrar pendência"}</h2>
     <p>Checklist concluído e validação da funcionalidade são acompanhamentos diferentes.</p></div>
     {selected&&<Link className={css.simpleLink} href="/torre/auditoria#cadastro">+ Nova pendência</Link>}
    </div>
    <form action={saveAuditTask} className={css.form}>
      <input type="hidden" name="id" value={selected?.id??""}/>
      <div className={css.twoColumns}>
       <label>Área / Módulo<input name="area" list="audit-areas" required minLength={2} maxLength={100} defaultValue={selected?.area??q.area??""} placeholder="Ex.: Área do Cliente"/></label>
       <label>Título da pendência<input name="title" required minLength={3} maxLength={180} defaultValue={selected?.title??""} placeholder="O que precisa ser resolvido?"/></label>
      </div>
      <datalist id="audit-areas">{areas.map(a=><option key={a} value={a}/>)}</datalist>
      <label>Descrição<textarea name="description" rows={3} maxLength={3000} defaultValue={selected?.description??""}/></label>
      <div className={css.fourColumns}>
       <label>Prioridade<select name="priority" defaultValue={selected?.priority??"media"}>{Object.entries(priorityNames).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
       <label>Situação<select name="status" defaultValue={selected?.status??"pendente"}>{Object.entries(statusNames).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
       <label>Prazo<input type="date" name="due_date" defaultValue={selected?.due_date??""}/></label>
       <label>Responsável<input name="owner_name" maxLength={120} defaultValue={selected?.owner_name??""}/></label>
      </div>
      <label>Observações / evidências<textarea name="notes" rows={3} maxLength={3000} defaultValue={selected?.notes??""}/></label>
      <div><button type="submit" className={css.primary}>{selected?"Salvar alterações":"Cadastrar pendência"}</button></div>
    </form>
   </section>
   {selected&&<section className={css.section}>
     <div className={css.sectionHead}><div><h2>Checklist — {selected.title}</h2>
     <p>Marque cada etapa conforme for executada.</p></div></div>
     <div className={css.checklist}>
      {checklistByTask(selected.id).map(i=><div key={i.id} className={css.checklistRow}>
       <form action={toggleAuditChecklistItem}>
        <input type="hidden" name="task_id" value={selected.id}/><input type="hidden" name="item_id" value={i.id}/>
        <button className={css.checkButton} type="submit" aria-label={i.is_done?"Desmarcar etapa":"Concluir etapa"}>{i.is_done?"☑":"☐"}</button>
       </form>
       <span className={i.is_done?css.checked:undefined}>{i.title}</span>
       <form action={removeAuditChecklistItem}>
        <input type="hidden" name="task_id" value={selected.id}/><input type="hidden" name="item_id" value={i.id}/>
        <button className={css.remove} type="submit" aria-label={"Remover "+i.title}>Remover</button>
       </form>
      </div>)}
      {!checklistByTask(selected.id).length&&<p>Nenhuma etapa cadastrada.</p>}
     </div>
     <form className={css.addItem} action={addAuditChecklistItem}>
      <input type="hidden" name="task_id" value={selected.id}/>
      <label>Nova etapa<input name="title" required minLength={3} maxLength={240} placeholder="Descreva a etapa do checklist"/></label>
      <button className={css.primary} type="submit">Adicionar etapa</button>
     </form>
   </section>}
  </main>;
}
