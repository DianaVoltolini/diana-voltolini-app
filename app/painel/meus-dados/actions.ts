"use server";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
export async function saveCustomerDetails(form:FormData){
 const client=await createClient();const {data,error}=await client.auth.getClaims();
 const userId=typeof data?.claims?.sub==="string"?data.claims.sub:null;
 if(error||!userId)return {ok:false,message:"Sua sessão expirou. Entre novamente."};
 const fields=["phone","zip_code","street","number","complement","neighborhood","city","state"] as const;
 const raw=Object.fromEntries(fields.map(key=>[key,String(form.get(key)??"").trim()])) as Record<(typeof fields)[number],string>;
 const phone=raw.phone.replace(/\D/g,""),zip=raw.zip_code.replace(/\D/g,""),state=raw.state.toUpperCase();
 if(phone && !/^\d{10,11}$/.test(phone))return {ok:false,message:"Informe um telefone válido com DDD."};
 if(zip && !/^\d{8}$/.test(zip))return {ok:false,message:"Informe um CEP com 8 dígitos."};
 if(state && !/^[A-Z]{2}$/.test(state))return {ok:false,message:"Informe uma UF válida."};
 if(fields.some(k=>raw[k].length>180))return {ok:false,message:"Um dos campos excede o tamanho permitido."};
 const db=getSupabaseAdmin();
 const {error:saveError}=await db.from("customer_contact_details").upsert({user_id:userId,...raw,phone,zip_code:zip,state,updated_at:new Date().toISOString()},{onConflict:"user_id"});
 if(saveError)return {ok:false,message:"Não foi possível salvar. Confira se a tabela customer_contact_details foi criada no Supabase."};
 revalidatePath("/painel/meus-dados");return {ok:true,message:"Dados atualizados com sucesso."};
}
