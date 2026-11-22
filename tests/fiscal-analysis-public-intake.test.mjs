import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const page=read("app/solicitar-analise-fiscal/page.tsx");
const action=read("app/solicitar-analise-fiscal/actions.ts");
const torre=read("app/torre/analises-fiscais/page.tsx");

test("o cliente preenche a solicitação fora da rota administrativa",()=>{
 assert.match(page,/submitPublicFiscalAnalysisRequest/);
 assert.match(torre,/href="\/solicitar-analise-fiscal"/);
 assert.match(torre,/Cadastro interno/);
 assert.doesNotMatch(page,/requireAdmin\(|\/torre\/analises-fiscais\/nova/);
 assert.match(page,/Inform[e]? apenas os dados necessários|Informe apenas os dados necessários/);
});
test("somente o servidor grava solicitação recebida e não cria cobrança",()=>{
 assert.match(action,/getSupabaseAdmin\(\)/);
 assert.match(action,/\.from\("fiscal_analysis_requests"\)\.insert\(/);
 assert.match(action,/status:"received"/);
 assert.match(action,/request_received_public/);
 assert.match(action,/revalidatePath\("\/torre\/analises-fiscais"\)/);
 assert.doesNotMatch(action,/blingRequest|\.from\("orders"\)|reserve_fiscal_analysis_quote_order|sendMail/);
});
test("formulário valida campos, consentimento e limita solicitações repetidas",()=>{
 assert.match(action,/consent!=="yes"/);
 assert.match(action,/value\(form,"website",200\)/);
 assert.match(action,/\.eq\("customer_email",email\)/);
 assert.match(action,/count\?\?0\)>=3/);
 assert.match(page,/name="consent"/);
 assert.match(page,/type="email"/);
 assert.match(page,/name="question"/);
 assert.match(page,/recebida==="1"/);
 assert.match(page,/Sem cobrança ou compromisso/);
});
