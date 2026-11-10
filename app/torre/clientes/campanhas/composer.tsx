"use client";
import {useActionState,useState} from "react";
import Link from "next/link";
import {buyerCampaignAction,type CampaignState} from "./actions";
type Product={id:string;name:string};
type Model={id:string;name:string;subject:string;body:string;cta_url:string|null;cta_label:string|null};
const initial:CampaignState={stage:"initial",message:"",count:0};
const field={padding:12,border:"1px solid #d4dee8",borderRadius:8,width:"100%",background:"white"} as const;
export default function BuyerCampaignComposer({products,models,sendId,initialProduct}:{products:Product[];models:Model[];sendId:string;initialProduct:string}){
 const [product,setProduct]=useState(initialProduct);
 const [status,setStatus]=useState("paid");
 const [modelId,setModelId]=useState(models[0]?.id??"");
 const [name,setName]=useState("");
 const [confirmed,setConfirmed]=useState(false);
 const [reviewKey,setReviewKey]=useState("");
 const [state,action,pending]=useActionState(buyerCampaignAction,initial);
 const key=[product,status,modelId,name].join("|");
 const ready=state.stage==="review"&&reviewKey===key&&state.count>0;
 const selected=models.find(m=>m.id===modelId);
 return <div style={{display:"grid",gap:22}}>
  <form action={action} style={{display:"grid",gap:16,padding:24,background:"white",border:"1px solid #dce4ec",borderRadius:14}}>
   <h2 style={{margin:0}}>Criar campanha para clientes</h2>
   <p style={{fontSize:13,color:"#607184",margin:0}}>Somente compradores que autorizaram comunicações comerciais e não se descadastraram serão incluídos. Cada endereço será considerado uma vez por campanha.</p>
   <input name="send_id" type="hidden" value={sendId}/>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:15}}>
    <label>Produto adquirido<select name="product_id" style={field} value={product} onChange={e=>{setProduct(e.target.value);setConfirmed(false)}}>
     <option value="all">Todos os produtos</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
    </select></label>
    <label>Situação da compra<select name="status" style={field} value={status} onChange={e=>{setStatus(e.target.value);setConfirmed(false)}}>
     <option value="paid">Pagamento confirmado</option><option value="pending">Pagamento pendente</option>
    </select></label>
    <label>Nome da campanha<input name="description" required maxLength={300} style={field} value={name} onChange={e=>{setName(e.target.value);setConfirmed(false)}} placeholder="Ex.: Novidade para compradores do e-book"/></label>
    <label>Modelo de e-mail<select name="template_id" style={field} value={modelId} onChange={e=>{setModelId(e.target.value);setConfirmed(false)}}>
     {models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
    </select></label>
   </div>
   <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
    <Link href="/torre/modelos-email/editor?tipo=clientes">+ Criar modelo para clientes</Link>
    {selected&&<Link href={"/torre/modelos-email/editor?editar="+encodeURIComponent(selected.id)}>Editar o modelo selecionado</Link>}
   </div>
   {!models.length&&<p role="alert">Crie um modelo do tipo Campanha para clientes antes de enviar.</p>}
   {state.stage!=="queued"&&!ready&&<button type="submit" name="mode" value="review" disabled={pending||!modelId||!name.trim()} onClick={()=>{setReviewKey(key);setConfirmed(false)}} style={{justifySelf:"start",background:"#c9a227",padding:"12px 20px",border:0,borderRadius:7,fontWeight:750}}>Consultar destinatários</button>}
   {ready&&<div style={{padding:16,background:"#f8fafc",border:"1px solid #dce4ec",borderRadius:8}}>
    <strong>{state.count} destinatário(s) elegível(is)</strong>
    <p>Você está prestes a registrar o envio real para processamento na fila.</p>
    <label style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" name="confirm" value="yes" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Confirmo esta campanha para {state.count} clientes.</label>
    <button type="submit" name="mode" value="send" disabled={!confirmed||pending} style={{marginTop:12,background:"#c9a227",padding:"12px 20px",border:0,borderRadius:7,fontWeight:750}}>Confirmar e enfileirar</button>
   </div>}
   {state.message&&<p role="status" style={{color:state.stage==="error"?"#b42318":"#286345"}}>{state.message} {state.stage==="queued"&&<Link href="/torre/modelos-email/resultados">Ver resultados</Link>}</p>}
  </form>
  <section style={{padding:24,background:"white",border:"1px solid #dce4ec",borderRadius:14}}>
   <h2>Prévia do e-mail</h2>
   {selected?<div style={{border:"1px solid #e2e8f0",maxWidth:680,margin:"auto"}}>
    <div style={{padding:22,background:"#0d1b2a",color:"white",fontWeight:700}}>Diana Voltolini</div>
    <div style={{padding:24}}><h3>{selected.subject.replaceAll("{{nome}}","Cliente")}</h3>
     <div style={{whiteSpace:"pre-line",lineHeight:1.7}}>{selected.body.replaceAll("{{nome}}","Cliente")}</div>
     {selected.cta_url&&selected.cta_label&&<p><a href={selected.cta_url} target="_blank" rel="noopener noreferrer">{selected.cta_label}</a></p>}
    </div><footer style={{padding:18,fontSize:12,color:"#647381"}}>Os envios reais incluem o link de descadastro.</footer>
   </div>:<p>Nenhum modelo para clientes disponível.</p>}
  </section>
 </div>;
}
