// tests/fiscal-torre-renewal-status.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const s=readFileSync(new URL("../app/torre/assinaturas/page.tsx",import.meta.url),"utf8");
test("Torre obtém preço comercial e não mostra preço fixo",()=>{
 assert.match(s,/\.eq\("code","ASSINATURA-FISCAL-001"\)/);
 assert.match(s,/product\.price_cents\/100/);
 assert.match(s,/>\{priceLabel\}<\/strong>/);
 assert.doesNotMatch(s,/>R\$ 39,90<\/strong>/);
});
test("reserva sem vínculo externo não é exibida como cobrança emitida",()=>{
 assert.match(s,/Apenas reserva local/);
 assert.match(s,/Pedido no Bling · sem cobrança vinculada/);
 assert.match(s,/Cobrança Bling vinculada/);
 assert.match(s,/provider_payment_id/);
 assert.doesNotMatch(s,/Emitida · pendente/);
});
test("tela da Torre não emite cobranças nem sinaliza renovação automática",()=>{
 assert.match(s,/Não significa cobrança automática/);
 assert.match(s,/O módulo não gera renovações/);
 assert.match(s,/await requireAdmin\(\)/);
});

test("datas civis de vencimento não recuam um dia pelo fuso de São Paulo",()=>{
 assert.match(s,/v\.length===10\?v\+"T12:00:00Z":v/);
});
test("dados de pagamento e mensalidade tipados sem null nos agrupamentos",()=>{
 assert.match(s,/new Map<string,NonNullable<typeof pendingPayments>>\(\)/);
 assert.match(s,/new Map<string,NonNullable<typeof invoices>>\(\)/);
});
