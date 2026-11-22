// Validade comercial padrão: 3 dias corridos (72 horas) desde a emissão.
// Não corresponde automaticamente ao vencimento/expiração efetiva na Bling Conta.
export const FISCAL_PROPOSAL_VALIDITY_HOURS=72;
export function fiscalProposalExpiresAt(issuedAt:Date):string{
 if(!Number.isFinite(issuedAt.getTime()))throw new Error("Data de emissão inválida");
 return new Date(issuedAt.getTime()+FISCAL_PROPOSAL_VALIDITY_HOURS*60*60*1000).toISOString();
}
export function fiscalProposalExpiresLabel(value:string):string{
 return new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",
  day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"
 }).format(new Date(value));
}
