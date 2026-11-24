import "./email-template-save-feedback.test.mjs";
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
 assert.match(editor,/c\.name\.startsWith\("CTA — "\)/);
 assert.match(editor,/buttonLabel:c\.button_label/);
 assert.match(editor,/destinations\.map\(d=><option/);
});
test("modelo existente mantém destino e botão escolhido",()=>{
 assert.match(editor,/selected\?\.cta_url/);
 assert.match(editor,/selected\?\.cta_label/);
 assert.match(editor,/if\(savedUrl&&!matchingCta&&!matchingLanding&&!matchingLegacy\)/);
 assert.match(editor,/setCta\(chosen\.buttonLabel\)/);
});
test("servidor só aceita URL segura de CTA cadastrado, legado ou do modelo existente",()=>{
 assert.match(save,/from\("fiscal_ctas"\)/);
 assert.match(save,/\.eq\("id",selectedCtaId\)\.eq\("active",true\)/);
 assert.match(save,/legacyDestinations\.includes\(cta_url\)/);
 assert.match(save,/previouslySaved=existing\?\.cta_url===cta_url/);
 assert.match(save,/u\.protocol==="https:"/);
 assert.match(save,/app\.dianavoltolini\.com\.br/);
});

test("landing pages publicadas aparecem no seletor sem duplicar CTA",()=>{
 assert.match(page,/from\("marketing_landings"\)/);
 assert.match(page,/id,title,slug,status,button_text/);
 assert.match(editor,/landings\.filter\(l=>l\.status==="published"\|\|l\.id===defaultLandingId\)/);
 assert.match(editor,/key:"landing:"\+l\.id/);
 assert.match(editor,/cta_landing_id/);
 assert.match(editor,/matchingLanding/);
 assert.match(editor,/setCta\(chosen\.buttonLabel\)/);
});
test("servidor resolve CTA da landing publicada por ID e valida o destino",()=>{
 assert.match(save,/selectedLandingCtaId/);
 assert.match(save,/from\("marketing_landings"\)/);
 assert.match(save,/\.eq\("id",selectedLandingCtaId\)\.maybeSingle\(\)/);
 assert.match(save,/landingCta\.status!=="published"/);
 assert.match(save,/landing_id===selectedLandingCtaId/);
 assert.match(save,/cta_url="https:\/\/dianavoltolini\.com\.br\/l\/"\+landingCta\.slug/);
 assert.match(save,/if\(selectedCtaId&&selectedLandingCtaId\)/);
});
