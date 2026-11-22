import {createHmac,createHash,timingSafeEqual} from "node:crypto";

const SITE="https://app.dianavoltolini.com.br";
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function moneyBR(cents:number){
 return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
}
/**
 * A chave específica tem prioridade, preservando links já emitidos.
 * Na ausência dela, usa a chave secreta de servidor já exigida pela Torre.
 * Domínio separado no HMAC impede compartilhar tokens com outros serviços.
 * A rotação da chave de servidor invalida links produzidos pelo fallback.
 */
export function fiscalQuoteTokenReady(){
 const dedicated=process.env.FISCAL_ANALYSIS_QUOTE_TOKEN_SECRET;
 const existing=process.env.SUPABASE_SECRET_KEY;
 return Boolean((dedicated&&dedicated.length>=32)||(existing&&existing.length>=32));
}
function tokenSecret(){
 const dedicated=process.env.FISCAL_ANALYSIS_QUOTE_TOKEN_SECRET;
 if(dedicated&&dedicated.length>=32)return dedicated;
 const existing=process.env.SUPABASE_SECRET_KEY;
 if(existing&&existing.length>=32)return existing;
 throw new Error("Chave privada do servidor indisponível para gerar o link da Proposta");
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
 const message=`Olá, ${firstName}! Sua Proposta de Análise Fiscal Individual (solicitação ${protocol}) está disponível. Consulte escopo, valor e prazo no link: ${url}. A Proposta também foi encaminhada por e-mail. Diana Voltolini.`;
 return "https://wa.me/"+international+"?text="+encodeURIComponent(message);
}
