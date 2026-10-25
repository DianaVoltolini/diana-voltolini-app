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
export default function FiscalRichText({body}:{body:string}){
 const lines=body.replace(/\r\n?/g,"\n").split("\n");
 const elements:ReactNode[]=[];let i=0;
 while(i<lines.length){
  const value=lines[i].trim();if(!value){i++;continue}
  const key=i;
  if(value.startsWith("|")&&i+1<lines.length&&tableSeparator(lines[i+1])){
   const heads=cells(lines[i]);i+=2;const rows:string[][]=[];
   while(i<lines.length&&lines[i].trim().startsWith("|")){rows.push(cells(lines[i]));i++}
   elements.push(<div key={key} style={{overflowX:"auto",margin:"22px 0"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}><thead><tr>{heads.map((c,j)=><th key={j} scope="col" style={{textAlign:"left",padding:12,background:"#f0f2f3",borderBottom:"2px solid #c9a227"}}>{inline(c)}</th>)}</tr></thead><tbody>{rows.map((row,j)=><tr key={j}>{heads.map((_,k)=><td key={k} style={{padding:12,borderBottom:"1px solid #e2e7eb",verticalAlign:"top"}}>{inline(row[k]??"")}</td>)}</tr>)}</tbody></table></div>);continue
  }
  const h=value.match(/^(#{1,3})\s+(.+)$/);
  if(h){const H=h[1].length===1?"h2":h[1].length===2?"h3":"h4";const sizes={h2:26,h3:21,h4:17};elements.push(<H key={key} style={{fontFamily:"Georgia,serif",fontSize:sizes[H],lineHeight:1.3,margin:"30px 0 12px",color:"#102033"}}>{inline(heading(value))}</H>);i++;continue}
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
  const para=[value];i++;
  while(i<lines.length&&lines[i].trim()&&!lines[i].trim().startsWith("#")&&!isBullet(lines[i])&&!isNumber(lines[i])&&!isChecklist(lines[i])&&!lines[i].trim().startsWith("|")){para.push(lines[i].trim());i++}
  elements.push(<p key={key} style={{fontSize:16,lineHeight:1.9,color:"#405266",margin:"0 0 20px",overflowWrap:"anywhere"}}>{inline(para.join(" "))}</p>);
 }
 return <div>{elements}</div>;
}
