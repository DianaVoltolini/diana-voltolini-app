"use client";
import {useState} from "react";
import {createCategory,renameCategory,deleteCategory} from "./actions";
type Item={id:string;name:string;count:number};
const field={border:"1px solid #cbd5e1",borderRadius:7,padding:"10px 12px",color:"#102033",minWidth:150,flex:1};
const btn={border:0,borderRadius:7,background:"#c9a227",color:"#102033",fontWeight:800,padding:"11px 17px",cursor:"pointer"};
export default function CategoriesManager({categories}:{categories:Item[]}){
 const [deleting,setDeleting]=useState<string|null>(null);
 return <div style={{display:"grid",gap:25}}>
 <form action={createCategory} style={{background:"#f7f9fa",padding:24,border:"1px solid #e0e6eb",borderRadius:10,display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
 <label style={{display:"grid",gap:8,flex:"1 1 250px",fontWeight:750,fontSize:13}}>Nova categoria<input name="name" required minLength={2} maxLength={80} placeholder="Ex.: PIS e Cofins" style={field}/></label>
 <button type="submit" style={btn}>+ Adicionar categoria</button></form>
 <div style={{display:"grid",gap:10}}>
 {categories.map(cat=><div key={cat.id} style={{border:"1px solid #e0e6eb",borderRadius:9,padding:15,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
 <form action={renameCategory} style={{display:"flex",alignItems:"center",gap:10,flex:"1 1 340px",flexWrap:"wrap"}}>
 <input type="hidden" name="id" value={cat.id}/>
 <input aria-label={"Categoria "+cat.name} name="name" defaultValue={cat.name} required minLength={2} maxLength={80} style={field}/>
 <span style={{color:"#657589",fontSize:12}}>{cat.count} {cat.count===1?"artigo":"artigos"}</span>
 <button type="submit" style={btn}>Salvar</button>
 </form>
 <form action={deleteCategory} onSubmit={e=>{if(cat.count>0||!window.confirm("Excluir a categoria "+cat.name+"? Esta ação não pode ser desfeita.")){e.preventDefault();setDeleting(null)}else setDeleting(cat.id)}}>
 <input type="hidden" name="id" value={cat.id}/>
 <button type="submit" disabled={cat.count>0||deleting===cat.id} title={cat.count>0?"Reclassifique os artigos antes de excluir":"Excluir categoria"} style={{border:"1px solid #e7c4c4",background:"#fff7f7",color:"#a42323",borderRadius:7,padding:"10px 15px",cursor:cat.count>0?"not-allowed":"pointer",opacity:cat.count>0?.5:1}}>Excluir</button>
 </form></div>)}
 {!categories.length&&<p>Nenhuma categoria cadastrada. Execute primeiro a configuração SQL do Supabase.</p>}
 </div></div>;
}
