// tests/commerce-v2-material-library-categories.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const editor=read("app/torre/comercio-v2/materiais/novo/page.tsx");
const save=read("app/torre/comercio-v2/materiais/salvar/route.ts");
const list=read("app/torre/comercio-v2/materiais/materials-table.tsx");
const main=read("app/torre/comercio-v2/materiais/page.tsx");
const sql=read("supabase/migrations/20261118_commerce_v2_material_subjects_independent_library.sql");
const sidebar=read("app/torre/sidebar.tsx");
test("cadastro separa tipo, classificação, título e arquivo obrigatório",()=>{
 assert.match(editor,/Título do material/);
 assert.match(editor,/name="subject_code"/);
 assert.match(editor,/\+ Tipos de Material/);
 assert.match(editor,/\+ Categoria/);
 assert.match(editor,/required=\{!material\?\.original_filename\}/);
 assert.ok(editor.indexOf("Descrição — o que contém este material")<editor.indexOf("Enviar arquivo"));
 assert.ok(editor.indexOf("Disponível para aluno — permite")<editor.indexOf("Em quais produtos este material será entregue?"));
});
test("materiais sem cursos e sem anexo novo são tratados corretamente",()=>{
 assert.doesNotMatch(save,/eligibleProductIds\.length === 0/);
 assert.match(save,/eligibleProductIds\.length\)\{/);
 assert.match(save,/if\(!file && !existingResult\?\.data\?\.original_filename\)/);
 assert.match(save,/eligibleProductIds\[0\]\?\?null/);
 assert.match(save,/productId \?\? "biblioteca"/);
 assert.match(sql,/alter column product_id drop not null/);
 assert.match(sql,/subject_code text not null default 'geral'/);
});
test("categoria permite filtro no acervo; menu lateral Biblioteca removido",()=>{
 assert.match(list,/Todas as categorias/);
 assert.match(list,/item\.subject_code !== subject/);
 assert.match(main,/subjects=\{subjects\}/);
 assert.doesNotMatch(sidebar,/item\("\/torre\/comercio-v2\/materiais","Biblioteca de Materiais"\)/);
 assert.match(sql,/enable row level security/i);
 assert.match(sql,/revoke all .*anon,authenticated/i);
});
