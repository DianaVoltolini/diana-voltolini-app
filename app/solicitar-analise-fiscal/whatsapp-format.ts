/** Formata celular brasileiro (DDD + nove dígitos) para exibição e cadastro. */
export function formatFiscalWhatsapp(input:string):string{
 let digits=input.replace(/\D/g,"");
 if(digits.startsWith("55")&&digits.length>=12)digits=digits.slice(2);
 digits=digits.slice(0,11);
 if(!digits)return "";
 if(digits.length<=2)return "("+digits;
 const ddd=digits.slice(0,2);
 const mobile=digits.slice(2);
 if(!mobile)return "("+ddd+")";
 if(mobile.length===1)return "("+ddd+") "+mobile;
 return "("+ddd+") "+mobile.slice(0,1)+" "+mobile.slice(1,5)+
  (mobile.length>5?"-"+mobile.slice(5):"");
}
export function normalizeFiscalWhatsapp(input:string):string|null{
 let digits=input.replace(/\D/g,"");
 if(digits.startsWith("55")&&digits.length===13)digits=digits.slice(2);
 if(!/^[1-9][0-9]9[0-9]{8}$/.test(digits))return null;
 return formatFiscalWhatsapp(digits);
}
