import type {ReactNode} from "react";
import {marked} from "marked";
import styles from "./fiscal-rich-text.module.css";

type Token={type:string;text?:string;raw?:string;tokens?:Token[];depth?:number;href?:string;items?:Token[];ordered?:boolean;start?:number;task?:boolean;checked?:boolean;header?:Cell[];rows?:Cell[][];align?:Array<"left"|"center"|"right"|null>};
type Cell={text:string;tokens?:Token[]};
const label:Record<string,string>={atencao:"PONTO DE ATENÇÃO",importante:"IMPORTANTE",exemplo:"EXEMPLO PRÁTICO",checklist:"CHECKLIST DE CONFERÊNCIA",conclusao:"CONCLUSÃO",resumo:"EM RESUMO",dica:"DICA PRÁTICA","na-pratica":"NA PRÁTICA"};
function url(value:string){
 if(value.startsWith("/")&&!value.startsWith("//"))return value;
 if(value.startsWith("#"))return value;
 try{const u=new URL(value);return u.protocol==="https:"||u.protocol==="http:"?u.toString():null}catch{return null}
}
function rich(ts:Token[]=[]):ReactNode{
 return ts.map((t,i)=>{
  const inner=t.tokens?rich(t.tokens):t.text??"";
  switch(t.type){
   case "strong":return <strong key={i}>{inner}</strong>;
   case "em":return <em key={i}>{inner}</em>;
   case "del":return <del key={i}>{inner}</del>;
   case "codespan":return <code key={i}>{t.text}</code>;
   case "br":return <br key={i}/>;
   case "link":{const href=url(t.href??"");return href?<a key={i} href={href} target={href.startsWith("http")?"_blank":undefined} rel="noopener noreferrer">{inner}</a>:<span key={i}>{inner}</span>}
   case "image":{const src=url(t.href??"");return src?<img key={i} src={src} alt={t.text??""} loading="lazy" className={styles.markdownImage}/>:<span key={i}>{t.text??""}</span>}
   case "html":return <span key={i}>{t.raw??t.text??""}</span>;
   default:return <span key={i}>{inner}</span>;
  }
 });
}
function blocks(ts:Token[],depth=0):ReactNode{
 if(depth>12)return null;
 return ts.map((t,i)=>{
  switch(t.type){
   case "space":return null;
   case "heading":{const tag=Math.min(6,(t.depth??1)+1);const H=("h"+tag) as "h2"|"h3"|"h4"|"h5"|"h6";return <H key={i} className={styles.heading}>{rich(t.tokens)}</H>}
   case "paragraph":return <p key={i} className={styles.paragraph}>{rich(t.tokens)}</p>;
   case "text":return <p key={i} className={styles.paragraph}>{rich(t.tokens??[{type:"text",text:t.text??""}])}</p>;
   case "hr":return <hr key={i}/>;
   case "code":return <pre key={i} className={styles.codeBlock}><code>{t.text}</code></pre>;
   case "blockquote":return <blockquote key={i} className={styles.quote}>{blocks(t.tokens??[],depth+1)}</blockquote>;
   case "list":{
    const isTasks=(t.items??[]).some(x=>x.task);
    const children=(t.items??[]).map((x,j)=><li key={j} className={x.task?styles.taskItem:undefined}>{x.task?<span aria-hidden="true" className={styles.checkMark}>{x.checked?"☑":"☐"}</span>:null}{blocks(x.tokens??[],depth+1)}</li>);
    return t.ordered?<ol key={i} className={styles.list} start={t.start||1}>{children}</ol>:<ul key={i} className={[styles.list,isTasks?styles.taskList:""].join(" ")}>{children}</ul>;
   }
   case "table":return <div className={styles.tableWrap} key={i}><table className={styles.table}><thead><tr>{(t.header??[]).map((x,j)=><th key={j} scope="col" style={{textAlign:t.align?.[j]??"left"}}>{rich(x.tokens)}</th>)}</tr></thead><tbody>{(t.rows??[]).map((row,j)=><tr key={j}>{row.map((x,k)=><td key={k} style={{textAlign:t.align?.[k]??"left"}}>{rich(x.tokens)}</td>)}</tr>)}</tbody></table></div>;
   case "html":return <p key={i} className={styles.paragraph}>{t.raw??t.text??""}</p>;
   default:return t.tokens?<div key={i}>{blocks(t.tokens,depth+1)}</div>:null;
  }
 });
}
function segments(body:string){
 const lines=body.replace(/\r\n?/g,"\n").split("\n"),out:{kind:string|null,content:string}[]=[];
 let raw:string[]=[];
 const flush=()=>{if(raw.length){out.push({kind:null,content:raw.join("\n")});raw=[]}};
 for(let i=0;i<lines.length;i++){
  const m=lines[i].trim().match(/^:::(atencao|importante|exemplo|checklist|conclusao|resumo|dica|na-pratica)$/i);
  if(m){let end=i+1;while(end<lines.length&&lines[end].trim()!==":::")end++;
   if(end<lines.length){flush();out.push({kind:m[1].toLowerCase(),content:lines.slice(i+1,end).join("\n")});i=end;continue}
  }
  raw.push(lines[i]);
 }
 flush();return out;
}
export default function FiscalRichText({body}:{body:string}){
 return <div className={styles.reader}>{segments(body).map((part,i)=>{
  const content=blocks(marked.lexer(part.content,{gfm:true}) as unknown as Token[]);
  return part.kind?<section key={i} className={[styles.block,styles[(part.kind==="na-pratica"?"naPratica":part.kind) as keyof typeof styles]].join(" ")} aria-label={label[part.kind]}><p className={styles.blockLabel}>{label[part.kind]}</p>{content}</section>:<div key={i} className={styles.markdownSegment}>{content}</div>;
 })}</div>;
}
