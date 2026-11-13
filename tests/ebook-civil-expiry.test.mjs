// tests/ebook-civil-expiry.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const path=new URL("../lib/ebooks/access.ts",import.meta.url);
const source=readFileSync(path,"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
vm.runInNewContext(compiled,{exports,Date,Intl,Object,Math,Number}, {filename:"access.js"});
const {ebookAccessUntil,ebookAccessActive,ebookAccessDateLabel}=exports;
const paid=timestamp=>[{paid_at:timestamp,created_at:"2026-11-12T12:00:00Z"}];

test("90 dias civis desde 12/11 terminam em 10/02, qualquer hora do pagamento",()=>{
 for(const at of ["2026-11-12T03:01:00Z","2026-11-12T23:59:59Z"]){
   const until=ebookAccessUntil(paid(at));
   assert.equal(ebookAccessDateLabel(until),"10/02/2027");
   assert.equal(ebookAccessActive(until,new Date("2027-02-11T02:59:59.999Z")),true);
   assert.equal(ebookAccessActive(until,new Date("2027-02-11T03:00:00.000Z")),false);
 }
});
test("pagamento próximo à meia-noite UTC usa data de Brasília",()=>{
 const until=ebookAccessUntil(paid("2026-11-13T02:50:00Z")); // 12/11 em SP
 assert.equal(ebookAccessDateLabel(until),"10/02/2027");
});
test("sem pagamento confirmado, sem acesso",()=>{
 assert.equal(ebookAccessUntil([{paid_at:null,created_at:"2026-11-12T12:00:00Z"}]),null);
 assert.equal(ebookAccessActive(null),false);
});
