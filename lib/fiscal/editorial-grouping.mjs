/**
 * Group complete Markdown sections without rewriting their text or fiscal data.
 * A semantic heading starts a group. The group ends at the next heading
 * of the same or higher level; deeper headings belong to the section.
 */
export function editorialHeadingKind(value) {
 const text=String(value??"").replace(/^\d{1,3}[.)]\s*/,"").trim().toLocaleLowerCase("pt-BR");
 if (/^(exemplo prático|estudo de caso|situação hipotética)(?:\b|:)/.test(text)) return "example";
 if (/^(conclusão|considerações finais|síntese final)(?:\b|:)/.test(text)) return "conclusion";
 if (/^(o que (?:a empresa|você) deve fazer|como (?:conferir|proceder|corrigir)|procedimento|passo a passo)(?:\b|:|\?)/.test(text)) return "procedure";
 if (/^(ponto de atenção|atenção|cuidados importantes)(?:\b|:)/.test(text)) return "attention";
 return null;
}
export function groupEditorialSections(tokens) {
 const output=[];let plain=[];
 const flush=()=>{if(plain.length){output.push({kind:null,tokens:plain});plain=[]}};
 for(let i=0;i<tokens.length;){
  const token=tokens[i];
  const kind=token.type==="heading"?editorialHeadingKind(token.text):null;
  if(!kind){plain.push(token);i++;continue}
  flush();
  const headingDepth=token.depth??1;
  const grouped=[token];
  i++;
  while(i<tokens.length){
   const current=tokens[i];
   if(current.type==="heading"&&(current.depth??1)<=headingDepth)break;
   grouped.push(current);i++;
  }
  output.push({kind,tokens:grouped});
 }
 flush();return output;
}
