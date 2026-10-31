// app/painel/assinatura/renewal-request.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RenewalRequest({ issuanceEnabled = false }: { issuanceEnabled?: boolean }) {
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
      // A reserva é apenas local; etapa externa protegida por uma segunda flag.
      if (issuanceEnabled && typeof data.invoiceId === "string") {
        const issueResponse = await fetch("/api/fiscal/renewal/issue", {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId: data.invoiceId }),
        });
        const issueResult: unknown = await issueResponse.json();
        const issued = issueResult && typeof issueResult === "object"
          ? issueResult as Record<string, unknown> : {};
        if (!issueResponse.ok || issued.state !== "bling_sales_order_created") {
          setMessage("Solicitação registrada, mas o pedido exige conferência. Não gere outra cobrança.");
          router.refresh();
          return;
        }
        setMessage("Pedido preparado. O Pix ou boleto ainda não foi emitido.");
      } else {
        setMessage("Solicitação registrada. A cobrança ainda não foi emitida.");
      }
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
