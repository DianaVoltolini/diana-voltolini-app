// tests/email-template-cta-catalog.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const page=read("app/torre/modelos-email/editor/page.tsx");
const editor=read("app/torre/modelos-email/template-editor.tsx");
const save=read("app/torre/modelos-email/actions.ts");
test("editor consulta CTAs ativos compartilhados com o Blog",()=>{
 assert.match(page,/from\("fiscal_ctas"\)/);
 assert.match(page,/\.eq\("active",true\)/);
 assert.match(page,/ctas=\{ctaRows\?\?\[\]\}/);
 assert.match(editor,/ctas\.filter\(c=>c.active\)/);
 assert.match(editor,/label:"CTA — "\+c\.name/);
 assert.match(editor,/buttonLabel:c\.button_label/);
 assert.match(editor,/destinations\.map\(d=><option/);
});
test("modelo existente mantém destino e botão escolhido",()=>{
 assert.match(editor,/selected\?\.cta_url/);
 assert.match(editor,/selected\?\.cta_label/);
 assert.match(editor,/if\(savedUrl&&!destinations\.some/);
 assert.match(editor,/setCta\(chosen\.buttonLabel\)/);
});
test("servidor só aceita URL segura de CTA cadastrado, legado ou do modelo existente",()=>{
 assert.match(save,/from\("fiscal_ctas"\)/);
 assert.match(save,/\.eq\("active",true\)\.eq\("url",cta_url\)/);
 assert.match(save,/legacyDestinations\.includes\(cta_url\)/);
 assert.match(save,/previouslySaved=existing\?\.cta_url===cta_url/);
 assert.match(save,/u\.protocol==="https:"/);
 assert.match(save,/app\.dianavoltolini\.com\.br/);
});
