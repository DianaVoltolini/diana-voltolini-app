// app/torre/gerador-ebooks/studio.tsx
"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import styles from "./studio.module.css";

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[]; ordered: boolean }
  | { kind: "table"; rows: string[][] }
  | { kind: "note"; text: string }
  | { kind: "rule" };

function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index++; continue; }
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
    while (index < lines.length && lines[index].trim() && !/^(?:#{1,3}\s|>\s|[-*]\s|\d+\.\s|---+$)/.test(lines[index].trim())) {
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

function RenderBlock({ block }: { block: Block }) {
  if (block.kind === "heading") {
    if (block.level === 1) return <h2 className={styles.chapter}>{inline(block.text)}</h2>;
    if (block.level === 2) return <h3 className={styles.section}>{inline(block.text)}</h3>;
    return <h4 className={styles.subsection}>{inline(block.text)}</h4>;
  }
  if (block.kind === "paragraph") return <p>{inline(block.text)}</p>;
  if (block.kind === "note") return <aside className={styles.note}>{inline(block.text)}</aside>;
  if (block.kind === "rule") return <hr className={styles.rule}/>;
  if (block.kind === "list") {
    const items = block.items.map((item,i)=><li key={i}>{inline(item)}</li>);
    return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
  }
  return <div className={styles.tableScroll}><table><thead><tr>{block.rows[0]?.map((x,i)=><th key={i}>{inline(x)}</th>)}</tr></thead><tbody>{block.rows.slice(1).map((r,i)=><tr key={i}>{r.map((x,j)=><td key={j}>{inline(x)}</td>)}</tr>)}</tbody></table></div>;
}

const sample = `# Antes de começar
Este é um exemplo de conteúdo. Substitua pelo seu texto em **Markdown**.

> Atenção: confira a legislação e as fontes oficiais antes de publicar.

## Um exemplo de tabela

| Indicador | Cenário A | Cenário B |
| --- | ---: | ---: |
| Receita | R$ 100.000 | R$ 100.000 |
| Despesas | R$ 20.000 | R$ 20.000 |

## Plano de ação

1. Confira as informações.
2. Revise os cálculos.
3. Gere o PDF.
`;

export default function EbookStudio() {
  const [title,setTitle] = useState("Título do e-book");
  const [subtitle,setSubtitle] = useState("Subtítulo do material");
  const [label,setLabel] = useState("GUIA PRÁTICO · CONHECIMENTO FISCAL");
  const [edition,setEdition] = useState("Edição novembro de 2026");
  const [markdown,setMarkdown] = useState(sample);
  const [cta,setCta] = useState("Conheça o Blog Fiscal");
  const [ctaUrl,setCtaUrl] = useState("https://dianavoltolini.com.br/blog");
  const blocks = parseMarkdown(markdown);
  const canPrint = title.trim() !== "" && markdown.trim() !== "";
  function printPdf() {
    if (!canPrint) return;
    window.print();
  }

  return <main className={styles.root} id="dv-ebook-print">
    <header className={styles.toolbar}>
      <div><p className={styles.eyebrow}>MARKETING · FERRAMENTAS</p><h1>Gerador de E-books</h1><p>Modelo Diana Voltolini · PDF A4</p></div>
      <button type="button" disabled={!canPrint} onClick={printPdf} className={styles.primary}>Gerar PDF</button>
    </header>
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
        <label htmlFor="ebook-content">Conteúdo em Markdown</label>
        <textarea id="ebook-content" spellCheck value={markdown} onChange={e=>setMarkdown(e.target.value)} rows={19}/>
        <p className={styles.help}>Aceita títulos (#, ##, ###), negrito, listas, tabelas, links e caixas de destaque (&gt;). Confira a prévia antes de exportar.</p>
        <label htmlFor="ebook-cta">Chamada final</label>
        <input id="ebook-cta" value={cta} onChange={e=>setCta(e.target.value)}/>
        <label htmlFor="ebook-url">Link da chamada</label>
        <input id="ebook-url" type="url" value={ctaUrl} onChange={e=>setCtaUrl(e.target.value)}/>
      </section>
      <section className={styles.previewArea} aria-label="Prévia do e-book">
        <p className={styles.previewLabel}>PRÉ-VISUALIZAÇÃO · O conteúdo é paginado na impressão</p>
        <div className={styles.printDocument}>
          <section className={styles.cover}>
            <Image src="/brand/logo-light.png" alt="Diana Voltolini" width={1535} height={538} className={styles.coverLogo} unoptimized/>
            <p className={styles.coverLabel}>{label}</p>
            <span className={styles.goldLine}/>
            <h2>{title || "Título"}</h2>
            <p className={styles.coverSubtitle}>{subtitle}</p>
            <p className={styles.edition}>{edition}</p>
            <p className={styles.coverFooter}>Conhecimento fiscal na prática · Diana Voltolini</p>
          </section>
          <article className={styles.article}>
            <p className={styles.runningHead}>DIANA VOLTOLINI / CONHECIMENTO FISCAL NA PRÁTICA</p>
            {blocks.map((block,i)=><RenderBlock block={block} key={i}/>)}
            <footer className={styles.articleFooter}>DIANA VOLTOLINI • FATURAMENTO FISCAL NA PRÁTICA</footer>
          </article>
          <section className={styles.endPage}>
            <p className={styles.runningHead}>DIANA VOLTOLINI / CONHECIMENTO FISCAL NA PRÁTICA</p>
            <div>
              <p className={styles.coverLabel}>PARA CONTINUAR APRENDENDO</p>
              <h2>{cta || "Conheça nossos conteúdos"}</h2>
              <span className={styles.goldLine}/>
              {/^https?:\/\//.test(ctaUrl) && <a href={ctaUrl} target="_blank" rel="noopener noreferrer">{ctaUrl}</a>}
            </div>
            <p className={styles.coverFooter}>DIANA VOLTOLINI • FATURAMENTO FISCAL NA PRÁTICA</p>
          </section>
        </div>
      </section>
    </div>
  </main>;
}
