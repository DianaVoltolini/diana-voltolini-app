// tests/legacy-ebook-v2-consolidation.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const action=read("app/torre/produtos-entregas/import-to-v2.ts");
const page=read("app/torre/produtos-entregas/page.tsx");
const library=read("app/torre/comercio-v2/materiais/page.tsx");
const sidebar=read("app/torre/sidebar.tsx");
const sql=read("supabase/migrations/20261113_legacy_ebook_library_transfer.sql");
const download=read("app/api/ebooks/ibs-cbs-na-pratica/download/route.ts");

test("copy requires admin and keeps legacy file and customer access intact",()=>{
 assert.match(action,/await requireAdmin\(\)/);
 assert.match(action,/EBOOK-IBSCBS-001/);
 assert.match(action,/\.from\("product_deliveries"\)/);
 assert.match(action,/\.from\(delivery\.storage_bucket\)\.download\(delivery\.storage_path\)/);
 assert.match(action,/\.from\("commerce-v2-materials"\)/);
 assert.match(action,/available_to_student:false/);
 assert.match(action,/if\(already\)return dest\("jaimportado"\)/);
 assert.doesNotMatch(action,/publish_product_delivery|product_delivery_versions|student_delivery_active/);
 assert.match(download,/\.from\("product_deliveries"\)/);
});
test("import is recorded by original product/version and legacy publisher remains accessible",()=>{
 assert.match(sql,/legacy_product_id uuid PRIMARY KEY/);
 assert.match(sql,/legacy_version integer NOT NULL/);
 assert.match(page,/copyCurrentEbookToV2/);
 assert.match(page,/Publicação anterior de e-book/);
 assert.match(library,/href="\/torre\/produtos-entregas"/);
 assert.doesNotMatch(sidebar,/item\("\/torre\/produtos-entregas","Produtos e Entregas"\)/);
});
