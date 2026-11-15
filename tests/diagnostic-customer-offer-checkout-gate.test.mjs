// tests/diagnostic-customer-offer-checkout-gate.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const diagnostics=read("app/painel/diagnosticos/page.tsx");
const offer=read("app/painel/product-offer.tsx");
test("área do diagnóstico consulta a liberação comercial antes de mostrar compra",()=>{
 assert.match(diagnostics,/\.eq\("code","diagnostico-expresso-ibs-cbs"\)/);
 assert.match(diagnostics,/diagnosticProduct\.checkout_enabled===true/);
 assert.match(diagnostics,/Number\.isSafeInteger\(diagnosticProduct\.bling_product_id\)/);
 assert.match(diagnostics,/diagnosticCheckoutReady\?"https:\/\/dianavoltolini\.com\.br\/checkout\/diagnostico-expresso-ibs-cbs":null/);
 assert.doesNotMatch(diagnostics,/checkout="https:\/\/dianavoltolini\.com\.br\/checkout\/diagnostico-ibs-cbs"/);
});
test("oferta mantém demais CTAs e apresenta situação indisponível sem link",()=>{
 assert.match(offer,/checkout:string\|null/);
 assert.match(offer,/checkout\?<a href=\{checkout\}>/);
 assert.match(offer,/checkout&&<a href=\{checkout\}>/);
 assert.match(offer,/Nenhuma cobrança será gerada/);
 assert.doesNotMatch(offer,/\.update\(|\.insert\(|fetch\(/);
});
