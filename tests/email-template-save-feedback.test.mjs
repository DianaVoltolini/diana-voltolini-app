import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const editor=read("app/torre/modelos-email/template-editor.tsx");
const save=read("app/torre/modelos-email/actions.ts");

test("erros do salvamento não redirecionam nem apagam os campos do editor",()=>{
 const saveAction=save.slice(save.indexOf("export async function saveEmailTemplate("),save.indexOf("export async function saveEmailDraft("));
 assert.doesNotMatch(saveAction,/redirect\(/);
 assert.match(saveAction,/return fail\("Landing ainda não publicada/);
 assert.match(saveAction,/return fail\("Não foi possível salvar o modelo no banco/);
 assert.match(saveAction,/console\.error\("\[email-template-save\] database write"/);
 assert.match(editor,/useActionState<EmailTemplateSaveState,FormData>\(saveEmailTemplate/);
 assert.match(editor,/saveState\.status==="error"\?"alert":"status"/);
 assert.match(editor,/savePending\?"Salvando\.\.\.":"Salvar modelo"/);
});
test("novo modelo salvo abre sua edição para evitar cadastro duplicado",()=>{
 assert.match(save,/\.insert\(payload\)\.select\("id"\)\.maybeSingle\(\)/);
 assert.match(save,/savedId=saved\.id/);
 assert.match(editor,/router\.replace\(setupMode&&defaultLandingId\?/);
 assert.match(editor,/\?"\/torre\/landings\/editor\?id="/);
});
