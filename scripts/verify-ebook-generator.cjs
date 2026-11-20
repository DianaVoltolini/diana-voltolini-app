// scripts/verify-ebook-generator.cjs
// Smoke test of the real PDF engine, not its HTML preview.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { PDFDocument } = require("pdf-lib");
const sourcePath = path.join(process.cwd(), "app/torre/gerador-ebooks/pdf-engine.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const compiledPath = path.join(path.dirname(sourcePath), "pdf-engine.test.cjs");
fs.writeFileSync(compiledPath, compiled);
global.fetch = async () => ({ ok: false });
(async () => {
  try {
    const { generateEbookPdf } = require(compiledPath);
    const rows = Array.from({length: 50},(_,i)=>("| Item "+(i+1)+" | R$ "+(100+i)+",00 |")).join("\n");
    const chapters = Array.from({length:18},(_,i)=>[
      "<!-- page -->",
      "*CAPÍTULO DE TESTE*",
      "# "+(i+1)+". Capítulo "+(i+1)+" de uma publicação longa",
      "Este texto tem acentuação, números fiscais e informação de exemplo. ".repeat(5),
      ...(i===2?["## Tabela extensiva","| Descrição | Valor |","| --- | --- |",rows]:[]),
      ...(i===13?["## Checklist","- [ ] Conferir receitas","- [x] Conferir despesas"]:[]),
      ...(i===16?["https://www.gov.br/receitafederal"]:[]),
      "> **ATENÇÃO:** O conteúdo do teste deve preservar a paginação."
    ].join("\n")).join("\n\n");
    const bytes = await generateEbookPdf({
      title:"O dinheiro do MEI",subtitle:"Teste integral de paginação",
      label:"GUIA PRÁTICO",edition:"Novembro de 2026",
      topics:"Caixa • Faturamento • Referências",
      markdown:chapters,cta:"Conheça o Blog Fiscal",
      ctaUrl:"https://dianavoltolini.com.br/blog"
    });
    const pdf=await PDFDocument.load(bytes);
    if(pdf.getPageCount()<10) throw Error("Paginação incompleta: "+pdf.getPageCount());
    if(bytes.length<15000) throw Error("PDF suspeitamente pequeno");
    const toc=pdf.getPage(1);
    const anns=toc.node.Annots();
    if(!anns || anns.size()<18) throw Error("Sumário sem links para os 18 capítulos");
    console.log("PDF OK:",pdf.getPageCount(),"páginas,",bytes.length,"bytes, sumário navegável");
  } finally { try{fs.unlinkSync(compiledPath);}catch{} }
})().catch(e=>{console.error(e);process.exitCode=1});
