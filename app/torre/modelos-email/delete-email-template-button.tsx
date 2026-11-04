"use client";
import {useState} from "react";
import {deleteEmailTemplate} from "./actions";
import css from "./models-list.module.css";

export default function DeleteEmailTemplateButton({id,name,locked=false}:{id:string;name:string;locked?:boolean}){
 const [confirm,setConfirm]=useState(false);
 if(locked)return <span className={css.locked} title="Modelo técnico do Blog: protegido contra exclusão" aria-label="Modelo técnico protegido">—</span>;
 if(!confirm)return <button type="button" className={css.delete} title={"Excluir "+name} aria-label={"Excluir "+name} onClick={()=>setConfirm(true)}>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v7M14 10v7"/></svg>
 </button>;
 return <div className={css.deleteConfirm}>
  <span>Excluir este modelo?</span>
  <form action={deleteEmailTemplate}>
   <input type="hidden" name="id" value={id}/>
   <button type="submit" className={css.deleteYes}>Excluir</button>
  </form>
  <button type="button" className={css.deleteCancel} onClick={()=>setConfirm(false)}>Cancelar</button>
 </div>;
}
