// tests/encounter-page-visual-parity.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const page=read("app/painel/encontro-online/page.tsx");
const css=read("app/painel/encontro-online/encounter-page.module.css");
const shared=read("app/painel/product-page.module.css");
const ebook=read("app/painel/ebooks/page.tsx");

test("encontro usa o mesmo cabeçalho e fundo dos produtos do cliente",()=>{
 assert.match(page,/import ProductPage from "\.\.\/product-page"/);
 assert.match(page,/<ProductPage title="Meus Encontros Online"/);
 assert.match(shared,/background:#f4f6f8/);
 assert.doesNotMatch(page,/\.\.\/outros-produtos\/page\.module\.css/);
});
test("cards seguem cores, borda dourada, tipografia e botões do e-book",()=>{
 assert.match(css,/border-top:4px solid #c9a227/);
 assert.match(css,/background:#fff/);
 assert.match(css,/font-family:Georgia,serif/);
 assert.match(css,/background:#c9a227/);
 assert.match(css,/border-radius:9px/);
 assert.match(page,/className=\{styles\.encounterCard\}/);
 assert.match(page,/className=\{styles\.primaryButton\}/);
 assert.match(ebook,/borderTop:\s*"4px solid #c9a227"/);
});
test("alterações visuais preservam materiais, download e preferências",()=>{
 assert.match(page,/purchases\.map\(order/);
 assert.match(page,/origem=encontro/);
 assert.match(page,/publishedMaterials\.map\(material/);
 assert.match(page,/confirmEncounterAttendance/);
 assert.match(page,/termsAcknowledged/);
 assert.match(page,/reminderOptIn/);
});
