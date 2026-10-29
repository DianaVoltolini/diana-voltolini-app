"use server";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
type Result={ok:boolean;message:string;count?:number};
const norm=(value:string)=>value.trim().toLowerCase();
async function eligible(templateId:string,interest:string,landing:string){
 const db=getSupabaseAdmin();
 const {data:template,error}=await db.from("marketing_email_templates").select("id,name,subject,body,cta_url,cta_label,active").eq("id",templateId).eq("active",true).maybeSingle();
 if(error||!template)throw new Error("Modelo ativo não encontrado");
 let q=db.from("marketing_leads").select("name,email").eq("newsletter_opt_in",true);
 if(interest)q=q.eq("interest",interest);
 if(landing)q=q.eq("landing_id",landing);
 const {data:leads,error:leadsError}=await q.limit(5000);
 if(leadsError)throw new Error("Erro ao consultar leads");
 if((leads??[]).length===5000)throw new Error("Mais de 5.000 registros: divida a campanha");
 const cleaned=new Map<string,{email:string;name:string}>();
 for(const l of leads??[]){const email=norm(l.email??"");if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&!cleaned.has(email))cleaned.set(email,{email,name:l.name??""})}
 const addresses=[...cleaned.keys()];
 const excluded=new Set<string>();
 for(let i=0;i<addresses.length;i+=200){
  const {data:opt,error:optError}=await db.from("marketing_email_optouts").select("email").in("email",addresses.slice(i,i+200));
  if(optError)throw new Error("Erro ao verificar descadastros");
  for(const x of opt??[])excluded.add(norm(x.email));
 }
 return {template,recipients:[...cleaned.values()].filter(x=>!excluded.has(x.email))};
}
export async function countManualRecipients(templateId:string,interest:string,landing:string):Promise<Result>{
 await requireAdmin();
 try{const result=await eligible(templateId,interest,landing);return {ok:true,message:"Destinatários elegíveis",count:result.recipients.length}}catch(e){return {ok:false,message:e instanceof Error?e.message:"Não foi possível conferir os destinatários"}}
}
export async function queueManualDispatch(templateId:string,interest:string,landing:string,expected:number):Promise<Result>{
 await requireAdmin();
 if(!Number.isSafeInteger(expected)||expected<1)return {ok:false,message:"Confira a quantidade de destinatários primeiro."};
 try{
  const db=getSupabaseAdmin();
  const {template,recipients}=await eligible(templateId,interest,landing);
  if(expected!==recipients.length)return {ok:false,message:"A lista mudou. Confira novamente a quantidade antes de confirmar."};
  const {data:dispatch,error}=await db.from("marketing_email_dispatches").insert({template_id:template.id,subject:template.subject,body:template.body,cta_url:template.cta_url,cta_label:template.cta_label,interest:interest||null,landing_id:landing||null}).select("id").single();
  if(error||!dispatch)return {ok:false,message:"Não foi possível criar a campanha."};
  const rows=recipients.map(x=>({...x,dispatch_id:dispatch.id}));
  for(let i=0;i<rows.length;i+=200){
   const {error:insertError}=await db.from("marketing_email_recipients").insert(rows.slice(i,i+200));
   if(insertError){await db.from("marketing_email_dispatches").update({status:"canceled"}).eq("id",dispatch.id);return {ok:false,message:"Falha ao montar fila; campanha cancelada. Nenhum envio foi iniciado."}}
  }
  return {ok:true,message:"Campanha colocada na fila: "+recipients.length+" destinatários. O envio começará somente quando o executor estiver configurado.",count:recipients.length};
 }catch(e){return {ok:false,message:e instanceof Error?e.message:"Falha ao preparar campanha"}}
}
