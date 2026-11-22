import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const mail=read("lib/fiscal/analysis-notifications.ts");
const actions=read("app/torre/analises-fiscais/service-actions.ts");
const admin=read("app/torre/analises-fiscais/[id]/page.tsx");

test("notificações distinguem cliente e administração e não copiam informações fiscais",()=>{
 for(const kind of ["admin_message","client_message","client_file","admin_file",
  "status_awaiting_client","status_in_progress","status_completed"]){
  assert.match(mail,new RegExp(kind));
 }
 assert.match(mail,/recipient_role:config\.to/);
 assert.match(mail,/request_id:requestId,event_type:"service_notification_"/);
 assert.match(mail,/!row\?\.paid_at/);
 assert.doesNotMatch(mail,/\.select\([^\n]*question/);
 assert.doesNotMatch(mail,/\.select\([^\n]*body/);
 assert.match(mail,/Para proteger suas informações/);
});

test("avisos são enviados somente depois da persistência das operações",()=>{
 const messageInsert=actions.indexOf('db.from("fiscal_analysis_messages").insert(');
 const messageNotification=actions.indexOf('notifyFiscalAnalysisService(id,role==="admin"');
 assert.ok(messageInsert>=0&&messageNotification>messageInsert);
 const statusUpdate=actions.indexOf('db.from("fiscal_analysis_requests").update(');
 const statusNotification=actions.indexOf('notifyFiscalAnalysisService(id,target===');
 assert.ok(statusUpdate>=0&&statusNotification>statusUpdate);
 const attachmentInsert=actions.indexOf('db.from("fiscal_analysis_attachments").insert(');
 const attachmentNotification=actions.indexOf('notifyFiscalAnalysisService(id,role==="client"');
 assert.ok(attachmentInsert>=0&&attachmentNotification>attachmentInsert);
});

test("falha ou falta de SMTP não apaga o atendimento",()=>{
 assert.match(mail,/await log\("not_configured"\);return/);
 assert.match(mail,/await log\("failed"\)/);
 assert.match(mail,/finally\{transporter\.close\(\);\}/);
 assert.match(admin,/service_notification_failed/);
 assert.match(admin,/service_notification_not_configured/);
});

test("links dos avisos vão para áreas autenticadas, mantendo branding existente",()=>{
 assert.match(mail,/app\.dianavoltolini\.com\.br\/painel\/analises-fiscais\//);
 assert.match(mail,/app\.dianavoltolini\.com\.br\/torre\/analises-fiscais\//);
 assert.match(mail,/#c9a227/);
 assert.match(mail,/Georgia,serif/);
 assert.match(mail,/FISCAL_ANALYSIS_ADMIN_NOTIFY_EMAIL/);
});
