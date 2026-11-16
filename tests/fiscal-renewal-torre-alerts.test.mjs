// tests/fiscal-renewal-torre-alerts.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync(new URL("../app/torre/assinaturas/page.tsx",import.meta.url),"utf8");
test("Torre expõe alertas de cobrança faltante e falhas após vencimento",()=>{
 assert.match(page,/timeZone:"America\/Sao_Paulo"/);
 assert.match(page,/if\(today<due\)continue/);
 assert.match(page,/Cobrança automática não registrada/);
 assert.match(page,/Cobrança não concluída no Bling/);
 assert.match(page,/Cobrança emitida e vinculada ao Bling/);
 assert.match(page,/cancellation_requested_at!==null/);
 assert.match(page,/Boleto automático não registrado/);
 assert.match(page,/PIX ainda não solicitado/);
 assert.match(page,/PIX aguardando solicitação/);
});
test("somente leitura e sem marcar cobranças como pagas",()=>{
 assert.doesNotMatch(page,/\.update\(|\.insert\(|\.rpc\(|\.delete\(/);
});
