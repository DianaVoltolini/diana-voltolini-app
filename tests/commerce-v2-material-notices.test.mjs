// tests/commerce-v2-material-notices.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const layout=read("app/painel/layout.tsx");
const notices=read("lib/commerce-v2/material-update-notices.ts");
const action=read("app/painel/material-updates-actions.ts");
const bell=read("app/painel/material-updates-bell.tsx");

test("avisos usam Biblioteca V2, sem depender de product_deliveries",()=>{
  assert.match(layout,/getV2MaterialNoticesForUser/);
  assert.doesNotMatch(layout,/\.from\("product_deliveries"\)/);
  assert.doesNotMatch(action,/\.from\("product_deliveries"\)/);
  assert.match(notices,/commerce_v2_materials/);
});
test("somente pedidos pagos, arquivos liberados, acesso vigente e atualizacoes posteriores",()=>{
  assert.match(notices,/\.eq\("status","paid"\)/);
  assert.match(notices,/getStudentMaterialsForOrder\(order\)/);
  assert.match(notices,/filter\(m=>m\.isReleased\)/);
  assert.match(notices,/\.eq\("available_to_student",true\)/);
  assert.match(notices,/when<=Date\.parse\(order\.paid_at!\)/);
  assert.match(notices,/when<=Date\.parse\(item\.created_at\)/);
});
test("marcar como lido exige identidade e valida novamente aviso disponível",()=>{
  assert.match(action,/auth\.auth\.getUser\(\)/);
  assert.match(action,/getV2MaterialNoticesForUser\(userId\)/);
  assert.match(action,/notice\.latestUpdate/);
  assert.match(action,/product_delivery_reads/);
  assert.match(bell,/Marcar como lido/);
});
