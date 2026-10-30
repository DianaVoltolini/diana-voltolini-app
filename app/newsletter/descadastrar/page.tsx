// app/newsletter/descadastrar/page.tsx
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {redirect} from "next/navigation";
async function unsubscribe(form:FormData){
 "use server";
 const token=String(form.get("token")??"");
 if(!/^[0-9a-f-]{36}$/i.test(token))redirect("/newsletter/descadastrar?erro=1");
 const db=getSupabaseAdmin();
 const {data,error}=await db.from("marketing_email_deliveries").select("email").eq("unsubscribe_token",token).maybeSingle();
 if(error||!data)redirect("/newsletter/descadastrar?erro=1");
 const {error:saveError}=await db.from("marketing_email_unsubscribes").upsert({email:data.email},{onConflict:"email"});
 if(saveError)redirect("/newsletter/descadastrar?erro=1");
 redirect("/newsletter/descadastrar?sucesso=1");
}
export default async function UnsubscribePage({searchParams}:{searchParams:Promise<{token?:string;sucesso?:string;erro?:string}>}){
 const params=await searchParams;
 return <main style={{maxWidth:560,margin:"70px auto",padding:30,fontFamily:"Arial,sans-serif",color:"#102033"}}>
 <h1>Newsletter Fiscal</h1>
 {params.sucesso?<p>Seu descadastro foi registrado. Você não receberá novas campanhas da Newsletter Fiscal.</p>:params.erro?<p>Não foi possível confirmar o descadastro. Entre em contato pelo site.</p>:<><p>Deseja deixar de receber conteúdos e novidades da Newsletter Fiscal?</p><form action={unsubscribe}><input type="hidden" name="token" value={params.token??""}/><button type="submit" style={{background:"#c9a227",border:0,borderRadius:7,padding:"13px 20px",fontWeight:700}}>Confirmar descadastro</button></form></>}
 <p><a href="https://dianavoltolini.com.br">Visitar o site</a></p>
 </main>;
}
