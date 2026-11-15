// tests/commercial-offer-live-checkout-status.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync(new URL("../app/torre/comercio-v2/ofertas/page.tsx",import.meta.url),"utf8");

test("Torre identifica ofertas conectadas usando cadastro de checkout existente",()=>{
  assert.match(page,/\.from\("products"\)\.select\("id,active,checkout_enabled,bling_product_id"\)/);
  assert.match(page,/product\?\.sales_product_id \? liveProducts\.get\(product\.sales_product_id\)/);
  assert.match(page,/live\.active && live\.checkout_enabled/);
  assert.match(page,/Number\.isSafeInteger\(live\.bling_product_id\)/);
  assert.match(page,/ENC-RT-2027-001"\) return "Oferta conectada ao checkout"/);
  assert.match(page,/EBOOK-IBSCBS-001"\) return "Preço conectado ao checkout"/);
  assert.match(page,/return "Rascunho"/);
  assert.match(page,/offerStatus\(o\)/);
});
test("não converte ofertas V2 para published e não altera os pagamentos",()=>{
  assert.doesNotMatch(page,/\.update\(|\.insert\(|\.rpc\(/);
  assert.match(page,/status técnico V2 continua como rascunho/);
});
