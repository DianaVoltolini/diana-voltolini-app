// app/painel/assinatura/renewal-request.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RenewalRequest({ issuanceEnabled = false, financialEnabled = false, existingInvoiceId = null, existingOrderState = null }: { issuanceEnabled?: boolean; financialEnabled?: boolean; existingInvoiceId?: string | null; existingOrderState?: string | null }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function prepare() {
    if (working) return;
    setWorking(true);
    setMessage(null);
    try {
      let invoiceId = existingInvoiceId;
      if (!invoiceId) {
        const response = await fetch("/api/fiscal/renewal/reserve", {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
        });
        const result: unknown = await response.json();
        const data = result && typeof result === "object"
          ? result as Record<string, unknown> : {};
        if (!response.ok || data.reserved !== true || typeof data.invoiceId !== "string") {
          setMessage(typeof data.error === "string" ? data.error : "Renovação indisponível no momento.");
          return;
        }
        invoiceId = data.invoiceId;
      }
      // A reserva é apenas local; etapa externa protegida por uma segunda flag.
      if (issuanceEnabled && invoiceId && (!existingInvoiceId || existingOrderState === "reserved")) {
        const issueResponse = await fetch("/api/fiscal/renewal/issue", {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId }),
        });
        const issueResult: unknown = await issueResponse.json();
        const issued = issueResult && typeof issueResult === "object"
          ? issueResult as Record<string, unknown> : {};
        if (!issueResponse.ok || issued.state !== "bling_sales_order_created") {
          setMessage("Solicitação registrada, mas o pedido exige conferência. Não gere outra cobrança.");
          router.refresh();
          return;
        }
        if (financialEnabled) {
          const completeResponse = await fetch("/api/fiscal/renewal/complete-payment", {
            method:"POST",credentials:"same-origin",cache:"no-store",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({invoiceId}),
          });
          const completion:unknown=await completeResponse.json();
          const finished=completion&&typeof completion==="object"
            ?completion as Record<string,unknown>:{};
          if(!completeResponse.ok||finished.state!=="receivable_linked"){
            setMessage("O pedido foi registrado, mas a cobrança exige conferência. Não tente emitir novamente.");
            router.refresh();
            return;
          }
          setMessage(finished.paymentLinkAvailable===true
            ?"Cobrança disponível. Abra o link de pagamento exibido no painel."
            :"Cobrança localizada, aguardando disponibilização do link de pagamento.");
        } else {
          setMessage("Pedido preparado. O Pix ou boleto ainda não foi emitido.");
        }
      } else if (existingInvoiceId && financialEnabled &&
          ["bling_order_created","financial_launched","financial_lookup_pending","payment_link_pending"].includes(existingOrderState ?? "")) {
        const response = await fetch("/api/fiscal/renewal/complete-payment", {
          method:"POST",credentials:"same-origin",cache:"no-store",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({invoiceId}),
        });
        const result:unknown = await response.json();
        const data=result&&typeof result==="object"?result as Record<string,unknown>:{};
        setMessage(response.ok && data.state==="receivable_linked"
          ? "Cobrança vinculada. Confira o link de pagamento no painel."
          : "A cobrança ainda exige conferência. Nenhuma nova cobrança foi criada.");
      } else {
        setMessage(existingInvoiceId
          ? "Sua renovação já foi solicitada e está em conferência. Nenhuma nova cobrança será criada."
          : "Solicitação registrada. A cobrança ainda não foi emitida.");
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
      {working ? "Verificando..." : existingInvoiceId ? "Consultar renovação" : "Solicitar renovação"}
    </button>
    {message && <p role="status" style={{fontSize:12,color:"#65758a",margin:"8px 0 0"}}>{message}</p>}
  </div>;
}
