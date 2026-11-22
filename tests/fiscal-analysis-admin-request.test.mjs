import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("A Torre pode registrar solicitações sem ativar o financeiro",()=>{
 const action=read("app/torre/analises-fiscais/new-request-action.ts");
 const form=read("app/torre/analises-fiscais/nova/page.tsx");
 const listing=read("app/torre/analises-fiscais/page.tsx");
 assert.match(action,/await requireAdmin\(\)/);
 assert.match(action,/\.from\("fiscal_analysis_requests"\)/);
 assert.match(action,/status:"received"/);
 assert.match(action,/source:"torre"/);
 assert.doesNotMatch(action,/\.from\("orders"\)|blingRequest|reserve_fiscal_analysis_quote_order|sendMail/);
 assert.match(form,/action=\{createFiscalAnalysisRequest\}/);
 assert.match(listing,/href="\/torre\/analises-fiscais\/nova"/);
 assert.match(form,/não emite cobrança/);
});
