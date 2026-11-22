import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const send=read("app/torre/analises-fiscais/send-quote-action.ts");
const detail=read("app/torre/analises-fiscais/[id]/page.tsx");
const listing=read("app/torre/analises-fiscais/page.tsx");
const proposal=read("app/proposta/analise-fiscal/[token]/page.tsx");
test("server action envia a Proposta sem depender da integração financeira",()=>{
 assert.match(send,/await requireAdmin\(\)/);
 assert.match(send,/FISCAL_ANALYSIS_QUOTE_EMAIL_ENABLED==="0"/);
 assert.doesNotMatch(send,/FISCAL_ANALYSIS_VARIABLE_CHECKOUT_ENABLED/);
 assert.match(send,/status:"sent"/);
 assert.match(send,/fiscalProposalExpiresAt\(new Date\(sentAt\)\)/);
 assert.match(send,/\.in\("email_delivery_state",\["idle","failed"\]\)/);
 assert.match(send,/\.eq\("email_send_claim",claim\)/);
 assert.doesNotMatch(send,/\.from\("orders"\)|blingRequest|reserve_fiscal_analysis_quote_order/);
});
test("Torre habilita envio com SMTP e token, e mantém checkout separado",()=>{
 assert.match(detail,/const smtpReady=Boolean\(process\.env\.SMTP_HOST/);
 assert.match(detail,/const tokenReady=fiscalQuoteTokenReady\(\)/);
 assert.match(detail,/const sendAvailable=!sendBlocked&&tokenReady&&smtpReady/);
 assert.match(detail,/A Proposta será enviada a/);
 assert.match(detail,/nenhuma cobrança será gerada agora/);
 assert.doesNotMatch(detail,/sendAvailable=.*FISCAL_ANALYSIS_VARIABLE_CHECKOUT_ENABLED/);
 assert.match(listing,/SMTP da Proposta configurado/);
 assert.match(listing,/Assinatura segura do link de Proposta/);
 assert.match(listing,/Checkout individual habilitado neste aplicativo/);
});
test("cliente só segue ao checkout mediante ação expressa após Proposta enviada",()=>{
 assert.match(proposal,/q\.status==="sent"&&process\.env\.FISCAL_ANALYSIS_VARIABLE_CHECKOUT_ENABLED==="1"/);
 assert.match(proposal,/Aprovar Proposta e contratar/);
 assert.match(proposal,/checkout\/ANALISE-FISCAL-INDIVIDUAL\?proposta=/);
 assert.match(proposal,/Abrir esta Proposta não gera cobrança/);
});
