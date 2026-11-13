// app/painel/encontro-online/page.tsx
import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {ENCOUNTER_PRODUCT_CODE,getEbookPurchaseAccess} from "@/lib/ebooks/purchase-access";
import {ebookAccessDateLabel} from "@/lib/ebooks/access";
import {confirmEncounterAttendance} from "./actions";
import styles from "../outros-produtos/page.module.css";

export const metadata:Metadata={title:"Meu Encontro Online | Diana Voltolini",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
type Props={searchParams:Promise<{salvo?:string;erro?:string}>};

export default async function EncounterPage({searchParams}:Props){
  const auth=await createClient();
  const {data:verified,error:authError}=await auth.auth.getUser();
  if(authError||!verified.user?.id) redirect("/login?retorno=%2Fpainel%2Fencontro-online");
  const uid=verified.user.id;
  const db=getSupabaseAdmin();
  const {data:product,error:productError}=await db.from("products").select("id")
    .eq("code",ENCOUNTER_PRODUCT_CODE).maybeSingle();
  if(productError) throw new Error("Não foi possível localizar seu encontro.");
  const {data:orders,error:ordersError}=await db.from("orders")
    .select("id,customer_name,paid_at").eq("user_id",uid).eq("product_id",product?.id??"00000000-0000-0000-0000-000000000000")
    .eq("status","paid").not("paid_at","is",null).order("paid_at",{ascending:false}).limit(1);
  if(ordersError) throw new Error("Não foi possível consultar sua inscrição.");
  const order=orders?.[0];
  if(!order) return <main className={styles.page}><div className={styles.container}>
    <header className={styles.intro}><p>MEUS ENCONTROS</p><h1>Encontro Online</h1><span>Não encontramos uma inscrição paga nesta conta.</span></header>
    <Link className={styles.cta} href="/painel/outros-produtos">Conhecer o encontro →</Link>
  </div></main>;
  const [{data:confirmation,error:confirmationError},access,search]=await Promise.all([
    db.from("encounter_attendance_confirmations").select("attendee_name,attendance_status,updated_at").eq("order_id",order.id).eq("user_id",uid).maybeSingle(),
    getEbookPurchaseAccess(uid),
    searchParams,
  ]);
  if(confirmationError) throw new Error("Não foi possível consultar sua confirmação de presença.");
  const inputStyle={width:"100%",maxWidth:520,padding:"12px 14px",border:"1px solid #cbd5df",borderRadius:7,fontSize:15};
  return <main className={styles.page}><div className={styles.container}>
    <header className={styles.intro}><p>MINHAS COMPRAS · ENCONTRO ONLINE</p><h1>Reforma Tributária na Prática</h1><span>Compras e Faturamento em 2027</span></header>
    <section className={styles.card} style={{marginTop:25,minHeight:0,maxWidth:850}}>
      <span className={styles.acquired}>✓ Inscrição confirmada · pagamento recebido</span>
      <h2 style={{minHeight:0}}>Encontro Online — 21/01/2027</h2>
      <p>Das 19h30 às 21h (horário de Brasília), pelo Google Meet. As orientações para participar serão enviadas separadamente.</p>
      <p>O acesso a todos os materiais termina em <strong>{access.expiresAt?ebookAccessDateLabel(access.expiresAt):"data indisponível"}</strong>. O e-book já está disponível; apresentação, exercícios, planilha e checklists serão disponibilizados em janeiro. Todos compartilham a mesma data final de acesso.</p>
      <Link className={styles.cta} href="/painel/ebooks">Acessar e-book incluído →</Link>
    </section>
    <section className={styles.card} style={{marginTop:20,minHeight:0,maxWidth:850}}>
      <span className={styles.cardLabel}>CONFIRMAÇÃO DE PRESENÇA</span>
      <h2 style={{minHeight:0}}>Você participará do encontro?</h2>
      <p>Preencha seus dados para confirmar sua presença no encontro ao vivo. Você poderá atualizar sua resposta nesta página.</p>
      {search.salvo==="1"&&<p role="status" style={{color:"#167241",fontWeight:800}}>Sua resposta foi registrada com sucesso.</p>}
      {search.erro&&<p role="alert" style={{color:"#a42c2c",fontWeight:800}}>Não foi possível salvar sua resposta. Confira os dados e tente novamente.</p>}
      {confirmation&&<p><strong>Resposta registrada:</strong> {confirmation.attendance_status==="confirmed"?"Sim, participarei":"Não poderei participar"}.</p>}
      <form action={confirmEncounterAttendance} style={{display:"grid",gap:16,width:"100%",maxWidth:550}}>
        <input type="hidden" name="orderId" value={order.id}/>
        <div style={{display:"grid",gap:7}}>
          <label htmlFor="attendeeName" style={{fontWeight:750}}>Nome completo</label>
          <input id="attendeeName" name="attendeeName" autoComplete="name" required minLength={3} maxLength={150}
            defaultValue={confirmation?.attendee_name||order.customer_name||""} style={inputStyle}/>
        </div>
        <fieldset style={{border:"1px solid #e5ded0",borderRadius:8,padding:15,display:"grid",gap:12}}>
          <legend style={{fontWeight:750}}>Presença no encontro</legend>
          <label><input type="radio" name="attendance" value="confirmed" defaultChecked={confirmation?.attendance_status==="confirmed"} required/> Sim, confirmo minha presença</label>
          <label><input type="radio" name="attendance" value="not_attending" defaultChecked={confirmation?.attendance_status==="not_attending"}/> Não poderei participar</label>
        </fieldset>
        <button type="submit" className={styles.cta} style={{border:0,cursor:"pointer",justifySelf:"start"}}>Salvar minha resposta</button>
      </form>
    </section>
  </div></main>;
}
