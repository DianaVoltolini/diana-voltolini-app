// tests/fiscal-subscription-panel-offer.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../app/painel/assinatura/page.tsx",import.meta.url),"utf8");
test("preço no painel usa cadastro comercial, nunca preço fixo",()=>{
  assert.match(source,/\.eq\("code","ASSINATURA-FISCAL-001"\)/);
  assert.match(source,/planProduct\.price_cents\/100/);
  assert.match(source,/price=\{priceLabel\}/);
  assert.doesNotMatch(source,/price="R\$ 39,90\/mês"/);
});
test("renovação só é apresentada entre dez dias antes e três dias após vencimento",()=>{
  assert.match(source,/dateMinusDays\(dateInSaoPaulo\(new Date\(access\.paidUntil\)\),10\)/);
  assert.match(source,/dateMinusDays\(dateInSaoPaulo\(new Date\(access\.paidUntil\)\),-3\)/);
  assert.match(source,/todaySaoPaulo>=renewalStartIso&&todaySaoPaulo<=renewalEndIso/);
  assert.match(source,/renewalRequestEnabled&&/);
});
test("não informa que renovação pode ser solicitada quando está desabilitada",()=>{
  assert.match(source,/!renewalRequestEnabled\?"A solicitação de renovação ainda está em preparação/);
});
