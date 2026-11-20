// app/torre/gerador-ebooks/pdf-engine.ts
// A4 PDF compositor: measured lines, reflowing tables, TOC and clickable links.
// Runs entirely in the browser. No server browser, service or database is required.
import { PDFDocument, StandardFonts, rgb, PDFName, PDFString } from "pdf-lib";
import type { PDFFont, PDFPage, PDFDocument as PDFDoc } from "pdf-lib";

export type EbookInput = {
  title: string; subtitle: string; label: string; edition: string;
  topics: string; markdown: string; cta: string; ctaUrl: string;
};
type Block =
  | {type:"chapter";text:string;number:string;tag:string}
  | {type:"heading";text:string;level:number}
  | {type:"text";text:string}
  | {type:"note";label:string;text:string}
  | {type:"list";entries:string[];ordered:boolean;check:boolean;start:number}
  | {type:"table";rows:string[][]}
  | {type:"cards";rows:string[][]}
  | {type:"steps";rows:string[][]}
  | {type:"rule"};

const P_W=595.28,P_H=841.89,M=47,R=P_W-M,WIDTH=P_W-2*M;
const NAVY=rgb(.055,.118,.208),GOLD=rgb(.69,.51,.16),INK=rgb(.20,.27,.35),
  GRAY=rgb(.42,.49,.56),PALE=rgb(.935,.956,.98),BEIGE=rgb(.98,.963,.921),
  WHITE=rgb(1,1,1),LINE=rgb(.84,.88,.92);
const clean=(s:string)=>s.replace(/\*\*/g,"").replace(/__(.*?)__/g,"$1")
  .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g,"$1")
  .replace(/[\u2011\u2012\u2013\u2014]/g,"-").replace(/[\u2018\u2019]/g,"'")
  .replace(/[\u201c\u201d]/g,'"').replace(/[\u2022\u25cf]/g,"·")
  .replace(/[\u2026]/g,"...").replace(/[\u00a0\u200b]/g," ")
  .replace(/[\u2713\u2714]/g,"x").trim();
function safe(s:string){return clean(s).replace(/[^\u0020-\u00FF]/g,"?");}
function splitLines(source:string,font:PDFFont,size:number,width:number):string[]{
 const words=safe(source).split(/\s+/).filter(Boolean);
 const pieces:string[]=[];
 for(const word of words){
   if(font.widthOfTextAtSize(word,size)<=width){pieces.push(word);continue;}
   let part="";
   for(const ch of word){
     if(part && font.widthOfTextAtSize(part+ch,size)>width){pieces.push(part);part=ch;}
     else part+=ch;
   }
   if(part)pieces.push(part);
 }
 const out:string[]=[];let line="";
 for(const word of pieces){
   const candidate=line?line+" "+word:word;
   if(font.widthOfTextAtSize(candidate,size)<=width)line=candidate;
   else{if(line)out.push(line);line=word;}
 }
 if(line)out.push(line);
 return out.length?out:[""];
}

function parse(md:string):Block[]{
 const blocks:Block[]=[];const lines=md.replace(/\r\n?/g,"\n").split("\n");
 let i=0,tag="";
 while(i<lines.length){
   const t=lines[i].trim(); i++;
   if(!t||/^<!--\s*page\s*-->$/i.test(t))continue;
   if(/^\*[^*]+\*$/.test(t)){tag=clean(t).toUpperCase();continue;}
   const chapter=/^#\s+(?:(\d+)[.)]\s+)?(.+)$/.exec(t);
   if(chapter){blocks.push({type:"chapter",number:chapter[1]||String(blocks.filter(b=>b.type==="chapter").length+1),text:chapter[2],tag});tag="";continue;}
   const sub=/^(#{2,3})\s+(.+)$/.exec(t);
   if(sub){blocks.push({type:"heading",level:sub[1].length,text:sub[2]});continue;}
   if(/^---+$/.test(t)){blocks.push({type:"rule"});continue;}
   if(t.startsWith(":::")){
     const kind=t.slice(3).toLowerCase(),inner:string[]=[];
     while(i<lines.length && lines[i].trim()!==":::"){if(lines[i].trim())inner.push(lines[i].trim());i++;}
     if(i<lines.length)i++;
     if(kind==="cards"||kind==="steps")blocks.push({type:kind,rows:inner.map(x=>x.replace(/^[-*]\s+/,"").split("|").map(z=>z.trim()))});
     else blocks.push({type:"note",label:inner[0]||kind.toUpperCase(),text:inner.slice(1).join(" ")});
     continue;
   }
   if(t.startsWith(">")){
     const parts=[t.replace(/^>\s*/,"")];
     while(i<lines.length && /^>\s*/.test(lines[i]))parts.push(lines[i++].replace(/^>\s*/,""));
     const combined=parts.join(" ").replace(/^\*\*/,"");
     const m=/^([^:]{2,64}):\*?\*?\s*(.*)$/.exec(clean(combined));
     blocks.push({type:"note",label:m?m[1]:"ATENÇÃO",text:m?m[2]:clean(combined)});continue;
   }
   if(t.includes("|") && i<lines.length && /^\|?[\s:|-]+\|?$/.test(lines[i].trim())){
     const cells=(s:string)=>s.replace(/^\||\|$/g,"").split("|").map(x=>clean(x));
     const rows=[cells(t)];i++;
     while(i<lines.length && lines[i].trim().includes("|"))rows.push(cells(lines[i++].trim()));
     blocks.push({type:"table",rows});continue;
   }
   if(/^(?:[-*]\s+|\d+\.\s+)/.test(t)){
     const entries=[t];while(i<lines.length&&/^(?:[-*]\s+|\d+\.\s+)/.test(lines[i].trim()))entries.push(lines[i++].trim());
     const check=entries.some(x=>/^[-*]\s+\[[ xX]\]/.test(x));
     const ordered=/^\d+\./.test(t);
     blocks.push({type:"list",ordered,check,start:ordered?Number(/^\d+/.exec(t)?.[0]||"1"):1,entries:entries.map(x=>clean(x.replace(/^(?:[-*]\s+|\d+\.\s+)/,"").replace(/^\[[ xX]\]\s*/,"").replace(/^\|\s*/,"")))});
     continue;
   }
   if(/^https?:\/\//.test(t)){blocks.push({type:"text",text:t});continue;}
   const parts=[t];
   while(i<lines.length && lines[i].trim() && !/^(?:#|>|[-*]\s|\d+\.\s|\||:::|<!--)/.test(lines[i].trim()))parts.push(lines[i++].trim());
   blocks.push({type:"text",text:parts.join(" ")});
 }
 return blocks.filter(b=> !(b.type==="text" && (/^(?:Subtítulo|Edição|Autoria|Neste guia):/.test(clean(b.text))||/Nota de origem/i.test(b.text))));
}
type Chapter={title:string;number:string;page:number;ref:PDFPage};
function addLink(doc:PDFDoc,page:PDFPage,rect:[number,number,number,number],dest:PDFPage|string){
  try{
   const annotation=typeof dest==="string"
      ?doc.context.obj({Type:"Annot",Subtype:"Link",Rect:rect,Border:[0,0,0],A:{S:"URI",URI:PDFString.of(dest)}})
      :doc.context.obj({Type:"Annot",Subtype:"Link",Rect:rect,Border:[0,0,0],Dest:[dest.ref,PDFName.of("Fit")]});
   page.node.addAnnot(doc.context.register(annotation));
  }catch{/* Keep text usable even on PDF readers without link annotation support. */}
}
export async function generateEbookPdf(input:EbookInput):Promise<Uint8Array>{
 const doc=await PDFDocument.create();
 doc.setTitle(safe(input.title));doc.setAuthor("Diana Voltolini");
 const regular=await doc.embedFont(StandardFonts.Helvetica);
 const bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const serif=await doc.embedFont(StandardFonts.TimesRomanBold);
 const chapters:Chapter[]=[];
 const cover=doc.addPage([P_W,P_H]);const toc=doc.addPage([P_W,P_H]);
 let page=doc.addPage([P_W,P_H]),y=765,bodyPages=1;
 const draw=(pg:PDFPage,t:string,x:number,baseline:number,size:number,font:PDFFont=regular,color=INK)=>
   pg.drawText(safe(t),{x,y:baseline,size,font,color});
 function newPage(){
   page=doc.addPage([P_W,P_H]);bodyPages++;y=765;
 }
 function ensure(height:number){if(y-height<72)newPage();}
 function paragraph(t:string,opts:{font?:PDFFont;size?:number;leading?:number;x?:number;width?:number;color?:typeof INK;after?:number;minLines?:number}={}){
   const ft=opts.font??regular,sz=opts.size??10.7,leading=opts.leading??16.5,x=opts.x??M,w=opts.width??WIDTH;
   const arr=splitLines(t,ft,sz,w);
   ensure(Math.min(opts.minLines??2,arr.length)*leading+9);
   for(const ln of arr){if(y-leading<70)newPage();draw(page,ln,x,y,sz,ft,opts.color??INK);y-=leading;}
   y-=opts.after??10;
 }
 function label(t:string){
   ensure(28);draw(page,t.toUpperCase(),M,y,8.2,bold,GOLD);y-=22;
 }
 function section(t:string,level:number){
   ensure(level===2?62:46);y-=7;
   paragraph(t,{font:serif,size:level===2?17.5:13.5,leading:22,after:5,minLines:2});
   page.drawLine({start:{x:M,y:y+4},end:{x:M+36,y:y+4},color:GOLD,thickness:2.2});y-=18;
 }
 function panel(labelText:string,text:string,dark=false){
   const ft=dark?WHITE:INK,fill=dark?NAVY:BEIGE;
   const width=WIDTH-32,lines=splitLines(text,regular,10.2,width),h=39+lines.length*15;
   ensure(h+15);
   page.drawRectangle({x:M,y:y-h,width:WIDTH,height:h,color:fill,borderColor:dark?NAVY:GOLD,borderWidth:.6});
   page.drawRectangle({x:M,y:y-h,width:4,height:h,color:GOLD});
   draw(page,labelText.toUpperCase(),M+16,y-20,8.3,bold,dark?GOLD:NAVY);
   let ly=y-40;for(const ln of lines){draw(page,ln,M+16,ly,10.2,regular,ft);ly-=15;}
   y-=h+19;
 }
 function bulletList(entries:string[],ordered:boolean,check:boolean,start=1){
   for(let i=0;i<entries.length;i++){
    const arr=splitLines(entries[i],regular,10.3,WIDTH-39),h=Math.max(25,arr.length*15+11);
    ensure(h);
    if(check)page.drawRectangle({x:M+3,y:y-12,width:11,height:11,borderColor:GOLD,borderWidth:1});
    else if(ordered){page.drawCircle({x:M+12,y:y-9,size:10,color:NAVY});draw(page,String(start+i),M+9,y-12,8,bold,WHITE);}
    else page.drawCircle({x:M+10,y:y-6,size:2.6,color:GOLD});
    for(let j=0;j<arr.length;j++)draw(page,arr[j],M+30,y-j*15,10.3);
    y-=h;
   }y-=7;
 }
 function table(rows:string[][]){
   if(!rows.length)return;
   const n=rows[0].length,colWidth=WIDTH/n,pad=9;
   const rowLines=(r:string[],ft:PDFFont)=>(Array.from({length:n},(_,k)=>splitLines(r[k]||"",ft,9.3,colWidth-2*pad)));
   function drawRow(r:string[],header:boolean,alt:boolean){
     const lines=rowLines(r,header?bold:regular),h=Math.max(30,...lines.map(l=>l.length*13+17));
     if(y-h<72){newPage();if(!header)drawRow(rows[0],true,false);}
     page.drawRectangle({x:M,y:y-h,width:WIDTH,height:h,color:header?NAVY:alt?PALE:WHITE});
     for(let k=0;k<n;k++)for(let j=0;j<lines[k].length;j++)draw(page,lines[k][j],M+k*colWidth+pad,y-16-j*13,9.3,header?bold:regular,header?WHITE:INK);
     y-=h;
   }
   ensure(92);drawRow(rows[0],true,false);
   rows.slice(1).forEach((r,i)=>drawRow(r,false,i%2===1));y-=20;
 }
 function cards(rows:string[][]){
   const gap=11,cw=(WIDTH-gap)/2;
   for(let i=0;i<rows.length;i+=2){
     const pair=rows.slice(i,i+2); const measures=pair.map(r=>splitLines(r[2]||"",regular,9.4,cw-26));
     const h=Math.max(93,...measures.map(a=>60+a.length*13));
     ensure(h+12);
     pair.forEach((r,k)=>{
       const x=M+k*(cw+gap);
       page.drawRectangle({x,y:y-h,width:cw,height:h,color:PALE,borderColor:LINE,borderWidth:.6});
       draw(page,r[0]||"INFO",x+13,y-18,8,bold,GOLD);
       const titles=splitLines(r[1]||"",bold,11,cw-26);
       titles.forEach((t,j)=>draw(page,t,x+13,y-38-j*14,11,bold,NAVY));
       measures[k].forEach((t,j)=>draw(page,t,x+13,y-55-titles.length*14+14-j*13,9.4,regular,GRAY));
     });
     y-=h+11;
   }
 }
 function steps(rows:string[][]){
   rows.forEach((r,i)=>{
     const lines=splitLines(r[2]||"",regular,9.5,WIDTH-65);
     const h=Math.max(52,32+lines.length*13);
     ensure(h+9);
     page.drawRectangle({x:M,y:y-h,width:WIDTH,height:h,color:i%2?rgb(.965,.976,.99):PALE});
     page.drawCircle({x:M+20,y:y-24,size:12,color:NAVY});
     draw(page,r[0]||String(i+1),M+14,y-28,8,bold,WHITE);
     draw(page,r[1]||"",M+42,y-19,10.7,bold,NAVY);
     lines.forEach((ln,j)=>draw(page,ln,M+42,y-35-13*j,9.5));
     y-=h+9;
   });
 }
 // Cover
 cover.drawRectangle({x:0,y:P_H-9,width:P_W,height:9,color:NAVY});
 try{
   const res=await fetch("/brand/logo-light.png");
   if(res.ok){const bytes=new Uint8Array(await res.arrayBuffer());const im=await doc.embedPng(bytes);
     const w=260,h=w*im.height/im.width;cover.drawImage(im,{x:M,y:690,width:w,height:h});}
   else draw(cover,"DIANA VOLTOLINI",M,735,24,serif,NAVY);
 }catch{draw(cover,"DIANA VOLTOLINI",M,735,24,serif,NAVY);}
 draw(cover,(input.label||"GUIA PRÁTICO").toUpperCase(),M,610,9,bold,GOLD);
 cover.drawLine({start:{x:M,y:600},end:{x:M+56,y:600},thickness:2,color:GOLD});
 let cy=537;for(const ln of splitLines(input.title,serif,36,WIDTH)){draw(cover,ln,M,cy,36,serif,NAVY);cy-=42;}
 cy-=26;for(const ln of splitLines(input.subtitle,regular,13.5,WIDTH)){draw(cover,ln,M,cy,13.5);cy-=19;}
 cover.drawRectangle({x:M,y:104,width:WIDTH,height:86,color:PALE});
 draw(cover,"NESTA EDIÇÃO",M+16,172,8,bold,GOLD);
 let ty=150;for(const ln of splitLines(input.topics,regular,10.5,WIDTH-32)){draw(cover,ln,M+16,ty,10.5);ty-=15;}
 draw(cover,input.edition,M,82,9,regular,GRAY);
 // Body
 const blocks=parse(input.markdown).filter((b,i)=>!(i===0 && b.type==="chapter" && !/^\d+/.test(input.markdown.trim().slice(0,10)) && b.text.trim().toLowerCase()===input.title.trim().toLowerCase()));
 for(let i=0;i<blocks.length;i++){
   const b=blocks[i];
   if(b.type==="chapter"){
     ensure(125);
     y-=9;label("CAPÍTULO "+b.number.padStart(2,"0")+(b.tag?" / "+b.tag:""));
     chapters.push({title:b.text,number:b.number,page:doc.getPageCount(),ref:page});
     paragraph(b.text,{font:serif,size:25,leading:29,color:NAVY,after:8,minLines:2});
     page.drawLine({start:{x:M,y:y+4},end:{x:M+43,y:y+4},color:GOLD,thickness:2.3});y-=18;
   } else if(b.type==="heading")section(b.text,b.level);
   else if(b.type==="text"){
     const url=/https?:\/\/[^\s)]+/.exec(b.text);
     const originalPage=page,originalY=y;
     paragraph(b.text,{size:10.5,leading:16,after:11,color:url?rgb(.12,.32,.57):INK});
     if(url && originalPage===page)addLink(doc,page,[M,Math.max(y,originalY-29),R,originalY+8],url[0]);
   } else if(b.type==="note")panel(b.label,b.text,/IDEIA PRINCIPAL|SÍNTESE|RESULTADO DESTA/i.test(b.label));
   else if(b.type==="list")bulletList(b.entries,b.ordered,b.check,b.start);
   else if(b.type==="table")table(b.rows);
   else if(b.type==="cards")cards(b.rows);
   else if(b.type==="steps")steps(b.rows);
   else if(b.type==="rule"){ensure(23);page.drawLine({start:{x:M,y},end:{x:R,y},color:LINE,thickness:.6});y-=23;}
 }
 // Only add CTA when source content does not already include a closing chapter.
 const hasClosing=chapters.some(c=>/decisões melhores|para continuar/i.test(c.title));
 if(!hasClosing && input.cta){ensure(115);panel("CONTINUE APRENDENDO",input.cta,true);}
 if(input.ctaUrl && /^https?:\/\//.test(input.ctaUrl)){ensure(35);const p=page,yy=y;paragraph(input.ctaUrl,{size:10,color:rgb(.12,.32,.57)});addLink(doc,p,[M,yy-18,R,yy+9],input.ctaUrl);}
 // TOC page is fixed before content, so page numbers are stable.
 toc.drawRectangle({x:0,y:P_H-9,width:P_W,height:9,color:NAVY});
 draw(toc,"EDIÇÃO "+safe(input.edition).toUpperCase()+" / GUIA PRÁTICO",M,754,8,bold,GOLD);
 draw(toc,"Sumário",M,708,31,serif,NAVY);
 toc.drawLine({start:{x:M,y:689},end:{x:M+48,y:689},color:GOLD,thickness:2.5});
 let yy=645;
 for(const c of chapters){
   if(yy<92)break;
   draw(toc,c.number.padStart(2,"0"),M,yy,9,bold,GOLD);
   const txt=splitLines(c.title,regular,10.1,WIDTH-90);
   txt.forEach((ln,k)=>draw(toc,ln,M+34,yy-k*13,10.1,regular,INK));
   const py=yy-((txt.length-1)*13);
   draw(toc,String(c.page).padStart(2,"0"),R-18,py,10,bold,NAVY);
   addLink(doc,toc,[M,py-8,R,yy+14],c.ref);
   yy-=Math.max(25,txt.length*13+10);
 }
 // Institutional footer; always correct after pagination.
 const pages=doc.getPages(),total=pages.length;
 pages.forEach((pg,i)=>{
   if(i===0)return;
   pg.drawLine({start:{x:M,y:48},end:{x:R,y:48},color:GOLD,thickness:.7});
   draw(pg,"DIANA VOLTOLINI  •  ESPECIALISTA EM FATURAMENTO E INTELIGÊNCIA FISCAL",M,34,7.2,bold,NAVY);
   draw(pg,"www.dianavoltolini.com.br",M,22,7.2,regular,GRAY);
   draw(pg,String(i+1).padStart(2,"0")+" / "+String(total).padStart(2,"0"),R-47,26,8,bold,NAVY);
   if(i>1){draw(pg,"DIANA VOLTOLINI  /  CONHECIMENTO FISCAL NA PRÁTICA",M,798,7.3,bold,NAVY);}
 });
 return doc.save({useObjectStreams:false});
}
