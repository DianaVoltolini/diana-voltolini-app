// tests/commerce-v2-customer-delivery.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sql=read("supabase/migrations/20261113_commerce_v2_customer_delivery_bridge.sql");
const admin=read("app/torre/comercio-v2/produtos/materiais/actions.ts");
const adminPage=read("app/torre/comercio-v2/produtos/materiais/page.tsx");
const helper=read("lib/commerce-v2/student-delivery.ts");
const api=read("app/api/commerce-v2/materials/[id]/download/route.ts");
const encounter=read("app/painel/encontro-online/page.tsx");
const ebooks=read("app/painel/ebooks/page.tsx");
test("vínculo V2 e venda real é opcional e inativo até validação",()=>{
  assert.match(sql,/sales_product_id uuid REFERENCES public\.products\(id\)/);
  assert.match(sql,/student_delivery_active boolean NOT NULL DEFAULT false/);
  assert.match(sql,/commerce_v2_products_sales_product_unique/);
  assert.match(admin,/live\.code!==adminProduct\.code/);
  assert.match(admin,/live\?\.code!==product\.code/);
  assert.match(adminPage,/Ativar entrega aos clientes/);
});
test("regra de liberação exige produto ativado, material elegível e prazo",()=>{
  assert.match(helper,/\.eq\("student_delivery_active",true\)/);
  assert.match(helper,/\.eq\("available_to_student",true\)/);
  assert.match(helper,/\.eq\("is_archived",false\)/);
  assert.match(helper,/commerce_v2_material_product_eligibility/);
  assert.match(helper,/brasiliaCivilDay/);
  assert.match(helper,/ebookAccessActive\(expiresAt\)/);
  assert.match(helper,/today>=date/);
});
test("download verifica identidade, pagamento, produto e data antes do link temporário",()=>{
  assert.match(api,/auth\.getUser\(\)/);
  assert.match(api,/\.eq\("user_id",identity\.user\.id\)/);
  assert.match(api,/\.eq\("status","paid"\)/);
  assert.match(api,/\.not\("paid_at","is",null\)/);
  assert.match(api,/item=>item\.id===id && item\.isReleased/);
  assert.match(api,/createSignedUrl\(file\.storage_path,60/);
  assert.match(api,/commerce-v2-materials/);
});
test("mantém e-books e encontros separados por compra e o layout existente",()=>{
  assert.match(ebooks,/ownedBooks\.map/);
  assert.match(encounter,/purchases\.map\(order/);
  assert.match(encounter,/className=\{styles\.encounterCard\}/);
  assert.match(encounter,/getStudentMaterialsForOrder\(order\)/);
  assert.match(ebooks,/getStudentMaterialsForOrder\(order\)/);
  assert.match(encounter,/\/api\/commerce-v2\/materials\//);
  assert.match(ebooks,/\/api\/commerce-v2\/materials\//);
});
