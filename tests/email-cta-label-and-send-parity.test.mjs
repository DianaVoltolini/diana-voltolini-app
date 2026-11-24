// tests/email-cta-label-and-send-parity.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const editor=read("app/torre/modelos-email/template-editor.tsx");
const save=read("app/torre/modelos-email/actions.ts");
const manual=read("lib/marketing/manual-queue.ts");
const controlled=read("app/torre/modelos-email/test-newsletter-action.ts");
const render=read("lib/marketing/email-test.ts");

test("CTA selecionado vincula nome, URL e texto ao mesmo ID",()=>{
 assert.match(editor,/key:"cta:"\+c\.id/);
 assert.match(editor,/url:c\.url,buttonLabel:c\.button_label,ctaId:c\.id/);
 assert.match(editor,/name="cta_id" value=\{catalogCtaId\}/);
 assert.match(editor,/setCta\(chosen\.buttonLabel\)/);
 assert.match(editor,/readOnly=\{Boolean\(catalogCtaId\)\}/);
 assert.match(editor,/Personalize o texto deste botão apenas para o e-mail/);
 assert.match(editor,/href=\{url\}.*className=\{css\.mailButton\}/);
 assert.match(editor,/\{cta\}<\/a>/);
});
test("servidor obtém texto e destino de CTA ativo no momento de salvar",()=>{
 assert.match(save,/\.select\("id,button_label,url"\)\.eq\("id",selectedCtaId\)\.eq\("active",true\)/);
 assert.match(save,/cta_label=source\.button_label/);
 assert.match(save,/cta_url=source\.url/);
 assert.match(save,/const payload=\{audience_kind,[^\n]*name,description:/);
 assert.match(save,/cta_label,cta_url,active:/);
});
test("campanha real e teste controlado usam mesmo snapshot salvo no modelo",()=>{
 assert.match(manual,/cta_url:string\|null;cta_label:string\|null/);
 assert.match(manual,/\[BOTAO: "\+item\.cta_label\+" \| "\+item\.cta_url/);
 assert.match(manual,/html:renderNewsletterEmail\(subject,formatted,unsubUrl\)/);
 assert.match(controlled,/\.select\("id,subject,body,cta_label,cta_url"\)/);
 assert.match(controlled,/\[BOTAO: "\+model\.cta_label\+" \| "\+model\.cta_url/);
 assert.match(controlled,/html:renderNewsletterEmail\(subject,formatted,unsubscribeUrl\)/);
 assert.match(render,/<a href=/);
});

test("modelo de landing preserva CTA editável enquanto valida destino por ID",()=>{
 assert.match(save,/cta_url="https:\/\/dianavoltolini\.com\.br\/l\/"\+landingCta\.slug/);
 assert.match(save,/if\(!cta_label\)return fail\("Informe o texto do botão do e-mail\."\)/);
 assert.doesNotMatch(save,/cta_label=\(landingCta\.button_text/);
});
