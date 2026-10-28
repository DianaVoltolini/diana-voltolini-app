// app/api/torre/conteudos/formatar/route.ts
import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";

const prompt=`Você é exclusivamente um diagramador de textos fiscais brasileiros.
Retorne JSON com a chave "formatted", contendo Markdown seguro compatível com o leitor:
títulos ## e ###; listas "- " ou "1. "; tabelas Markdown com cabeçalho e linha separadora; negrito **...**;
blocos :::atencao, :::exemplo, :::checklist e :::conclusao terminados em :::.
Reconstrua tabelas de texto colado se as colunas forem identificáveis. Se não forem, mantenha as linhas originais.
Não acrescente fatos, não resuma, não reescreva, não corrija nem elimine conteúdo.
Preserve literalmente datas, valores, números, códigos (CST, NCM, cClassTrib), referências legais, URLs e toda a informação.
Não inclua comentários de revisão nem explicações adicionais. Apenas o JSON válido.`;

export async function POST(request:Request){
 const supabase=await createClient();
 const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError||!user)return NextResponse.json({error:"Acesso não autorizado."},{status:401});
 const {data:profile}=await supabase.from("profiles").select("role,status").eq("id",user.id).maybeSingle();
 if(profile?.role!=="admin"||profile.status!=="active")return NextResponse.json({error:"Acesso restrito à Torre."},{status:403});
 let input:unknown;
 try{input=await request.json()}catch{return NextResponse.json({error:"Entrada inválida."},{status:400})}
 const body=typeof input==="object"&&input!==null&&"body" in input?(input as {body:unknown}).body:null;
 if(typeof body!=="string"||body.trim().length<30||body.length>28000)return NextResponse.json({error:"O texto deve ter de 30 a 28.000 caracteres."},{status:400});
 const apiKey=process.env.OPENAI_API_KEY;
 if(!apiKey)return NextResponse.json({error:"Formatador por IA ainda não configurado. Cadastre OPENAI_API_KEY no servidor."},{status:503});
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),45000);
 try{
  const response=await fetch("https://api.openai.com/v1/chat/completions",{
   method:"POST",
   headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
   body:JSON.stringify({model:process.env.FISCAL_FORMAT_MODEL||"gpt-4.1-mini",temperature:0,response_format:{type:"json_object"},messages:[{role:"system",content:prompt},{role:"user",content:body}]}),
   signal:controller.signal,cache:"no-store"
  });
  if(!response.ok)return NextResponse.json({error:"Não foi possível formatar agora. Confira a configuração da integração."},{status:502});
  const data=await response.json() as {choices?:Array<{message?:{content?:string}}>} ;
  let formatted:unknown;
  try{formatted=JSON.parse(data.choices?.[0]?.message?.content||"{}").formatted}catch{return NextResponse.json({error:"Resposta da formatação inválida."},{status:502})}
  if(typeof formatted!=="string"||formatted.trim().length===0||formatted.length>60000)return NextResponse.json({error:"A formatação recebida não pôde ser validada."},{status:502});
  return NextResponse.json({formatted},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"A formatação não foi concluída. Seu texto permanece inalterado."},{status:502})}
 finally{clearTimeout(timeout)}
}
