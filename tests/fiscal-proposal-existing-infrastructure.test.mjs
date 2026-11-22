import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const links=read("lib/fiscal/analysis-quote-links.ts");
const detail=read("app/torre/analises-fiscais/[id]/page.tsx");
const listing=read("app/torre/analises-fiscais/page.tsx");
const send=read("app/torre/analises-fiscais/send-quote-action.ts");
test("link seguro reaproveita segredo do servidor sem expor credenciais",()=>{
 assert.match(links,/export function fiscalQuoteTokenReady/);
 assert.match(links,/process\.env\.FISCAL_ANALYSIS_QUOTE_TOKEN_SECRET/);
 assert.match(links,/process\.env\.SUPABASE_SECRET_KEY/);
 assert.match(links,/return createHmac\("sha256",tokenSecret\(\)\)/);
 assert.match(links,/fiscal-analysis-quote:v1:/);
 assert.doesNotMatch(links,/NEXT_PUBLIC_SUPABASE/);
});
test("Torre mostra o botão com SMTP existente e segredo de servidor",()=>{
 assert.match(detail,/const tokenReady=fiscalQuoteTokenReady\(\)/);
 assert.match(detail,/const smtpReady=Boolean\(process\.env\.SMTP_HOST/);
 assert.match(detail,/const sendAvailable=!sendBlocked&&tokenReady&&smtpReady/);
 assert.match(detail,/Enviar Proposta por e-mail/);
 assert.match(detail,/SMTP precisa estar configurado na hospedagem da Torre/);
 assert.match(listing,/fiscalQuoteTokenReady\(\)/);
});
test("nenhuma operação no Bling é criada ao enviar a Proposta",()=>{
 assert.match(send,/await requireAdmin\(\)/);
 assert.doesNotMatch(send,/FISCAL_ANALYSIS_VARIABLE_CHECKOUT_ENABLED|reserve_fiscal_analysis_quote_order|blingRequest/);
 assert.match(send,/email_delivery_state:"accepted"/);
 assert.match(send,/fiscalProposalExpiresAt/);
});
