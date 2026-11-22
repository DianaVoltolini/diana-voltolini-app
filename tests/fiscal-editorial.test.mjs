import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {marked} from "marked";
import {groupEditorialSections} from "../lib/fiscal/editorial-grouping.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("preserva todos os tokens e os dados de um estudo de caso",()=>{
 const body=[
  "## Caso de NF-e",
  "",
  "### Exemplo prático: mercadoria perdida durante transporte",
  "Uma empresa compra por R$ 10.000,00.",
  "",
  "- O produto não chegou.",
  "- O remetente emitiu NF-e.",
  "",
  "#### Como funciona atualmente?",
  "O procedimento depende da ocorrência.",
  "",
  "| Campo | Valor |",
  "| --- | --- |",
  "| Total da NF-e | R$ 10.000,00 |",
  "",
  "## Conclusão",
  "Os procedimentos devem ser documentados.",
  "",
  "A conferência deve ser realizada."
 ].join("\n");
 const tokens=marked.lexer(body,{gfm:true});
 const groups=groupEditorialSections(tokens);
 const example=groups.find(g=>g.kind==="example");
 const conclusion=groups.find(g=>g.kind==="conclusion");
 assert.ok(example&&conclusion);
 assert.ok(example.tokens.some(x=>x.type==="list"));
 assert.ok(example.tokens.some(x=>x.type==="table"));
 assert.ok(example.tokens.some(x=>x.type==="heading"&&x.depth===4));
 assert.equal(conclusion.tokens.filter(x=>x.type==="paragraph").length,2);
 const flatten=groups.flatMap(g=>g.tokens);
 assert.equal(flatten.length,tokens.length);
 assert.ok(flatten.every((token,index)=>token===tokens[index]));
});
test("prévia, assinantes e blog usam composição de seção",()=>{
 const renderer=read("components/fiscal-rich-text.tsx");
 const editor=read("app/torre/conteudos/editor/article-body-editor.tsx");
 const page=read("app/painel/assinatura/[slug]/page.tsx");
 assert.match(renderer,/groupEditorialSections\(marked\.lexer/);
 assert.match(editor,/<FiscalRichText body=\{body\} editorial\/>/);
 assert.match(page,/<FiscalRichText body=\{article\.body\?\?""\} editorial\/>/);
 assert.match(editor,/Atualizar prévia Markdown/);
 assert.match(editor,/A conversão para o editor visual pode modificar Markdown avançado/);
});
