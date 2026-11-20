// app/torre/gerador-ebooks/studio.tsx
"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import styles from "./studio.module.css";
import { generateEbookPdf } from "./pdf-engine";

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[]; ordered: boolean }
  | { kind: "table"; rows: string[][] }
  | { kind: "note"; text: string }
  | { kind: "checklist"; items: { checked: boolean; text: string }[] }
  | { kind: "rule" }
  | { kind: "pagebreak" }
  | { kind: "cards"; items: { label: string; value: string; detail: string }[] }
  | { kind: "panel"; tone: "navy" | "blue" | "gold"; label: string; text: string }
  | { kind: "steps"; items: { label: string; title: string; detail: string }[] };

function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index++; continue; }
    if (/^<!--\s*page\s*-->$/i.test(line)) { blocks.push({kind:"pagebreak"}); index++; continue; }
    const directive = /^:::(cards|steps|navy|blue|gold)\s*$/i.exec(line);
    if (directive) {
      const type = directive[1].toLowerCase();
      index++;
      const items: string[] = [];
      while (index < lines.length && lines[index].trim() !== ":::") {
        if (lines[index].trim()) items.push(lines[index].trim());
        index++;
      }
      if (index < lines.length) index++;
      if (type === "cards") {
        const cards = items.map(s => {
          const [label="",value="",detail=""] = s.replace(/^[-*]\s*/,"").split("|").map(v=>v.trim());
          return {label,value,detail};
        }).filter(item => item.label && item.value);
        if (cards.length) blocks.push({kind:"cards",items:cards});
      } else if (type === "steps") {
        const steps = items.map(s => {
          const [label="",title="",detail=""] = s.replace(/^[-*]\s*/,"").split("|").map(v=>v.trim());
          return {label,title,detail};
        }).filter(item=>item.title);
        if (steps.length) blocks.push({kind:"steps",items:steps});
      } else if (items.length) {
        const [label,...rest] = items;
        blocks.push({kind:"panel",tone:type as "navy"|"blue"|"gold",label,text:rest.join(" ")});
      }
      continue;
    }
    if (/^---+$/.test(line)) { blocks.push({kind:"rule"}); index++; continue; }
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) { blocks.push({kind:"heading",level:h[1].length,text:h[2]}); index++; continue; }
    if (line.startsWith("> ")) {
      const parts: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("> ")) {
        parts.push(lines[index].trim().slice(2)); index++;
      }
      blocks.push({kind:"note",text:parts.join(" ")}); continue;
    }
    if (line.includes("|") && index + 1 < lines.length && /^\|?[\s:|-]+\|?$/.test(lines[index + 1].trim()) && lines[index + 1].includes("-")) {
      const row = (s: string) => s.replace(/^\||\|$/g,"").split("|").map(x=>x.trim());
      const rows = [row(lines[index])];
      index += 2;
      while (index < lines.length && lines[index].trim().includes("|") && lines[index].trim()) {
        rows.push(row(lines[index])); index++;
      }
      blocks.push({kind:"table",rows}); continue;
    }
    if (/^[-*]\s+\[[ xX]\]\s+/.test(line)) {
      const items: { checked: boolean; text: string }[] = [];
      while (index < lines.length && /^[-*]\s+\[[ xX]\]\s+/.test(lines[index].trim())) {
        const match = /^[-*]\s+\[([ xX])\]\s+(.+)$/.exec(lines[index].trim());
        if (match) items.push({checked:match[1].toLowerCase()==="x", text:match[2]});
        index++;
      }
      blocks.push({kind:"checklist",items}); continue;
    }
    const listMatch = /^(?:[-*]\s+|\d+\.\s+)/.exec(line);
    if (listMatch) {
      const ordered = /^\d+\./.test(line);
      const items: string[] = [];
      while (index < lines.length && /^(?:[-*]\s+|\d+\.\s+)/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^(?:[-*]\s+|\d+\.\s+)/,"")); index++;
      }
      blocks.push({kind:"list",ordered,items}); continue;
    }
    const para: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^(?:#{1,3}\s|>\s|[-*]\s|\d+\.\s|---+$|:::|<!--\s*page)/.test(lines[index].trim())) {
      // Detect a table start without consuming it as a paragraph.
      if (para.length > 0 && lines[index].includes("|") && index + 1 < lines.length && /^\|?[\s:|-]+\|?$/.test(lines[index + 1].trim())) break;
      para.push(lines[index].trim()); index++;
    }
    if (para.length) blocks.push({kind:"paragraph",text:para.join(" ")});
    else index++;
  }
  return blocks;
}

function inline(text: string): ReactNode[] {
  // Text is rendered by React, never interpreted as raw HTML.
  const tokens = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)]+\))/g);
  return tokens.map((token, i) => {
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={i}>{token.slice(2,-2)}</strong>;
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.exec(token);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
    return token;
  });
}

function RenderBlock({ block, lead = false }: { block: Block; lead?: boolean }) {
  if (block.kind === "heading") {
    if (block.level === 1) {
      const numbered = /^(\d+)[.)]\s*(.+)$/.exec(block.text);
      return <div className={styles.chapterWrap}>
        
        <h2 className={styles.chapter}>{numbered ? <><span className={styles.chapterNumber}>{numbered[1].padStart(2,"0")}</span>{inline(numbered[2])}</> : inline(block.text)}</h2>
      </div>;
    }
    if (block.level === 2) return <h3 className={styles.section}>{inline(block.text)}</h3>;
    return <h4 className={styles.subsection}>{inline(block.text)}</h4>;
  }
  if (block.kind === "paragraph") return <p className={lead ? styles.lead : undefined}>{inline(block.text)}</p>;
  if (block.kind === "pagebreak") return null;
  if (block.kind === "cards") return <div className={styles.editorialCards}>{block.items.map((item,i)=><div className={styles.editorialCard} key={i}><span>{inline(item.label)}</span><strong>{inline(item.value)}</strong>{item.detail && <small>{inline(item.detail)}</small>}</div>)}</div>;
  if (block.kind === "steps") return <div className={styles.editorialSteps}>{block.items.map((item,i)=><div className={styles.editorialStep} key={i}><span className={styles.stepNumber}>{item.label || String(i+1).padStart(2,"0")}</span><div><strong>{inline(item.title)}</strong><p>{inline(item.detail)}</p></div></div>)}</div>;
  if (block.kind === "panel") return <aside className={block.tone==="navy"?styles.panelNavy:block.tone==="gold"?styles.panelGold:styles.panelBlue}><span>{inline(block.label)}</span><p>{inline(block.text)}</p></aside>;
  if (block.kind === "note") {
    const important = /^(atenção|importante|cuidado|alerta|nota|regra)/i.test(block.text);
    return <aside className={important ? styles.note : styles.noteBlue}>{inline(block.text)}</aside>;
  }
  if (block.kind === "rule") return <hr className={styles.rule}/>;
  if (block.kind === "checklist") return <ul className={styles.checklist}>{block.items.map((item,i)=><li key={i}><span className={item.checked ? styles.checked : styles.checkIcon} aria-hidden="true">{item.checked?"✓":""}</span><span>{inline(item.text)}</span></li>)}</ul>;
  if (block.kind === "list") {
    const items = block.items.map((item,i)=><li key={i}>{inline(item)}</li>);
    return block.ordered ? <ol className={styles.orderedList}>{items}</ol> : <ul className={styles.bulletList}>{items}</ul>;
  }
  return <div className={styles.tableScroll}><table><thead><tr>{block.rows[0]?.map((x,i)=><th key={i}>{inline(x)}</th>)}</tr></thead><tbody>{block.rows.slice(1).map((r,i)=><tr key={i}>{r.map((x,j)=><td key={j}>{inline(x)}</td>)}</tr>)}</tbody></table></div>;
}

const sample = `# 01. Seu negócio pode vender bem e ainda faltar dinheiro

Uma das situações mais comuns entre pequenos empreendedores é trabalhar o mês inteiro e, no final, não saber quanto realmente ganhou.

Isso acontece quando o dinheiro das vendas se mistura às despesas da casa e aos pagamentos da empresa.

:::navy
A IDEIA PRINCIPAL
Vender não é lucrar. O dinheiro que entra não é, necessariamente, dinheiro disponível.
:::

### O QUE VOCÊ VAI CONSEGUIR FAZER

:::cards
- 01 | Separar o dinheiro | Diferenciar recursos pessoais e os da atividade.
- 02 | Entender os números | Reconhecer faturamento, custos, despesas e lucro.
- 03 | Organizar a rotina | Registrar entradas e saídas sem complicação.
- 04 | Planejar sua retirada | Decidir com base no resultado e nas obrigações.
:::

<!-- page -->

# 02. Cinco palavras que você precisa conhecer

Antes de decidir quanto retirar, é importante reconhecer a diferença entre o dinheiro que entrou e o resultado que a atividade realmente produziu.

| Conceito | O que significa na prática |
| --- | --- |
| **Faturamento** | Valor das vendas e serviços realizados; não é sinônimo de dinheiro disponível. |
| **Recebimento** | Dinheiro que efetivamente entrou na conta ou no caixa. |
| **Custo** | Gasto diretamente ligado ao produto ou ao serviço vendido. |
| **Despesa** | Gasto para manter o negócio funcionando. |
| **Lucro** | Resultado que resta depois de considerar custos e despesas pertinentes. |

:::gold
EXEMPLO: UMA MANICURE ATENDE UMA CLIENTE
Ela cobra R$ 100 pelo serviço e usa R$ 18 em materiais. A venda foi de R$ 100, mas isso não significa que ganhou R$ 100. Ainda existem outras despesas, como aluguel, energia, taxas de cartão e DAS.
:::

<!-- page -->

# 03. O dinheiro da empresa não é o dinheiro da casa

O MEI é uma pessoa física que exerce uma atividade empresarial, mas a organização do dinheiro do negócio precisa ser tratada de maneira separada.

Uma conta específica para a atividade facilita acompanhar receitas, custos, despesas e retiradas. Não é necessário criar uma administração complicada.

### QUATRO REGRAS QUE AJUDAM IMEDIATAMENTE

:::steps
- 01 | Receba as vendas em um lugar identificado | Conta dedicada, carteira digital ou controle de caixa.
- 02 | Pague as despesas do negócio com esse dinheiro | Mercadorias, materiais, internet e outras contas da atividade.
- 03 | Transfira sua retirada com registro | Anote data, valor e destino; evite pagamentos pessoais espalhados.
- 04 | Concilie semanalmente | Compare o que registrou com extratos, recebimentos e comprovantes.
:::

:::gold
CONTA BANCÁRIA
Manter uma conta separada é uma recomendação de organização, não uma exigência geral de abertura de conta PJ para todo MEI.
:::`;

export default function EbookStudio() {
  const [title,setTitle] = useState("O dinheiro do MEI");
  const [subtitle,setSubtitle] = useState("Como organizar o negócio, descobrir quanto realmente sobra e planejar sua retirada mensal.");
  const [label,setLabel] = useState("GUIA PRÁTICO · CONHECIMENTO FISCAL");
  const [edition,setEdition] = useState("Edição novembro de 2026");
  const [topics,setTopics] = useState("Faturamento e lucro • Controle de caixa • Retirada mensal • DAS e IRPF • Reserva financeira • Exercícios práticos");
  const [markdown,setMarkdown] = useState(sample);
  const [generating,setGenerating] = useState(false);
  const [pdfError,setPdfError] = useState("");
  const [includeClosing,setIncludeClosing] = useState(false);
  const [cta,setCta] = useState("Conheça o Blog Fiscal");
  const [ctaUrl,setCtaUrl] = useState("https://dianavoltolini.com.br/blog");
  const blocks = parseMarkdown(markdown);
  const pages: Block[][] = [[]];
  for (const block of blocks) {
    if (block.kind === "pagebreak") {
      if (pages[pages.length - 1].length) pages.push([]);
    } else pages[pages.length - 1].push(block);
  }
  if (!pages[pages.length - 1].length && pages.length > 1) pages.pop();
  const canPrint = title.trim() !== "" && markdown.trim() !== "";
  async function printPdf() {
    if (!canPrint || generating) return;
    setGenerating(true); setPdfError("");
    try {
      const bytes = await generateEbookPdf({title,subtitle,label,edition,topics,markdown,cta,ctaUrl});
      const blob = new Blob([new Uint8Array(bytes)], {type:"application/pdf"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href=url;
      a.download=(title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-|-$/g,"") || "ebook")+".pdf";
      document.body.appendChild(a);a.click();a.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    } catch (error) {
      setPdfError(error instanceof Error?error.message:"Não foi possível gerar o PDF.");
    } finally {
      setGenerating(false);
    }
  }

  return <main className={styles.root} id="dv-ebook-print">
    <header className={styles.toolbar}>
      <div><p className={styles.eyebrow}>MARKETING · FERRAMENTAS</p><h1>Gerador de E-books</h1><p>Modelo Diana Voltolini · PDF A4</p></div>
      <button type="button" disabled={!canPrint || generating} onClick={printPdf} className={styles.primary}>{generating?"Gerando PDF...":"Gerar PDF profissional"}</button>
    </header>
    {pdfError && <p role="alert" style={{color:"#b42318",margin:"0 0 16px"}}>Erro na geração: {pdfError}</p>}
    <div className={styles.workspace}>
      <section className={styles.editor} aria-label="Editor do e-book">
        <label htmlFor="ebook-title">Título</label>
        <input id="ebook-title" value={title} onChange={e=>setTitle(e.target.value)}/>
        <label htmlFor="ebook-subtitle">Subtítulo</label>
        <input id="ebook-subtitle" value={subtitle} onChange={e=>setSubtitle(e.target.value)}/>
        <label htmlFor="ebook-label">Categoria da capa</label>
        <input id="ebook-label" value={label} onChange={e=>setLabel(e.target.value)}/>
        <label htmlFor="ebook-edition">Edição</label>
        <input id="ebook-edition" value={edition} onChange={e=>setEdition(e.target.value)}/>
        <label htmlFor="ebook-topics">Assuntos em destaque na capa</label>
        <input id="ebook-topics" value={topics} onChange={e=>setTopics(e.target.value)}/>
        <label htmlFor="ebook-content">Conteúdo em Markdown</label>
        <textarea id="ebook-content" spellCheck value={markdown} onChange={e=>setMarkdown(e.target.value)} rows={19}/>
        <p className={styles.help}>Aceita Markdown normal e blocos editoriais: :::cards, :::steps, :::navy, :::blue, :::gold. Para iniciar outra página: &lt;!-- page --&gt;. Confira a prévia antes de exportar.</p>
        <label className={styles.closingToggle}><input type="checkbox" checked={includeClosing} onChange={e=>setIncludeClosing(e.target.checked)}/> Incluir página final com chamada</label>
        <label htmlFor="ebook-cta">Chamada final</label>
        <input id="ebook-cta" value={cta} onChange={e=>setCta(e.target.value)}/>
        <label htmlFor="ebook-url">Link da chamada</label>
        <input id="ebook-url" type="url" value={ctaUrl} onChange={e=>setCtaUrl(e.target.value)}/>
      </section>
      <section className={styles.previewArea} aria-label="Prévia do e-book">
        <p className={styles.previewLabel}>PRÉVIA EDITORIAL · O PDF final é composto automaticamente e inclui sumário</p>
        <div className={`${styles.printDocument} ${styles.approved}`}>
          <section className={styles.cover}>
            <Image src="/brand/logo-light.png" alt="Diana Voltolini" width={1535} height={538} className={styles.coverLogo} unoptimized/>
            <p className={styles.coverLabel}>{label}</p>
            <span className={styles.goldLine}/>
            <h2>{title || "Título"}</h2>
            <p className={styles.coverSubtitle}>{subtitle}</p>
            <div className={styles.coverTopics}><span>NESTA EDIÇÃO</span><p>{topics}</p></div>
            <p className={styles.edition}>{edition}</p>
            <p className={styles.coverFooter}>Conhecimento fiscal na prática · Diana Voltolini</p>
          </section>
          {pages.map((page,index)=><article className={styles.article} key={index}>
            <p className={styles.runningHead}>DIANA VOLTOLINI / CONHECIMENTO FISCAL NA PRÁTICA</p>
            <div className={styles.pageContent}>{page.map((block,i)=><RenderBlock block={block} lead={block.kind==="paragraph" && i===1 && page[0]?.kind==="heading"} key={i}/>)}</div>
          </article>)}
          {includeClosing && <section className={styles.endPage}>
            <p className={styles.runningHead}>DIANA VOLTOLINI / CONHECIMENTO FISCAL NA PRÁTICA</p>
            <div>
              <p className={styles.coverLabel}>PARA CONTINUAR APRENDENDO</p>
              <h2>{cta || "Conheça nossos conteúdos"}</h2>
              <span className={styles.goldLine}/>
              {/^https?:\/\//.test(ctaUrl) && <a href={ctaUrl} target="_blank" rel="noopener noreferrer">{ctaUrl}</a>}
            </div>
            <p className={styles.coverFooter}>DIANA VOLTOLINI • ESPECIALISTA EM FATURAMENTO E INTELIGÊNCIA FISCAL</p>
          </section>}
        </div>
      </section>
    </div>
  </main>;
}
