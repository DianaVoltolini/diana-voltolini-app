"use client";

import { useEffect, useRef, useState } from "react";
import { cancelFiscalSubscription } from "./actions";

type Props = { paidUntil: string; subscriptionId: string };

export default function CancelSubscriptionConfirm({ paidUntil, subscriptionId }: Props) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(paidUntil));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <>
    <button type="button" onClick={() => setOpen(true)}
      style={{ padding: "12px 18px", border: "1px solid #c9a227", borderRadius: 8, background: "#fff", color: "#715308", fontWeight: 750, cursor: "pointer", margin: "12px 0 25px" }}>
      Cancelar assinatura
    </button>
    <dialog ref={dialogRef} aria-labelledby="cancel-title" onClose={() => setOpen(false)}
      style={{ border: "none", borderRadius: 16, padding: 0, width: "min(500px, calc(100vw - 32px))", maxWidth: "100%", boxShadow: "0 20px 70px rgba(13,27,42,.25)", color: "#0d1b2a" }}>
      <div style={{ padding: "30px clamp(20px,4vw,36px)" }}>
        <p style={{ fontSize: 12, color: "#987112", fontWeight: 850, letterSpacing: ".1em", margin: "0 0 13px" }}>CONFIRMAÇÃO NECESSÁRIA</p>
        <h2 id="cancel-title" style={{ fontFamily: "Georgia,serif", fontSize: 25, lineHeight: 1.24, margin: "0 0 17px" }}>Cancelar assinatura Fiscal na Prática?</h2>
        <p style={{ lineHeight: 1.65, color: "#4c5c6d" }}>Você solicitou o cancelamento da sua assinatura <strong>Fiscal na Prática</strong>.</p>
        <p style={{ lineHeight: 1.65, color: "#4c5c6d" }}>Seu acesso aos conteúdos será mantido até <strong>{date}</strong>.</p>
        <p style={{ lineHeight: 1.65, color: "#4c5c6d" }}>Clique em <strong>Confirmar cancelamento</strong> para efetivar a solicitação. Caso queira manter a assinatura, clique em <strong>Sair</strong>.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
          <form action={cancelFiscalSubscription} style={{ flex: "1 1 210px" }}>
            <input type="hidden" name="subscriptionId" value={subscriptionId} />
            <button type="submit" style={{ width: "100%", background: "#0d1b2a", color: "#fff", border: 0, borderRadius: 8, padding: "13px 16px", fontWeight: 800, cursor: "pointer" }}>Confirmar cancelamento</button>
          </form>
          <button type="button" onClick={() => setOpen(false)} style={{ flex: "1 1 120px", border: "1px solid #d6dde5", background: "#fff", borderRadius: 8, padding: "13px 16px", fontWeight: 750, cursor: "pointer" }}>Sair</button>
        </div>
      </div>
    </dialog>
  </>;
}
