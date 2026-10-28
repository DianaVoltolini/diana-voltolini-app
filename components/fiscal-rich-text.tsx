import type {ReactNode} from "react";

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
    const content=lines.slice(i+1,end).join("\n").trim();
    const background=blockKind==="conclusao"?"#f2f5f8":"#fbf8f1";
    elements.push(<section key={key} aria-label={editorialLabels[blockKind]} style={{margin:"25px 0",padding:"20px 23px",borderLeft:"4px solid #c9a227",background,borderRadius:9}}>
     <p style={{fontSize:12,color:"#9a7413",letterSpacing:1,fontWeight:800,margin:"0 0 12px"}}>{editorialLabels[blockKind]}</p>
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
   elements.push(<div key={key} style={{overflowX:"auto",margin:"22px 0"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}><thead><tr>{heads.map((h,j)=><th key={j} scope="col" style={{textAlign:"left",padding:12,background:"#f0f2f3",borderBottom:"2px solid #c9a227"}}>{inline(h)}</th>)}</tr></thead><tbody>{rows.map((row,j)=><tr key={j}>{row.map((v,k)=><td key={k} style={{padding:12,borderBottom:"1px solid #e2e7eb",verticalAlign:"top"}}>{inline(v)}</td>)}</tr>)}</tbody></table></div>);
   continue;
  }
  if(value.startsWith("|")&&i+1<lines.length&&tableSeparator(lines[i+1])){
   const heads=cells(lines[i]);i+=2;const rows:string[][]=[];
   while(i<lines.length&&lines[i].trim().startsWith("|")){rows.push(cells(lines[i]));i++}
   elements.push(<div key={key} style={{overflowX:"auto",margin:"22px 0"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}><thead><tr>{heads.map((c,j)=><th key={j} scope="col" style={{textAlign:"left",padding:12,background:"#f0f2f3",borderBottom:"2px solid #c9a227"}}>{inline(c)}</th>)}</tr></thead><tbody>{rows.map((row,j)=><tr key={j}>{heads.map((_,k)=><td key={k} style={{padding:12,borderBottom:"1px solid #e2e7eb",verticalAlign:"top"}}>{inline(row[k]??"")}</td>)}</tr>)}</tbody></table></div>);continue
  }
  const h=value.match(/^(#{1,3})\s+(.+)$/);
  if(h){const H=h[1].length===1?"h2":h[1].length===2?"h3":"h4";const sizes={h2:26,h3:21,h4:17};elements.push(<H key={key} style={{fontFamily:"Georgia,serif",fontSize:sizes[H],lineHeight:1.3,margin:"30px 0 12px",color:"#102033"}}>{inline(heading(value))}</H>);i++;continue}
  if(isPlainSectionHeading(value)){
   elements.push(<h3 key={key} style={{fontFamily:"Georgia,serif",fontSize:21,lineHeight:1.35,color:"#102033",margin:"27px 0 12px"}}>{inline(value)}</h3>);
   i++;continue;
  }
  if(/^(Resumo|Em resumo|Atenção|Importante|Aplicação prática|Na prática|Checklist|O que mudou|O que fazer agora|Conclusão|Exemplo prático|Fontes):?$/i.test(value)){
   elements.push(<h3 key={key} style={{fontFamily:"Georgia,serif",fontSize:21,color:"#102033",margin:"27px 0 10px"}}>{value.replace(/:$/,"")}</h3>);i++;continue
  }
  if(/^(ATENÇÃO|IMPORTANTE|NA PRÁTICA|RESUMO|DICA):\s*.+/i.test(value)){
   elements.push(<aside key={key} style={{background:"#f8f5eb",borderLeft:"3px solid #c9a227",borderRadius:7,padding:"16px 20px",margin:"18px 0",lineHeight:1.75}}>{inline(value)}</aside>);i++;continue
  }
  if(isChecklist(value)){
   const items:{text:string;checked:boolean}[]=[];
   while(i<lines.length&&isChecklist(lines[i])){items.push({text:cleanChecklist(lines[i]),checked:isChecked(lines[i])});i++}
   elements.push(<ul key={key} aria-label="Checklist" style={{listStyle:"none",padding:0,margin:"18px 0 25px",display:"grid",gap:9}}>{items.map((item,j)=><li key={j} style={{display:"flex",alignItems:"flex-start",gap:12,background:"#f6f8f8",border:"1px solid #e1e7e9",borderRadius:8,padding:"11px 14px",lineHeight:1.65}}><span aria-hidden="true" style={{fontSize:19,color:"#9b7a21",lineHeight:1.4}}>{item.checked?"☑":"☐"}</span><span>{inline(item.text)}</span></li>)}</ul>);continue
  }
  if(isBullet(value)||isNumber(value)){
   const ordered=isNumber(value),items:string[]=[];
   while(i<lines.length&&!isChecklist(lines[i])&&(ordered?isNumber(lines[i]):isBullet(lines[i]))){items.push(lines[i].trim().replace(ordered?/^\d+[.)]\s+/:/^[-*•]\s+/,""));i++}
   const li=items.map((it,j)=><li key={j} style={{marginBottom:8}}>{inline(it)}</li>);
   elements.push(ordered?<ol key={key} style={{paddingLeft:27,margin:"15px 0 23px",lineHeight:1.8}}>{li}</ol>:<ul key={key} style={{paddingLeft:27,margin:"15px 0 23px",lineHeight:1.8}}>{li}</ul>);continue
  }
  i++;
  elements.push(<p key={key} style={{fontSize:16,lineHeight:1.9,color:"#405266",margin:"0 0 20px",overflowWrap:"anywhere"}}>{inline(value)}</p>);
 }
 return <div>{elements}</div>;
}
