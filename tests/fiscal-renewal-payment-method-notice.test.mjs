// tests/fiscal-renewal-payment-method-notice.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const page=read("app/painel/assinatura/page.tsx");
const button=read("app/painel/assinatura/renewal-request.tsx");
test("o aviso de vencimento é visível fora do menu gerenciar",()=>{
 assert.match(page,/showRenewalNotice/);
 assert.ok(page.indexOf("{showRenewalNotice&&")<page.indexOf("<details className={styles.manageDetails}>"));
 assert.match(page,/Sua assinatura vence em/);
 assert.match(page,/Acessar cobrança da renovação/);
});
test("botão PIX só aparece na janela, para compras PIX e com emissão autorizada",()=>{
 assert.match(page,/renewalMethod==="pix"&&showRenewalNotice&&renewalActionReady/);
 assert.match(page,/actionLabel="Renovar com PIX"/);
 assert.match(page,/renewalMethod==="boleto"/);
 assert.match(page,/\.eq\("status","paid"\)/);
 assert.match(button,/actionLabel = "Solicitar renovação"/);
 assert.match(button,/existingInvoiceId \? "Consultar renovação" : actionLabel/);
});
