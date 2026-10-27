"use client";
import {useState, type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {saveCustomerDetails} from "./actions";
type Info={phone:string;zip_code:string;street:string;number:string;complement:string;neighborhood:string;city:string;state:string};
const initial={ok:false,message:""};
const formatField=(key:keyof Info,value:string)=>{const n=value.replace(/\D/g,"");if(key==="zip_code")return n.slice(0,8).replace(/^(\d{5})(\d)/,"$1-$2");if(key==="phone"){const x=n.slice(0,11);return x.length>10?x.replace(/^(\d{2})(\d{5})(\d{0,4})$/,"($1) $2-$3"):x.replace(/^(\d{2})(\d{4})(\d{0,4})$/,"($1) $2-$3");}return value;};
export default function DetailsForm({details}:{details:Info}){
 const [editing,setEditing]=useState(false);
 const router=useRouter();
 const [state,setState]=useState(initial);
 const [pending,setPending]=useState(false);
 const submit=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  if(pending)return;
  setPending(true);
  setState(initial);
  try{
   const result=await saveCustomerDetails(new FormData(event.currentTarget));
   setState(result);
   if(result.ok){setEditing(false);router.refresh();}
  }catch{
   setState({ok:false,message:"Não foi possível concluir o salvamento. Tente novamente."});
  }finally{setPending(false);}
 };
 const fields:[keyof Info,string][]=[["phone","Telefone / WhatsApp"],["zip_code","CEP"],["street","Endereço"],["number","Número"],["complement","Complemento"],["neighborhood","Bairro"],["city","Cidade"],["state","UF"]];
 return <form onSubmit={submit} style={{display:"grid",gap:16}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
   <h2 style={{fontSize:21,margin:0}}>Dados de contato e endereço</h2>
   {!editing&&<button type="button" onClick={()=>setEditing(true)} style={{background:"#c9a227",color:"#0d1b2a",border:0,borderRadius:7,padding:"10px 20px",fontWeight:750,cursor:"pointer"}}>Editar</button>}
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>
   {fields.map(([key,label])=><label key={key} style={{display:"grid",gap:6,fontSize:13,color:"#425569",fontWeight:650}}>{label}<input key={editing?"edit-"+key:"view-"+key} name={key} defaultValue={formatField(key,details[key])} onChange={e=>{if(key==="phone"||key==="zip_code")e.currentTarget.value=formatField(key,e.currentTarget.value)}} readOnly={!editing} maxLength={180} style={{padding:"12px 13px",border:"1px solid #d7e0e9",borderRadius:7,background:editing?"#fff":"#f5f7fa",color:"#0d1b2a",fontSize:14}}/></label>)}
  </div>
  {state.message&&<p role="status" style={{color:state.ok?"#22663e":"#a33434",fontSize:13}}>{state.message}</p>}
  {editing&&<div style={{display:"flex",gap:10}}><button type="submit" disabled={pending} style={{background:"#c9a227",color:"#0d1b2a",border:0,borderRadius:7,padding:"12px 22px",fontWeight:750,cursor:"pointer"}}>{pending?"Salvando...":"Salvar alterações"}</button><button type="button" onClick={()=>setEditing(false)} style={{padding:"12px 16px",border:"1px solid #d7e0e9",borderRadius:7,background:"#fff"}}>Cancelar</button></div>}
 </form>;
}
