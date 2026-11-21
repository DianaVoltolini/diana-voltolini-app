import {createHmac,createHash,timingSafeEqual} from "node:crypto";

const SITE="https://app.dianavoltolini.com.br";
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function moneyBR(cents:number){
 return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
}
function tokenSecret(){
 const s=process.env.FISCAL_ANALYSIS_QUOTE_TOKEN_SECRET;
 if(!s||s.length<32)throw new Error("FISCAL_ANALYSIS_QUOTE_TOKEN_SECRET ausente ou curta");
 return s;
}
export function quoteToken(id:string,version:number){
 if(!uuid.test(id)||!Number.isInteger(version)||version<1)throw new Error("Identificação de orçamento inválida");
 return createHmac("sha256",tokenSecret()).update("fiscal-analysis-quote:v1:"+id+":"+version).digest("hex");
}
export function quoteTokenHash(token:string){
 if(!/^[a-f0-9]{64}$/.test(token))throw new Error("Token inválido");
 return createHash("sha256").update(token).digest("hex");
}
export function verifyQuoteToken(id:string,version:number,token:string){
 if(!/^[a-f0-9]{64}$/.test(token))return false;
 const expected=Buffer.from(quoteToken(id,version),"hex");
 return timingSafeEqual(expected,Buffer.from(token,"hex"));
}
export function quoteUrl(id:string,version:number){
 return SITE+"/proposta/analise-fiscal/"+quoteToken(id,version);
}
export function whatsappQuoteUrl(phone:string,customer:string,protocol:string,url:string){
 const digits=phone.replace(/\D/g,"");
 const international=digits.startsWith("55")?digits:"55"+digits;
 if(!/^55\d{10,11}$/.test(international))return null;
 const firstName=customer.trim().split(/\s+/)[0]||"Olá";
 const message=`Olá, ${firstName}! Seu orçamento de Análise Fiscal Individual (solicitação ${protocol}) está disponível. Consulte escopo, valor e prazo no link: ${url} . O orçamento também foi encaminhado por e-mail. Diana Voltolini.`;
 return "https://wa.me/"+international+"?text="+encodeURIComponent(message);
}
