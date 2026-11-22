import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("a Proposta enviada atualiza todos os estados de entrada permitidos",()=>{
 const code=read("app/torre/analises-fiscais/send-quote-action.ts");
 assert.match(code,/\.in\("status",\["received","awaiting_details","quoting"\]\)/);
 assert.match(code,/fiscalProposalExpiresAt/);
});
test("vínculo financeiro exige autenticação, e-mail confirmado e pagamento efetivo",()=>{
 const code=read("app/painel/analises-fiscais/claim-action.ts");
 assert.match(code,/auth\.auth\.getUser\(\)/);
 assert.match(code,/user\.email_confirmed_at/);
 assert.match(code,/\.eq\("customer_email",email\)\.eq\("status","paid"\)/);
 assert.match(code,/\.not\("paid_at","is",null\)/);
 assert.match(code,/\.is\("user_id",null\)/);
 assert.match(code,/quote\.status!=="accepted"/);
 assert.match(code,/quote\.amount_cents!==order\.amount_cents/);
 assert.match(code,/request\.customer_email\.trim\(\)\.toLowerCase\(\)!==email/);
 assert.match(code,/\.update\(\{user_id:user\.id/);
 assert.doesNotMatch(code,/reserve_fiscal_analysis_quote_order|blingRequest/);
});
test("cliente consegue conferir pagamentos e acessar atendimento vinculado",()=>{
 const code=read("app/painel/analises-fiscais/page.tsx");
 assert.match(code,/claimPaidFiscalAnalyses/);
 assert.match(code,/Verificar pagamento confirmado/);
 assert.match(code,/\/painel\/analises-fiscais\/"/); 
});
test("Proposta aceita permite consultar cobrança existente, sem gerar nova",()=>{
 const code=read("app/proposta/analise-fiscal/[token]/page.tsx");
 assert.match(code,/\.in\("status",\["sent","accepted"\]\)/);
 assert.match(code,/getFiscalProposalPayment\(q\)/);
 assert.match(code,/payment\.state==="pending"/);
 assert.match(code,/payment\.state==="paid"/);
 const payment=read("lib/fiscal/analysis-proposal-payment.ts");
 assert.match(payment,/fiscal_analysis_quote_id/);
 assert.match(payment,/fiscal_analysis_quote_version/);
 assert.match(payment,/fiscal_analysis_request_id/);
 assert.match(payment,/\.eq\("provider","bling"\)/);
 assert.doesNotMatch(payment,/\.insert\(|\.upload\(|blingRequest/);
});
