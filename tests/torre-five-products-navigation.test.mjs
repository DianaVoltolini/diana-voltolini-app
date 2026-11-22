import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const nav=read("app/torre/sidebar.tsx");
const analysis=read("app/torre/analises-fiscais/page.tsx");
const ebooks=read("app/torre/ebooks/page.tsx");
const encounter=read("app/torre/encontro-online/page.tsx");
const layout=read("app/torre/layout.tsx");

test("cinco produtos têm navegação exclusiva usando o sidebar existente",()=>{
 for(const url of ["/torre/diagnosticos","/torre/analises-fiscais","/torre/ebooks","/torre/encontro-online","/torre/assinaturas"])
  assert.match(nav,new RegExp(url.replaceAll("/","\\/")));
 assert.match(nav,/Análise Fiscal Individual/);
 assert.match(nav,/Encontro Online/);
 assert.match(layout,/TorreSidebar/);
 assert.match(nav,/sidebar\.module\.css/);
});
test("e-books aproveitam a página existente",()=>{
 assert.match(ebooks,/EbooksAdminPage/);
 assert.match(ebooks,/EBOOK-IBSCBS-001/);
 assert.match(ebooks,/painel\.module\.css/);
});
test("análise individual exibe dados existentes sem habilitar cobrança",()=>{
 assert.match(analysis,/fiscal_analysis_requests/);
 assert.match(analysis,/fiscal_analysis_quotes/);
 assert.match(analysis,/dash\.summaryGrid/);
 assert.match(analysis,/Propostas enviadas/);
 assert.match(analysis,/Validade/);
 assert.match(analysis,/\/torre\/analises-fiscais\/\$\{r\.id\}/);
});
test("encontro consulta produto e pedidos reais e aproveita área comercial",()=>{
 assert.match(encounter,/ENC-RT-2027-001/);
 assert.match(encounter,/\.eq\("product_id",product\.id\)/);
 assert.match(encounter,/paidAmount/);
 assert.match(encounter,/\/torre\/comercio-v2\/produtos/);
 assert.match(encounter,/\/torre\/comercio-v2\/ofertas/);
 assert.match(encounter,/\/torre\/comercio-v2\/paginas/);
 assert.match(encounter,/painel\.module\.css/);
});
