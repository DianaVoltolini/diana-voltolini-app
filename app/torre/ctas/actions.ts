"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

const base="/torre/ctas";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const read=(form:FormData,key:string,max:number)=>String(form.get(key)??"").trim().slice(0,max);
function validUrl(value:string){
 try{
  if(!value.startsWith("https://")&&!/^\/(?!\/)/.test(value))return false;
  const parsed=new URL(value,"https://dianavoltolini.com.br");
  return parsed.protocol==="https:"&&["dianavoltolini.com.br","app.dianavoltolini.com.br"].includes(parsed.hostname);
 }catch{return false;}
}
export async function saveFiscalCta(form:FormData){
 await requireAdmin();
 const id=read(form,"id",40);
 const name=read(form,"name",120),title=read(form,"title",180);
 const description=read(form,"description",600);
 const button_label=read(form,"button_label",80),url=read(form,"url",500);
 const active=form.get("active")==="yes";
 if((id&&!uuid.test(id))||name.length<2||!title||!description||!button_label||!validUrl(url))redirect(base+"?erro=dados");
 const db=getSupabaseAdmin();
 const payload={name,title,description,button_label,url,active,updated_at:new Date().toISOString()};
 const {error}=id?await db.from("fiscal_ctas").update(payload).eq("id",id):await db.from("fiscal_ctas").insert(payload);
 if(error){console.error("[fiscal_ctas] save",{code:error.code,message:error.message});redirect(base+"?erro=salvar");}
 revalidatePath(base);revalidatePath("/torre/conteudos/editor");revalidatePath("/blog","layout");
 redirect(base+"?salvo=1");
}
export async function deleteFiscalCta(form:FormData){
 await requireAdmin();
 const id=read(form,"id",40);
 if(!uuid.test(id))redirect(base+"?erro=dados");
 const db=getSupabaseAdmin();
 const {count,error:usedError}=await db.from("fiscal_articles").select("*",{head:true,count:"exact"}).eq("cta_id",id);
 if(usedError)redirect(base+"?erro=salvar");
 if((count??0)>0)redirect(base+"?erro=emuso");
 const {error}=await db.from("fiscal_ctas").delete().eq("id",id);
 if(error)redirect(base+"?erro=salvar");
 revalidatePath(base);revalidatePath("/torre/conteudos/editor");
 redirect(base+"?excluido=1");
}
