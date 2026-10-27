"use client";
import {useEffect,useState, type FormEvent} from "react";
import {saveCustomerDetails} from "./actions";
type Info={phone:string;zip_code:string;street:string;number:string;complement:string;neighborhood:string;city:string;state:string};
const initial={ok:false,message:""};
const formatField=(key:keyof Info,value:string)=>{const n=value.replace(/\D/g,"");if(key==="zip_code")return n.slice(0,8).replace(/^(\d{5})(\d)/,"$1-$2");if(key==="phone"){const x=n.slice(0,11);return x.length>10?x.replace(/^(\d{2})(\d{5})(\d{0,4})$/,"($1) $2-$3"):x.replace(/^(\d{2})(\d{4})(\d{0,4})$/,"($1) $2-$3");}return value;};
export default function DetailsForm({details}:{details:Info}){
 const [editing,setEditing]=useState(false);
 const [saved,setSaved]=useState<Info>(details);
 const [values,setValues]=useState<Info>(details);
 const [state,setState]=useState(initial);
 const [pending,setPending]=useState(false);
 const [cepLoading,setCepLoading]=useState(false);
 const [cepMessage,setCepMessage]=useState("");
 useEffect(()=>{
  const zip=values.zip_code.replace(/\D/g,"");
  if(!editing||zip.length!==8||zip===saved.zip_code.replace(/\D/g,"")){
   setCepLoading(false);
   setCepMessage("");
   return;
  }
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   setCepLoading(true);
   setCepMessage("");
   try{
    const response=await fetch(`https://viacep.com.br/ws/${zip}/json/`,{signal:controller.signal});
    if(!response.ok)throw new Error("CEP indisponível");
    const address=await response.json() as {erro?:boolean;logradouro?:string;bairro?:string;localidade?:string;uf?:string};
    if(controller.signal.aborted)return;
    if(address.erro){setCepMessage("CEP não encontrado. Confira os números informados.");return;}
    setValues(previous=>{
     if(previous.zip_code.replace(/\D/g,"")!==zip)return previous;
     return {...previous,street:address.logradouro??"",neighborhood:address.bairro??"",city:address.localidade??"",state:address.uf??"",number:"",complement:""};
    });
    setCepMessage("Endereço localizado. Preencha o número e o complemento, se houver.");
   }catch(error){
    if(!controller.signal.aborted)setCepMessage("Não foi possível consultar o CEP. Preencha o endereço manualmente.");
   }finally{if(!controller.signal.aborted)setCepLoading(false);}
  },350);
  return ()=>{clearTimeout(timer);controller.abort();};
 },[editing,values.zip_code,saved.zip_code]);
 const submit=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  if(pending)return;
  setPending(true);
  setState(initial);
  try{
   const submitted=new FormData(event.currentTarget);
   const result=await saveCustomerDetails(submitted);
   setState(result);
   if(result.ok){
    const updated=result.details??{...values};
    setSaved(updated);
    setValues(updated);
    setEditing(false);
   }
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
   {fields.map(([key,label])=><label key={key} style={{display:"grid",gap:6,fontSize:13,color:"#425569",fontWeight:650}}>{label}<input name={key} value={formatField(key,values[key])} onChange={e=>{const value=(key==="phone"||key==="zip_code")?e.currentTarget.value.replace(/\D/g,""):e.currentTarget.value;setValues(previous=>({...previous,[key]:value}));}} readOnly={!editing} maxLength={180} style={{padding:"12px 13px",border:"1px solid #d7e0e9",borderRadius:7,background:editing?"#fff":"#f5f7fa",color:"#0d1b2a",fontSize:14}}/></label>)}
  </div>
  {editing&&(cepLoading||cepMessage)&&<p role="status" style={{fontSize:12,color:cepMessage.includes("não")||cepMessage.includes("Não")?"#ad3939":"#57687a",margin:0}}>{cepLoading?"Consultando CEP...":cepMessage}</p>}
  {state.message&&<p role="status" style={{color:state.ok?"#22663e":"#a33434",fontSize:13}}>{state.message}</p>}
  {editing&&<div style={{display:"flex",gap:10}}><button type="submit" disabled={pending} style={{background:"#c9a227",color:"#0d1b2a",border:0,borderRadius:7,padding:"12px 22px",fontWeight:750,cursor:"pointer"}}>{pending?"Salvando...":"Salvar alterações"}</button><button type="button" onClick={()=>{setValues(saved);setEditing(false);setState(initial);}} style={{padding:"12px 16px",border:"1px solid #d7e0e9",borderRadius:7,background:"#fff"}}>Cancelar</button></div>}
 </form>;
}
