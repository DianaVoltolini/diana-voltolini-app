import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("cliente só acessa solicitações pagas vinculadas a sua identidade",()=>{
 const auth=read("lib/fiscal/analysis-service.ts");
 assert.match(auth,/auth\.getClaims\(\)/);
 assert.match(auth,/\.eq\("user_id",uid\)\.not\("paid_at","is",null\)/);
});
test("ações rejeitam mensagens e arquivos sem pagamento e sem situação válida",()=>{
 const actions=read("app/torre/analises-fiscais/service-actions.ts");
 assert.match(actions,/FISCAL_ACTIVE_STATUSES\.includes/);
 assert.match(actions,/!request\.paid_at/);
 assert.match(actions,/sender_role:role/);
 assert.match(actions,/request_id:id,storage_path:path/);
 assert.match(actions,/transitions:Record<string,string\[]>/);
 assert.match(actions,/\.eq\("status",request\.status\)/);
});
test("arquivos privados exigem autenticação antes da leitura",()=>{
 const route=read("app/api/fiscal-analysis/files/[id]/route.ts");
 assert.match(route,/requireAdmin\(\)/);
 assert.match(route,/attachment\.visible_to_client/);
 assert.match(route,/getFiscalClientRequest\(attachment\.request_id\)/);
 assert.match(route,/Cache-Control":"private, no-store/);
 assert.match(route,/Content-Disposition/);
 const sql=read("supabase/migrations/20261122_fiscal_analysis_private_files_bucket.sql");
 assert.match(sql,/false,15728640/);
 assert.doesNotMatch(sql,/create policy/i);
});
test("interfaces existentes exibem atendimento em ambos os lados",()=>{
 const admin=read("app/torre/analises-fiscais/[id]/page.tsx");
 const customer=read("app/painel/analises-fiscais/[id]/page.tsx");
 const list=read("app/painel/analises-fiscais/page.tsx");
 assert.match(admin,/sendFiscalAdminMessage/);
 assert.match(admin,/uploadFiscalAdminFile/);
 assert.match(admin,/updateFiscalServiceStatus/);
 assert.match(customer,/sendFiscalClientMessage/);
 assert.match(customer,/uploadFiscalClientFile/);
 assert.match(list,/Abrir atendimento/);
});
