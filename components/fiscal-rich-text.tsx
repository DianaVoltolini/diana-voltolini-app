import type {ReactNode} from "react";
import styles from "./fiscal-rich-text.module.css";

/** Safe plain-text/Markdown reader. Never injects HTML or changes fiscal calculations. */
const heading=(s:string)=>s.replace(/^#{1,3}\s+/,"").trim();
function inline(text:string):ReactNode[]{
 const pieces=text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\`[^\`\n]+\`)/g);
 return pieces.map((part,i)=>part.startsWith("**")&&part.endsWith("**")?<strong key={i}>{part.slice(2,-2)}</strong>:part.startsWith("*")&&part.endsWith("*")?<em key={i}>{part.slice(1,-1)}</em>:part.startsWith("`")&&part.endsWith("`")?<code key={i}>{part.slice(1,-1)}</code>:part);
}
function isBullet(s:string){return /^\s*[-*•]\s+/.test(s)}
function isNumber(s:string){return /^\s*\d+[.)]\s+/.test(s)}
function isChecklist(s:string){return /^\s*(?:(?:[-*•]\s*)?\[[ xX]\]|[☐☑✅✔✓])\s*/.test(s)}
function cleanChecklist(s:string){return s.trim().replace(/^(?:(?:[-*•]\s*)?\[[ xX]\]|[☐☑✅✔✓])\s*/,"")}
function isChecked(s:string){return /^\s*(?:(?:[-*•]\s*)?\[[xX]\]|[☑✅✔✓])/.test(s)}
function cells(line:string){return line.trim().replace(/^\|/,"").replace(/\|$/,"").split("|").map(c=>c.trim())}
function tableSeparator(line:string){return /^\s*\|?\s*:?-{3,}:?(\s*\|\s*:?-{3,}:?)*\s*\|?\s*$/.test(line)}

// Recognizes pasted two-column examples separated by tabs or 2+ spaces.
// Existing Markdown tables are handled by the original parser below.
function pastedCells(line:string){
 const parts=line.trim().split(/\t+| {2,}/).map(x=>x.trim()).filter(Boolean);
 return parts.length===2?parts:null;
}
function isExampleTableHeader(line:string){
 const parts=pastedCells(line);
 return !!parts&&/^(informa[cç][aã]o|campo|item)$/i.test(parts[0])&&/^(exemplo|valor|descri[cç][aã]o)$/i.test(parts[1]);
}
// Short standalone questions are section headings in pasted fiscal lessons.
// Only use explicit question forms to avoid promoting ordinary sentences.
function isPlainSectionHeading(value:string){
 if(value.length>115||!value.endsWith("?")||value.includes("  ")||value.includes("\t"))return false;
 return /^(?:O que|Qual(?: é| a| o| são|quer)?|Quais|Como|Por que|Quando|Quem|E quanto|Para que|Em que|Há|Existe|Quais são)\b/i.test(value);
}

type EditorialKind="atencao"|"exemplo"|"checklist"|"conclusao";
const editorialLabels:Record<EditorialKind,string>={
 atencao:"PONTO DE ATENÇÃO",exemplo:"EXEMPLO PRÁTICO",checklist:"CHECKLIST DE CONFERÊNCIA",conclusao:"CONCLUSÃO"
};
function isEditorialKind(value:string):value is EditorialKind{
 return value==="atencao"||value==="exemplo"||value==="checklist"||value==="conclusao";
}
export default function FiscalRichText({body}:{body:string}){
 const lines=body.replace(/\r\n?/g,"\n").split("\n");
 const elements:ReactNode[]=[];let i=0;
 while(i<lines.length){
  const value=lines[i].trim();if(!value){i++;continue}
  const key=i;
  const blockStart=value.match(/^:::([a-z]+)$/);
  if(blockStart&&isEditorialKind(blockStart[1])){
   const blockKind=blockStart[1];
   let end=i+1;
   while(end<lines.length&&lines[end].trim()!==":::")end++;
   if(end<lines.length){
    let innerLines=lines.slice(i+1,end);\n    if(blockKind==="conclusao"){\n     const first=innerLines.findIndex(line=>line.trim().length>0);\n     if(first>=0&&/^(?:#{1,3}\\s*)?Conclus[aã]o\\s*:?[\\s]*$/i.test(innerLines[first].trim()))innerLines=innerLines.filter((_,idx)=>idx!==first);\n    }\n    const content=innerLines.join("\n").trim();

    elements.push(<section key={key} aria-label={editorialLabels[blockKind]} className={`${styles.block} ${styles[blockKind]}`}>
     <p className={styles.blockLabel}>{editorialLabels[blockKind]}</p>
     {content&&<FiscalRichText body={content}/>}
    </section>);
    i=end+1;continue;
   }
  }
  if(isExampleTableHeader(lines[i])){
   const heads=pastedCells(lines[i])!;
   i++;
   const rows:string[][]=[];
   while(i<lines.length&&pastedCells(lines[i])&&rows.length<35){rows.push(pastedCells(lines[i])!);i++}
   elements.push(<div key={key} className={styles.tableWrap}><table className={styles.table}><thead><tr>{heads.map((h,j)=><th key={j} scope="col" >{inline(h)}</th>)}</tr></thead><tbody>{rows.map((row,j)=><tr key={j}>{row.map((v,k)=><td key={k} >{inline(v)}</td>)}</tr>)}</tbody></table></div>);
   continue;
  }
  if(value.startsWith("|")&&i+1<lines.length&&tableSeparator(lines[i+1])){
   const heads=cells(lines[i]);i+=2;const rows:string[][]=[];
   while(i<lines.length&&lines[i].trim().startsWith("|")){rows.push(cells(lines[i]));i++}
   elements.push(<div key={key} className={styles.tableWrap}><table className={styles.table}><thead><tr>{heads.map((c,j)=><th key={j} scope="col" >{inline(c)}</th>)}</tr></thead><tbody>{rows.map((row,j)=><tr key={j}>{heads.map((_,k)=><td key={k} >{inline(row[k]??"")}</td>)}</tr>)}</tbody></table></div>);continue
  }
  const h=value.match(/^(#{1,3})\s+(.+)$/);
  if(h){const H=h[1].length===1?"h2":h[1].length===2?"h3":"h4";const title=heading(value);const numbered=title.match(/^(\d{1,2})[.)]\s+(.+)$/);elements.push(<H key={key} className={numbered?styles.numberedHeading:styles.heading}>{numbered?<><span className={styles.sectionNumber}>{numbered[1].padStart(2,"0")}</span><span>{inline(numbered[2])}</span></>:inline(title)}</H>);i++;continue}
  if(isPlainSectionHeading(value)){
   elements.push(<h3 key={key} className={styles.heading}>{inline(value)}</h3>);
   i++;continue;
  }
  if(/^(Resumo|Em resumo|Atenção|Importante|Aplicação prática|Na prática|Checklist|O que mudou|O que fazer agora|Conclusão|Exemplo prático|Fontes):?$/i.test(value)){
   elements.push(<h3 key={key} className={styles.heading}>{value.replace(/:$/,"")}</h3>);i++;continue
  }
  if(/^(ATENÇÃO|IMPORTANTE|NA PRÁTICA|RESUMO|DICA):\s*.+/i.test(value)){
   elements.push(<aside key={key} className={`${styles.block} ${styles.atencao}`}>{inline(value)}</aside>);i++;continue
  }
  if(isChecklist(value)){
   const items:{text:string;checked:boolean}[]=[];
   while(i<lines.length&&isChecklist(lines[i])){items.push({text:cleanChecklist(lines[i]),checked:isChecked(lines[i])});i++}
   elements.push(<ul key={key} aria-label="Checklist" className={styles.checkList}>{items.map((item,j)=><li key={j} className={styles.checkItem}><span aria-hidden="true" className={styles.checkMark}>{item.checked?"☑":"☐"}</span><span>{inline(item.text)}</span></li>)}</ul>);continue
  }
  if(isBullet(value)||isNumber(value)){
   const ordered=isNumber(value),items:string[]=[];
   while(i<lines.length&&!isChecklist(lines[i])&&(ordered?isNumber(lines[i]):isBullet(lines[i]))){items.push(lines[i].trim().replace(ordered?/^\d+[.)]\s+/:/^[-*•]\s+/,""));i++}
   const li=items.map((it,j)=><li key={j} >{inline(it)}</li>);
   elements.push(ordered?<ol key={key} className={`${styles.list} ${styles.orderedList}`}>{li}</ol>:<ul key={key} className={`${styles.list} ${styles.bulletList}`}>{li}</ul>);continue
  }
  i++;
  elements.push(<p key={key} className={styles.paragraph}>{inline(value)}</p>);
 }
 return <div className={styles.reader}>{elements}</div>;
}
