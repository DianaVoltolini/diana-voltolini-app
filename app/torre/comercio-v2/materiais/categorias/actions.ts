// app/torre/comercio-v2/materiais/categorias/actions.ts
"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
const base="/torre/comercio-v2/materiais/categorias";
function go(key:string,value:string):never{
 redirect(base+"?"+new URLSearchParams({[key]:value}).toString());
}
function slug(name:string){
 const code=name.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")
  .slice(0,40).replace(/_+$/g,"");
 return /^[a-z][a-z0-9_]{1,39}$/.test(code)?code:"";
}
export async function saveMaterialSubject(form:FormData){
 await requireAdmin();
 const name=String(form.get("name")??"").trim();
 if(name.length<2||name.length>80)go("erro","validacao");
 const edit=form.get("edit")==="yes";
 const db=getSupabaseAdmin();
 const {data:matches,error:lookupError}=await db.from("commerce_v2_material_subjects")
  .select("code,name").ilike("name",name).limit(50);
 if(lookupError)go("erro","salvar");
 const oldCode=String(form.get("code")??"");
 if(edit&&!/^[a-z][a-z0-9_]{1,39}$/.test(oldCode))go("erro","validacao");
 const code=edit?oldCode:slug(name);
 if(!code)go("erro","validacao");
 if((matches??[]).some(s=>s.code!==code&&s.name.toLocaleLowerCase("pt-BR")===name.toLocaleLowerCase("pt-BR")))
  go("erro","duplicado");
 if(edit){
  const {data,error}=await db.from("commerce_v2_material_subjects")
   .update({name,updated_at:new Date().toISOString()}).eq("code",code).select("code").maybeSingle();
  if(error||!data)go("erro","salvar");
 }else{
  const {error}=await db.from("commerce_v2_material_subjects")
   .insert({code,name,is_active:true});
  if(error)go("erro",error.code==="23505"?"duplicado":"salvar");
 }
 revalidatePath(base);
 revalidatePath("/torre/comercio-v2/materiais/novo");
 revalidatePath("/torre/comercio-v2/materiais");
 go("salvo","1");
}
