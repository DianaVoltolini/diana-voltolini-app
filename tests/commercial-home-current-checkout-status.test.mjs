// tests/commercial-home-current-checkout-status.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync(new URL("../app/torre/comercio-v2/page.tsx",import.meta.url),"utf8");
test("visão da Torre utiliza status real de produtos vinculados sem habilitar vendas",()=>{
 assert.match(page,/from\("commerce_v2_products"\)/);
 assert.match(page,/from\("products"\)/);
 assert.match(page,/product\?\.active&&product\.checkout_enabled/);
 assert.match(page,/Number\.isSafeInteger\(product\.bling_product_id\)/);
 assert.match(page,/Checkout não habilitado/);
 assert.match(page,/Não foi possível consultar a situação dos checkouts/);
 assert.doesNotMatch(page,/\.update\(|\.insert\(|\.rpc\(/);
});
test("checkout atual e V2 são identificados separadamente",()=>{
 assert.match(page,/Encontro Online e o e-book já têm fluxos comerciais ativos/);
 assert.match(page,/publicar uma página V2 não cria automaticamente outro checkout/);
 assert.match(page,/ASSINATURA-FISCAL-001/);
 assert.match(page,/DIAGNOSTICO-EXPRESSO-IBS-CBS/);
 assert.doesNotMatch(page,/Ambiente de implantação — sem novas vendas/);
});
