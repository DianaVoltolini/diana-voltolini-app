// app/painel/assinatura/renewal-request.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RenewalRequest() {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function prepare() {
    if (working) return;
    setWorking(true);
    setMessage(null);
    try {
      const response = await fetch("/api/fiscal/renewal/reserve", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
      });
      const result: unknown = await response.json();
      const data = result && typeof result === "object"
        ? result as Record<string, unknown> : {};
      if (!response.ok || data.reserved !== true) {
        setMessage(typeof data.error === "string" ? data.error : "Renovação indisponível no momento.");
        return;
      }
      // Esta API NÃO emite cobrança. Nunca anunciar que Pix/boleto foi criado.
      setMessage("Solicitação registrada. A cobrança ainda não foi emitida.");
      router.refresh();
    } catch {
      setMessage("Não foi possível verificar a renovação. Tente novamente mais tarde.");
    } finally {
      setWorking(false);
    }
  }

  return <div style={{marginTop:12}}>
    <button type="button" onClick={prepare} disabled={working}
      style={{display:"inline-block",background:"#102033",color:"#fff",padding:"11px 16px",
        border:0,borderRadius:8,fontWeight:750,cursor:working?"wait":"pointer"}}>
      {working ? "Verificando..." : "Solicitar renovação"}
    </button>
    {message && <p role="status" style={{fontSize:12,color:"#65758a",margin:"8px 0 0"}}>{message}</p>}
  </div>;
}
