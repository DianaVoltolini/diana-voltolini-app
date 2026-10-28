"use server";
import {redirect} from "next/navigation";
import {headers} from "next/headers";
import {createHash} from "node:crypto";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
const safe=(f:FormData,k:string,max=300)=>String(f.get(k)??"").trim().slice(0,max);
export async function saveLanding(f:FormData){
 await requireAdmin();
 const db=getSupabaseAdmin();
 const id=safe(f,"id",60),title=safe(f,"title",160),slug=safe(f,"slug",120).toLowerCase(),summary=safe(f,"summary",1000);
 const eyebrow=safe(f,"eyebrow",100)||"MATERIAL GRATUITO",button_text=safe(f,"button_text",100)||"Receber material gratuito",delivery_title=safe(f,"delivery_title",180)||"Seu material está pronto";
 const status=safe(f,"status",20);
 if(!title||!summary||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||!["draft","published"].includes(status))redirect("/torre/landings?erro=validacao");
 const file=f.get("file");
 let file_path:string|undefined;
 if(file instanceof File&&file.size>0){
  if(file.type!=="application/pdf"||file.size>10*1024*1024)redirect("/torre/landings?erro=pdf");
  const {data:uploaded,error:upError}=await db.storage.from("marketing-deliveries").upload(`${crypto.randomUUID()}.pdf`,await file.arrayBuffer(),{contentType:"application/pdf",upsert:false});
  if(upError||!uploaded)redirect("/torre/landings?erro=upload");
  file_path=uploaded.path;
 }
 const cover=f.get("cover");
 let cover_path:string|undefined;
 if(cover instanceof File&&cover.size>0){
  const types:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf"};
  const extension=types[cover.type];
  if(!extension||cover.size>5*1024*1024)redirect("/torre/landings?erro=capa");
  const {data:uploaded,error:upError}=await db.storage.from("marketing-deliveries").upload("covers/"+crypto.randomUUID()+"."+extension,await cover.arrayBuffer(),{contentType:cover.type,upsert:false});
  if(upError||!uploaded)redirect("/torre/landings?erro=capa");
  cover_path=uploaded.path;
 }
 const removeCover=f.get("remove_cover")==="yes";
 let previousPath:string|null=null;
 if(id){const {data:old}=await db.from("marketing_landings").select("file_path").eq("id",id).maybeSingle();previousPath=old?.file_path??null;}
 if(status==="published"&&!file_path&&!previousPath)redirect("/torre/landings?erro=arquivo");
 const payload={title,slug,summary,eyebrow,button_text,delivery_title,status,campaign_name:safe(f,"campaign_name",120)||null,benefit_1:safe(f,"benefit_1",160)||null,benefit_2:safe(f,"benefit_2",160)||null,benefit_3:safe(f,"benefit_3",160)||null,...(removeCover&&!cover_path?{cover_path:null}:{}),...(cover_path?{cover_path}:{}),updated_at:new Date().toISOString(),...(file_path?{file_path}:{})};
 const {error}=id?await db.from("marketing_landings").update(payload).eq("id",id):await db.from("marketing_landings").insert(payload);
 if(error)redirect("/torre/landings?erro=salvar");
 revalidatePath("/torre/landings");
 revalidatePath("/l/"+slug);
 redirect("/torre/landings?salvo=1");
}
export async function captureLead(f:FormData){
 const slug=safe(f,"slug",120),name=safe(f,"name",120),email=safe(f,"email",254).toLowerCase(),interest=safe(f,"interest",90);
 if(safe(f,"website"))redirect("/l/"+slug+"?erro=validacao");
 if(!name||!/^\S+@\S+\.\S+$/.test(email)||!interest||f.get("privacy_acknowledged")!=="yes")redirect("/l/"+slug+"?erro=validacao");
 const db=getSupabaseAdmin();
 const {data:landing}=await db.from("marketing_landings").select("id,status,file_path").eq("slug",slug).eq("status","published").maybeSingle();
 if(!landing?.file_path)redirect("/l/"+slug+"?erro=indisponivel");
 const h=await headers();
 const forwarded=h.get("x-forwarded-for")?.split(",")[0]?.trim();
 const ip=forwarded||h.get("x-real-ip")||"unknown";
 const digest=(value:string)=>createHash("sha256").update(value).digest("hex");
 const keys=[
  {key:"ip:"+digest(ip),max:5},
  {key:"email:"+digest(landing.id+":"+email),max:3}
 ];
 for(const item of keys){
  const {data:allowed,error:limitError}=await db.rpc("consume_marketing_submission_limit",{p_key:item.key,p_max:item.max,p_window_seconds:900});
  if(limitError||allowed!==true)redirect("/l/"+slug+"?erro=limite");
 }
 const newsletter_opt_in=f.get("newsletter")==="yes";
 const {data:existing}=await db.from("marketing_leads").select("id,delivery_token,newsletter_opt_in,newsletter_consented_at").eq("landing_id",landing.id).eq("email",email).maybeSingle();
 const now=new Date().toISOString();
 let token=existing?.delivery_token as string|undefined;
 if(existing){
  const {error}=await db.from("marketing_leads").update({name,interest,privacy_acknowledged_at:now,newsletter_opt_in:Boolean(existing.newsletter_opt_in||newsletter_opt_in),newsletter_consented_at:existing.newsletter_consented_at||(newsletter_opt_in?now:null)}).eq("id",existing.id);
  if(error)redirect("/l/"+slug+"?erro=salvar");
 }else{
  const {data:inserted,error}=await db.from("marketing_leads").insert({landing_id:landing.id,name,email,interest,newsletter_opt_in,newsletter_consented_at:newsletter_opt_in?now:null,privacy_acknowledged_at:now}).select("delivery_token").single();
  if(error||!inserted)redirect("/l/"+slug+"?erro=salvar");
  token=inserted.delivery_token;
 }
 redirect("/l/"+slug+"/obrigado?token="+encodeURIComponent(token!));
}
