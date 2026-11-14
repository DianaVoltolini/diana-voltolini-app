// app/torre/comercio-v2/materiais/tipos/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const base="/torre/comercio-v2/materiais/tipos";
function go(key:string,value:string):never{
  redirect(base+"?"+new URLSearchParams({[key]:value}).toString());
}
export async function saveMaterialType(form:FormData){
  await requireAdmin();
  const code=String(form.get("code")??"").trim().toLowerCase();
  const name=String(form.get("name")??"").trim();
  const isActive=form.get("is_active")==="yes";
  const edit=form.get("edit")==="yes";
  if(!/^[a-z][a-z0-9_]{1,29}$/.test(code)||name.length<2||name.length>80)go("erro","validacao");
  const db=getSupabaseAdmin();
  if(edit){
    const {error}=await db.from("commerce_v2_material_types").update({
      name,is_active:isActive,updated_at:new Date().toISOString(),
    }).eq("code",code);
    if(error){console.error("[commerce-v2-material-types] edit",error.code);go("erro","salvar");}
  }else{
    const {error}=await db.from("commerce_v2_material_types").insert({code,name,is_active:isActive});
    if(error){console.error("[commerce-v2-material-types] create",error.code);
      go("erro",error.code==="23505"?"duplicado":"salvar");}
  }
  revalidatePath(base);
  revalidatePath("/torre/comercio-v2/materiais");
  revalidatePath("/torre/comercio-v2/materiais/novo");
  go("salvo","1");
}
