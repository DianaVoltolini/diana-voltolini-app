"use client";

import { useState } from "react";

export default function StartFiscalCheckout() {
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  async function start(){
    if(loading)return;
    setLoading(true);setError(null);
    try {
      const response=await fetch("/api/fiscal/checkout-session",{method:"POST",credentials:"same-origin",headers:{"Accept":"application/json"}});
      const json=await response.json() as {checkoutToken?:string;error?:string};
      if(!response.ok||!json.checkoutToken)throw new Error(json.error||"Não foi possível iniciar a contratação.");
      // Fragmento não é enviado ao servidor, nem incluído em logs de acesso HTTP.
      window.location.assign("https://dianavoltolini.com.br/checkout/assinatura-fiscal#sessao="+encodeURIComponent(json.checkoutToken));
    }catch(err){
      setError(err instanceof Error?err.message:"Não foi possível iniciar a contratação.");
      setLoading(false);
    }
  }
  return <div style={{marginTop:15}}>
    <button type="button" onClick={start} disabled={loading} style={{background:"#c9a227",color:"#0d1b2a",border:0,borderRadius:8,padding:"12px 20px",fontWeight:800,cursor:"pointer"}}>
      {loading?"Preparando contratação...":"Contratar Fiscal na Prática"}
    </button>
    {error&&<p role="alert" style={{color:"#9f2934"}}>{error}</p>}
  </div>;
}
