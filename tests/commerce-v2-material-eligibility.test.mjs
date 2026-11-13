// tests/commerce-v2-material-eligibility.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sql=read("supabase/migrations/20261113_commerce_v2_material_product_eligibility.sql");
const editor=read("app/torre/comercio-v2/materiais/novo/page.tsx");
const save=read("app/torre/comercio-v2/materiais/salvar/route.ts");
const materialList=read("app/torre/comercio-v2/materiais/materials-table.tsx");
const productDelivery=read("app/torre/comercio-v2/produtos/materiais/page.tsx");
const action=read("app/torre/comercio-v2/produtos/materiais/actions.ts");
const importer=read("app/torre/comercio-v2/materiais/importar/processar/route.ts");
test("um material pode pertencer a vários produtos sem duplicar arquivo",()=>{
 assert.match(sql,/PRIMARY KEY \(material_id,product_id\)/);
 assert.match(sql,/INSERT INTO public.commerce_v2_material_product_eligibility/);
 assert.match(editor,/name="eligible_product_ids"/);
 assert.match(save,/getAll\("eligible_product_ids"\)/);
 assert.match(save,/commerce_v2_material_product_eligibility/);
 assert.match(importer,/commerce_v2_material_product_eligibility/);
});
test("Produtos mostra e salva somente arquivos elegíveis",()=>{
 assert.match(productDelivery,/\.eq\("product_id",selected\.id\)/);
 assert.match(productDelivery,/allowedIds\.has\(material\.id\)/);
 assert.match(action,/if\(eligibilityError\|\|!eligibility\)/);
 assert.match(materialList,/eligible_product_ids\.includes\(product\)/);
});
test("ao desvincular produto remove programação sem mudar arquivo da biblioteca",()=>{
 assert.match(save,/removeSchedulesError/);
 assert.match(save,/\.delete\(\)\.eq\("material_id",materialId\)\.in\("product_id",removed\)/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
});
