import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("a conclusão exige documento da equipe em PDF ou Word visível ao cliente",()=>{
 const code=read("app/torre/analises-fiscais/service-actions.ts");
 assert.match(code,/if\(target==="completed"\)/);
 assert.match(code,/\.eq\("uploaded_by_role","admin"\)/);
 assert.match(code,/\.eq\("visible_to_client",true\)/);
 assert.match(code,/application\/pdf/);
 assert.match(code,/application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/);
 assert.match(code,/if\(!deliveries\?\.length\)fail\("admin",id,"entrega_obrigatoria"\)/);
 assert.ok(code.indexOf('if(target==="completed")')<code.indexOf('db.from("fiscal_analysis_requests").update('));
});
test("a Torre mostra situação da entrega e bloqueia concluir sem documento",()=>{
 const page=read("app/torre/analises-fiscais/[id]/page.tsx");
 assert.match(page,/const deliveryReady=/);
 assert.match(page,/option\.code==="completed"&&!deliveryReady/);
 assert.match(page,/entrega_obrigatoria:/);
 assert.match(page,/Disponibilizar este documento ao cliente/);
});
test("a Área do Cliente distingue documentos de entrega",()=>{
 const page=read("app/painel/analises-fiscais/[id]/page.tsx");
 assert.match(page,/Documentos e entrega da análise/);
 assert.match(page,/file\.uploaded_by_role==="admin"/);
 assert.match(page,/Documento da equipe/);
 assert.match(page,/Atendimento concluído/);
});
