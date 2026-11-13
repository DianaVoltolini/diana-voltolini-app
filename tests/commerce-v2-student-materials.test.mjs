// tests/commerce-v2-student-materials.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sql=read("supabase/migrations/20261112_commerce_v2_student_delivery_planning.sql");
const lib=read("app/torre/comercio-v2/materiais/materials-table.tsx");
const editor=read("app/torre/comercio-v2/materiais/novo/page.tsx");
const save=read("app/torre/comercio-v2/materiais/salvar/route.ts");
const product=read("app/torre/comercio-v2/produtos/page.tsx");
const page=read("app/torre/comercio-v2/produtos/materiais/page.tsx");
const actions=read("app/torre/comercio-v2/produtos/materiais/actions.ts");
test("Biblioteca mantém flag privada, desligada por padrão",()=>{
 assert.match(sql,/available_to_student boolean NOT NULL DEFAULT false/);
 assert.match(lib,/Disponível para aluno/);
 assert.match(editor,/name="available_to_student"/);
 assert.match(save,/available_to_student: availableToStudent/);
});
test("vínculo pertence a produto e material e exige data consistente",()=>{
 assert.match(sql,/PRIMARY KEY \(product_id,material_id\)/);
 assert.match(sql,/release_mode IN \('after_payment','scheduled'\)/);
 assert.match(sql,/release_date_required/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(actions,/await requireAdmin\(\)/);
 assert.match(actions,/available_to_student",true/);
 assert.match(actions,/\.not\("storage_path","is",null\)|material\?\.storage_path/);
 assert.match(actions,/validCivilDate/);
});
test("Torre seleciona produto, material e modalidade sem ativar entrega legada",()=>{
 assert.match(product,/produtos\/materiais\?produto=/);
 assert.match(page,/name="releaseMode"/);
 assert.match(page,/name="releaseDate"/);
 assert.match(page,/after_payment/);
 assert.match(page,/scheduled/);
 assert.match(page,/sem publicação automática/i);
});
