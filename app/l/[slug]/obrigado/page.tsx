import {notFound} from "next/navigation";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import Link from "next/link";
export const dynamic="force-dynamic";
export default async function Thanks({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{token?:string}>}){
 const {slug}=await params,{token}=await searchParams;
 if(!token||!/^[0-9a-f-]{36}$/i.test(token))notFound();
 const db=getSupabaseAdmin();
 const {data:landing}=await db.from("marketing_landings").select("id,title,delivery_title,file_path").eq("slug",slug).eq("status","published").maybeSingle();
 if(!landing?.file_path)notFound();
 const {data:lead}=await db.from("marketing_leads").select("id").eq("landing_id",landing.id).eq("delivery_token",token).maybeSingle();
 if(!lead)notFound();
 const {data:signed,error}=await db.storage.from("marketing-deliveries").createSignedUrl(landing.file_path,600);
 if(error||!signed?.signedUrl)throw new Error("Não foi possível disponibilizar o material.");
 return <main style={{minHeight:"100dvh",display:"grid",placeItems:"center",background:"#faf8f3",padding:24}}><section style={{background:"#fff",maxWidth:630,padding:36,border:"1px solid #e2e7ed",borderTop:"4px solid #c9a227",borderRadius:14}}><p style={{color:"#a47e16",fontWeight:850,fontSize:12}}>CADASTRO CONFIRMADO</p><h1 style={{font:"700 38px Georgia,serif",color:"#102033"}}>{landing.delivery_title}</h1><p>Seu cadastro foi registrado. O material está disponível no botão abaixo.</p><a href={signed.signedUrl} target="_blank" rel="noreferrer" style={{display:"inline-block",padding:16,background:"#c9a227",borderRadius:8,color:"#102033",fontWeight:800,textDecoration:"none"}}>Abrir PDF gratuito →</a><p style={{color:"#66788a",fontSize:12}}>O link de acesso tem validade de 10 minutos. Caso expire, retorne à landing e informe novamente seu e-mail.</p><Link href="https://dianavoltolini.com.br" style={{fontSize:13}}>Visitar o site</Link></section></main>
}
