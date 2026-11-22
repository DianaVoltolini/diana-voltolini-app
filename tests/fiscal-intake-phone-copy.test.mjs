import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const page=read("app/solicitar-analise-fiscal/page.tsx");
const input=read("app/solicitar-analise-fiscal/FiscalWhatsappInput.tsx");
const mask=read("app/solicitar-analise-fiscal/whatsapp-format.ts");
const action=read("app/solicitar-analise-fiscal/actions.ts");

test("WhatsApp brasileiro é formatado enquanto cliente digita",()=>{
 assert.match(input,/"use client"/);
 assert.match(input,/formatFiscalWhatsapp\(event\.target\.value\)/);
 assert.match(input,/name="customer_phone"/);
 assert.match(input,/maxLength=\{16\}/);
 assert.match(input,/placeholder="\(47\) 9 9285-1601"/);
 assert.ok(input.includes(String.raw`pattern="\\([0-9]{2}\\) 9 [0-9]{4}-[0-9]{4}"`));
 assert.match(page,/<FiscalWhatsappInput\/>/);
});
test("servidor valida DDD + celular com nono dígito e padroniza para salvar",()=>{
 assert.match(mask,/export function normalizeFiscalWhatsapp/);
 assert.match(mask,/\^\[1-9\]\[0-9\]9\[0-9\]\{8\}\$/);
 assert.match(action,/normalizeFiscalWhatsapp\(value\(form,"customer_phone",30\)\)/);
 assert.match(action,/phone===null/);
 assert.match(action,/customer_phone:phone/);
});
test("copy explica solicitação, avaliação, Proposta e ausência de cobrança",()=>{
 assert.match(page,/Sua solicitação foi enviada com sucesso!/);
 assert.match(page,/Seu protocolo:/);
 assert.match(page,/Próximo passo:/);
 assert.match(page,/escopo, valor e prazo/);
 assert.match(page,/Enviar minha solicitação/);
 assert.match(page,/não obriga você a contratar/);
 assert.match(page,/Nenhum pagamento foi realizado/);
});
