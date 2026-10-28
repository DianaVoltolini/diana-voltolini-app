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
 const {data:lead}=await db.from("marketing_leads").select("id,newsletter_opt_in").eq("landing_id",landing.id).eq("delivery_token",token).maybeSingle();
 if(!lead)notFound();
 const {data:signed,error}=await db.storage.from("marketing-deliveries").createSignedUrl(landing.file_path,600);
 if(error||!signed?.signedUrl)throw new Error("Não foi possível disponibilizar o material.");
 return <main style={{minHeight:"100dvh",display:"grid",placeItems:"center",background:"#faf8f3",padding:24}}>
  <section style={{width:"100%",maxWidth:680,background:"#fff",padding:"clamp(24px,5vw,44px)",border:"1px solid #e2e7ed",borderTop:"4px solid #c9a227",borderRadius:14,display:"grid",gap:16}}>
   <p style={{margin:0,color:"#a47e16",fontWeight:850,fontSize:12,letterSpacing:".08em"}}>MATERIAL GRATUITO DISPONÍVEL</p>
   <h1 style={{font:"700 clamp(30px,5vw,42px)/1.15 Georgia,serif",color:"#102033",margin:0}}>{landing.delivery_title}</h1>
   <p style={{margin:0,color:"#40546a",lineHeight:1.7,fontSize:16}}>Obrigada pelo seu interesse! Espero que este material ajude você a compreender melhor as mudanças fiscais e aplicá-las na sua rotina.</p>
   <p style={{margin:0,color:"#40546a",lineHeight:1.6}}>Clique no botão abaixo para baixar seu material gratuito.</p>
   <a href={signed.signedUrl} target="_blank" rel="noreferrer" style={{justifySelf:"start",display:"inline-block",padding:"16px 22px",background:"#c9a227",borderRadius:8,color:"#102033",fontWeight:800,textDecoration:"none"}}>Baixar meu material gratuito ↓</a>
   {lead.newsletter_opt_in&&<p style={{margin:0,color:"#40546a",lineHeight:1.6,fontSize:14}}>Seu e-mail também foi incluído na lista de inscritos da Newsletter Fiscal Diana Voltolini. Você poderá cancelar sua inscrição quando os envios começarem.</p>}
   <p style={{margin:0,color:"#66788a",fontSize:12,lineHeight:1.6}}>O link de download é válido por 10 minutos. Se expirar, volte à página do material e informe novamente seu e-mail.</p>
   <Link href="https://dianavoltolini.com.br" style={{fontSize:13,color:"#876713"}}>Visitar o site Diana Voltolini</Link>
  </section>
 </main>;
}
