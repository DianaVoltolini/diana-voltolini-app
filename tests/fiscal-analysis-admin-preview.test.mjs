import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const preview=read("app/torre/analises-fiscais/previa/page.tsx");
const dashboard=read("app/torre/analises-fiscais/page.tsx");

test("prévia é exclusiva de administrador e não indexável",()=>{
 assert.match(preview,/await requireAdmin\(\)/);
 assert.match(preview,/robots:\{index:false,follow:false\}/);
 assert.match(preview,/export const dynamic="force-dynamic"/);
});
test("prévia cobre Torre, atendimento e Área do Cliente",()=>{
 for(const key of ['"lista"','"torre"','"cliente"','ListPreview','TorrePreview','ClientPreview']){
  assert.ok(preview.includes(key),key);
 }
 assert.match(dashboard,/Visualizar telas demonstrativas/);
 assert.match(dashboard,/\/torre\/analises-fiscais\/previa/);
});
test("prévia não gera cobranças, e-mails, arquivos ou registros",()=>{
 assert.doesNotMatch(preview,/getSupabaseAdmin|\.insert\(|\.update\(|\.upload\(|\.sendMail\(|blingRequest|fetch\(/);
 assert.doesNotMatch(preview,/<form\s+action=/);
 assert.match(preview,/disabled/);
 assert.match(preview,/SOMENTE LEITURA/);
 assert.match(preview,/Arquivos? ilustrativo/);
});
test("prévia utiliza os estilos existentes, sem global CSS",()=>{
 assert.match(preview,/comercio-v2\/commercial\.module\.css/);
 assert.match(preview,/className=\{css\.page\}/);
 assert.match(preview,/className=\{css\.section\}/);
 assert.match(preview,/className=\{css\.table\}/);
});
