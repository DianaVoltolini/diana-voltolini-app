"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
const value=(f:FormData,k:string,max:number)=>String(f.get(k)||"").trim().slice(0,max);
export type EmailTemplateSaveState={status:"idle"|"error"|"success";message:string;savedId?:string};
const EMAIL_SAVE_IDLE:EmailTemplateSaveState={status:"idle",message:""};
export async function saveEmailTemplate(_previous:EmailTemplateSaveState=EMAIL_SAVE_IDLE,f?:FormData):Promise<EmailTemplateSaveState>{
 await requireAdmin();
 const fail=(message:string):EmailTemplateSaveState=>({status:"error",message});
 if(!f)return fail("Os dados do formulário não foram recebidos. Atualize a página e tente novamente.");
 const id=value(f,"id",50),name=value(f,"name",120),subject=value(f,"subject",180),body=value(f,"body",14000);
 const kind=value(f,"kind",20)==="welcome"?"welcome":"manual";
 const audience_kind=value(f,"audience_kind",20)==="buyers"?"buyers":"leads";
 const description=value(f,"description",500),interest=value(f,"interest",120),
  landing_id=value(f,"landing_id",50);
 let cta_label=value(f,"cta_label",80),cta_url=value(f,"cta_url",300);
 const selectedCtaId=value(f,"cta_id",40);
 const selectedLandingCtaId=value(f,"cta_landing_id",40);
 const legacyDestinations=["https://dianavoltolini.com.br/blog","https://dianavoltolini.com.br/ibs-cbs-na-pratica","https://dianavoltolini.com.br/diagnostico-ibs-cbs","https://dianavoltolini.com.br/fiscal-na-pratica","https://dianavoltolini.com.br/produtos","https://dianavoltolini.com.br"];
 if(!name||!subject||!body)return fail("Preencha o nome da campanha, o assunto e o texto do e-mail.");
 if(selectedCtaId&&selectedLandingCtaId)return fail("Foi identificado mais de um destino de CTA. Selecione novamente o destino.");
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
 const auto_enabled=f.get("auto_enabled")==="yes",auto_include_existing=f.get("auto_include_existing")==="yes";
 if(auto_enabled&&kind!=="welcome"&&!landing_id)return fail("Selecione a landing de origem para ativar o envio automático.");
 let savedId="";
 try{
  const db=getSupabaseAdmin();
  if(selectedLandingCtaId){
   if(!uuid.test(selectedLandingCtaId))return fail("O destino da landing é inválido. Selecione novamente.");
   const {data:landingCta,error:landingCtaError}=await db.from("marketing_landings")
    .select("id,slug,status,button_text").eq("id",selectedLandingCtaId).maybeSingle();
   if(landingCtaError){console.error("[email-template-save] landing lookup",landingCtaError);return fail("Não foi possível consultar a landing. Tente salvar novamente.");}
   if(!landingCta||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(landingCta.slug))
    return fail("Landing de destino inválida.");
   // Permite preparar CTA enquanto a landing ainda está em rascunho.
   if(landingCta.status!=="published"&&!(auto_enabled&&landing_id===selectedLandingCtaId&&audience_kind==="leads"))
    return fail("Landing ainda não publicada. Para criar seu e-mail de entrega, selecione a mesma landing como origem automática.");
   cta_url="https://dianavoltolini.com.br/l/"+landingCta.slug;
   cta_label=(landingCta.button_text||"Acessar material gratuito").trim().slice(0,80);
  }else if(selectedCtaId){
   // CTA do catálogo: nunca confiar na URL enviada pelo navegador.
   if(!uuid.test(selectedCtaId))return fail("O CTA selecionado é inválido. Selecione novamente.");
   const {data:source,error:sourceError}=await db.from("fiscal_ctas")
    .select("id,button_label,url").eq("id",selectedCtaId).eq("active",true).maybeSingle();
   if(sourceError){console.error("[email-template-save] CTA lookup",sourceError);return fail("Não foi possível consultar o CTA. Tente novamente.");}
   if(!source)return fail("O CTA selecionado não está mais disponível. Escolha outro destino.");
   cta_label=source.button_label;
   cta_url=source.url;
  }else{
   // Manter os destinos tradicionais e os endereços já gravados nos modelos antigos.
   let previouslySaved=false;
   if(id&&!legacyDestinations.includes(cta_url)){
    const {data:existing,error:existingError}=await db.from("marketing_email_templates")
     .select("cta_url").eq("id",id).maybeSingle();
    if(existingError){console.error("[email-template-save] existing URL lookup",existingError);return fail("Não foi possível conferir o destino salvo. Tente novamente.");}
    previouslySaved=existing?.cta_url===cta_url;
   }
   if(!legacyDestinations.includes(cta_url)&&!previouslySaved)
    return fail("O destino selecionado não está autorizado. Escolha um CTA ou uma landing publicada.");
  }
  const safeDestination=(()=>{
   try{const u=new URL(cta_url);return u.protocol==="https:"&&
    ["dianavoltolini.com.br","app.dianavoltolini.com.br"].includes(u.hostname);}
   catch{return false;}
  })();
  if(!safeDestination||!cta_label||cta_label.length>80)
   return fail("O endereço ou texto do botão é inválido. Escolha novamente o CTA.");
  // Um único modelo de entrega por landing evita ambiguidade e disparos duplicados.
  if(audience_kind==="leads"&&auto_enabled&&f.get("active")==="yes"&&landing_id){
    const {data:otherTemplates,error:otherError}=await db.from("marketing_email_templates")
      .select("id").eq("landing_id",landing_id).eq("active",true)
      .eq("auto_enabled",true).eq("audience_kind","leads").eq("kind","manual")
      .is("interest",null).limit(3);
    if(otherError)return fail("Não foi possível validar os modelos de entrega desta landing.");
    if((otherTemplates??[]).some(t=>t.id!==id))
      return fail("Esta landing já possui um modelo automático ativo. Edite o modelo existente em vez de criar outro.");
  }
  const existingTemplate=id?await db.from("marketing_email_templates").select("auto_enabled,auto_activated_at").eq("id",id).maybeSingle():{data:null,error:null};
  if(existingTemplate.error){console.error("[email-template-save] template lookup",existingTemplate.error);return fail("Não foi possível consultar este modelo. Tente novamente.");}
  if(id&&!existingTemplate.data)return fail("O modelo não foi encontrado. Volte à lista e abra novamente.");
  const auto_activated_at=auto_enabled?(existingTemplate.data?.auto_enabled?existingTemplate.data.auto_activated_at??new Date().toISOString():new Date().toISOString()):null;
  const payload={audience_kind,auto_activated_at,auto_enabled,auto_include_existing:auto_enabled&&auto_include_existing,name,description:description||null,subject,body,kind,interest:interest||null,landing_id:landing_id||null,cta_label,cta_url,active:f.get("active")==="yes",updated_at:new Date().toISOString()};
  const {data:saved,error}=id?await db.from("marketing_email_templates").update(payload).eq("id",id).select("id").maybeSingle():await db.from("marketing_email_templates").insert(payload).select("id").maybeSingle();
  if(error||!saved){console.error("[email-template-save] database write",error??"no row returned");return fail("Não foi possível salvar o modelo no banco. O conteúdo permanece no formulário; tente novamente.");}
  savedId=saved.id;
  revalidatePath("/torre/modelos-email");
  revalidatePath("/torre/modelos-email/editor");
  revalidatePath("/torre/landings");
  if(landing_id)revalidatePath("/torre/landings/editor?id="+landing_id);
 }catch(error){
  console.error("[email-template-save] unexpected",error);
  return fail("Ocorreu uma falha inesperada ao salvar. Seus campos foram mantidos; tente novamente.");
 }
 return {status:"success",message:"Modelo salvo com sucesso.",savedId};
}
export async function saveEmailDraft(f:FormData){
 await requireAdmin();
 const id=value(f,"id",50),subject=value(f,"subject",180),body=value(f,"body",14000),interest=value(f,"interest",120),template_id=value(f,"template_id",50),landing_id=value(f,"landing_id",50);
 if(!subject||!body)redirect("/torre/leads/enviar?erro=campos");
 const payload={subject,body,interest:interest||null,template_id:template_id||null,landing_id:landing_id||null};
 const db=getSupabaseAdmin();
 const {error}=id?await db.from("marketing_email_campaigns").update(payload).eq("id",id).eq("status","draft"):await db.from("marketing_email_campaigns").insert({...payload,status:"draft"});
 if(error)redirect("/torre/leads/enviar?erro=salvar");
 revalidatePath("/torre/leads/enviar");
 redirect("/torre/leads/enviar?salvo=1");
}

export async function deleteEmailDraft(f:FormData){
 await requireAdmin();
 const id=value(f,"id",50);
 if(!/^[0-9a-f-]{36}$/i.test(id))redirect("/torre/leads/enviar?erro=excluir");
 const {error}=await getSupabaseAdmin().from("marketing_email_campaigns").delete().eq("id",id).eq("status","draft");
 if(error)redirect("/torre/leads/enviar?erro=excluir");
 revalidatePath("/torre/leads/enviar");
 redirect("/torre/leads/enviar?excluido=1");
}

/** Exclui somente modelos sem histórico, campanhas ou automatização ativa. */
export async function deleteEmailTemplate(f:FormData){
 await requireAdmin();
 const id=value(f,"id",50);
 const back="/torre/modelos-email";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  redirect(back+"?erro=excluir");
 // Referência fixa dos avisos de Blog: usada pela função SQL de enfileiramento.
 if(id.toLowerCase()==="b10b0000-0000-4000-8000-000000000001")
  redirect(back+"?erro=protegido");
 const db=getSupabaseAdmin();
 const {data:model,error:modelError}=await db.from("marketing_email_templates")
  .select("id,auto_enabled").eq("id",id).maybeSingle();
 if(modelError||!model)redirect(back+"?erro=excluir");
 if(model.auto_enabled)redirect(back+"?erro=automatico");
 // Uma campanha/entrega histórica jamais deve desaparecer com seu modelo.
 const results=await Promise.all([
  db.from("marketing_manual_sends").select("id").eq("template_id",id).limit(1),
  db.from("marketing_email_deliveries").select("id").eq("template_id",id).limit(1),
  db.from("marketing_email_campaigns").select("id").eq("template_id",id).limit(1)
 ]);
 if(results.some(r=>r.error))redirect(back+"?erro=excluir");
 if(results.some(r=>(r.data??[]).length>0))redirect(back+"?erro=vinculado");
 const {data:deleted,error:deleteError}=await db.from("marketing_email_templates")
  .delete().eq("id",id).select("id").maybeSingle();
 if(deleteError||!deleted)redirect(back+"?erro=excluir");
 revalidatePath(back);
 redirect(back+"?excluido=1");
}
