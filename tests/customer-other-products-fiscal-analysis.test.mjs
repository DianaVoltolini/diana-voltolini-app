import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("Análise Fiscal Individual aparece no catálogo da Área do Cliente sem ativar contratação",()=>{
 const page=read("app/painel/outros-produtos/page.tsx");
 assert.match(page,/key: "fiscalAnalysis"/);
 assert.match(page,/title: "Análise Fiscal Individual"/);
 assert.match(page,/url: "\/painel\/analises-fiscais"/);
 assert.match(page,/Em preparação/);
 assert.doesNotMatch(page,/checkout\/ANALISE-FISCAL-INDIVIDUAL/);
});
test("indicação de adquirido somente para análise paga vinculada ao usuário",()=>{
 const page=read("app/painel/outros-produtos/page.tsx");
 assert.match(page,/\.from\("fiscal_analysis_requests"\)/);
 assert.match(page,/\.eq\("user_id", uid\)\.not\("paid_at", "is", null\)/);
 assert.match(page,/fiscalAnalysis: Boolean\(fiscalAnalyses\?\.length\)/);
 assert.match(page,/Acessar meu atendimento/);
});
test("cartão usa estilo e grade responsiva existentes",()=>{
 const css=read("app/painel/outros-produtos/page.module.css");
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/\.pending\{/);
});
