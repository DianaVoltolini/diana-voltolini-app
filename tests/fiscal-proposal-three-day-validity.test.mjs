import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(file)=>readFileSync(new URL("../"+file,import.meta.url),"utf8");

test("prazo da Proposta é 72 horas corridas a partir da emissão",()=>{
 const source=read("lib/fiscal/proposal-validity.ts");
 assert.match(source,/FISCAL_PROPOSAL_VALIDITY_HOURS=72/);
 assert.match(source,/issuedAt\.getTime\(\)\+FISCAL_PROPOSAL_VALIDITY_HOURS\*60\*60\*1000/);
 assert.match(source,/America\/Sao_Paulo/);
});
test("rascunho não exige validade manual nem inicia prazo comercial",()=>{
 const ui=read("app/torre/analises-fiscais/[id]/page.tsx");
 const draft=read("app/torre/analises-fiscais/actions.ts");
 assert.match(ui,/3 dias corridos \(72 horas\) a partir do envio/);
 assert.doesNotMatch(ui,/name="valid_until"/);
 assert.doesNotMatch(draft,/read\(form,"valid_until"/);
 assert.match(draft,/fiscalProposalExpiresAt\(new Date\(\)\)/);
});
test("envio efetiva prazo e token juntos somente após sucesso SMTP",()=>{
 const action=read("app/torre/analises-fiscais/send-quote-action.ts");
 assert.match(action,/const sentAt=new Date\(\)\.toISOString\(\)/);
 assert.match(action,/const expiresAt=fiscalProposalExpiresAt\(new Date\(sentAt\)\)/);
 assert.match(action,/valid_until:expiresAt,token_expires_at:expiresAt/);
 assert.match(action,/email_delivery_state:"failed"/);
 assert.doesNotMatch(action,/FISCAL_ANALYSIS_VARIABLE_CHECKOUT_ENABLED/);
 assert.match(action,/Proposta de Análise Fiscal Individual/);
});
test("cliente visualiza data e hora exatas no horário de Brasília",()=>{
 const page=read("app/proposta/analise-fiscal/[token]/page.tsx");
 assert.match(page,/Sua Proposta de Análise Fiscal Individual/);
 assert.match(page,/fiscalProposalExpiresLabel\(q\.valid_until\)/);
 assert.match(page,/horário de Brasília/);
 assert.doesNotMatch(page,/Orçamento|orçamento/);
});
