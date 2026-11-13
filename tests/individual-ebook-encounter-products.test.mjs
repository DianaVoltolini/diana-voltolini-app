// tests/individual-ebook-encounter-products.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const ebook=read("app/painel/ebooks/page.tsx");
const meeting=read("app/painel/encontro-online/page.tsx");
const action=read("app/painel/encontro-online/actions.ts");
const download=read("app/api/ebooks/ibs-cbs-na-pratica/download/route.ts");
const access=read("lib/ebooks/purchase-access.ts");
const sidebar=read("app/painel/layout.tsx");
const migration=read("supabase/migrations/20261112_encounter_attendance_awareness_reminders.sql");
const materialsSql=read("supabase/migrations/20261112_encounter_materials.sql");
const materialsApi=read("app/api/encounters/materials/[id]/download/route.ts");

test("e-books: cards por compra independente, sem conteúdo do encontro",()=>{
 assert.match(ebook,/\.like\("code","EBOOK-%"\)/);
 assert.match(ebook,/ownedBooks\.map/);
 assert.doesNotMatch(ebook,/Inscrição confirmada|Consultar encontro/);
 assert.match(access,/hasDirectEbookOrder/);
 assert.match(access,/directEbookExpiresAt/);
 assert.match(sidebar,/p\.code\.startsWith\("EBOOK-"\)/);
});
test("encontro: card independente com materiais e download direto",()=>{
 assert.match(meeting,/purchases\.map\(order/);
 assert.match(meeting,/MATERIAIS DESTE ENCONTRO/);
 assert.match(meeting,/origem=encontro/);
 assert.doesNotMatch(meeting,/href="\/painel\/ebooks"/);
 assert.match(meeting,/termsAcknowledged/);
 assert.match(meeting,/reminderOptIn/);
 assert.match(sidebar,/p\.code\.startsWith\("ENC-"\)/);
});
test("ciência registrada por pedido pago; lembrete autorizado separadamente",()=>{
 assert.match(action,/\.eq\("user_id",userId\)\.eq\("status","paid"\)/);
 assert.match(action,/terms_acknowledged_at/);
 assert.match(action,/reminder_opt_in/);
 assert.match(action,/!acknowledged/);
 assert.doesNotMatch(action,/not_attending/);
 assert.match(migration,/reminder_opt_in boolean NOT NULL DEFAULT false/);
 assert.match(migration,/terms_acknowledged_at timestamptz/);
});
test("download respeita a origem de compra e os prazos independentes",()=>{
 assert.match(download,/get\("origem"\) === "encontro"/);
 assert.match(download,/ebookAccessUntil\(encounterOrders/);
 assert.match(download,/access\.hasDirectEbookOrder/);
 assert.match(download,/access\.directEbookActive/);
});

test("materiais privados publicados são baixados apenas pelo respectivo comprador dentro dos 90 dias",()=>{
 assert.match(materialsSql,/CREATE TABLE IF NOT EXISTS public\.encounter_materials/);
 assert.match(materialsSql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(meeting,/publishedMaterials\.map\(material/);
 assert.match(meeting,/\/api\/encounters\/materials\//);
 assert.match(materialsApi,/\.eq\("user_id",verified\.user\.id\)/);
 assert.match(materialsApi,/\.eq\("product_id",order\.product_id\)/);
 assert.match(materialsApi,/ebookAccessActive\(until\)/);
 assert.match(materialsApi,/createSignedUrl\(material\.storage_path,60/);
});

const reminder=read("lib/encounters/reminder-worker.ts");
const reminderRoute=read("app/api/encounters/reminders/run/route.ts");
const reminderWorkflow=read(".github/workflows/encounter-online-reminder.yml");
const reminderSql=read("supabase/migrations/20261112_encounter_reminder_dispatches.sql");
test("lembrete autorizado somente para confirmação paga, com chave única e data correta",()=>{
 assert.match(reminder,/reminder_opt_in",true/);
 assert.match(reminder,/terms_acknowledged_at/);
 assert.match(reminder,/\.eq\("status","paid"\)/);
 assert.match(reminder,/SEND_DATE="2027-01-20"/);
 assert.match(reminder,/America\/Sao_Paulo/);
 assert.match(reminder,/ignoreDuplicates:true/);
 assert.match(reminderSql,/PRIMARY KEY\(order_id,reminder_key\)/);
 assert.match(reminderWorkflow,/cron: "0 11 20 1 \*"/);
 assert.match(reminderWorkflow,/secrets.MARKETING_CRON_SECRET/);
 assert.match(reminderRoute,/timingSafeEqual/);
});
