// app/painel/encontro-online/page.tsx
import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {ebookAccessActive,ebookAccessDateLabel,ebookAccessUntil} from "@/lib/ebooks/access";
import {confirmEncounterAttendance} from "./actions";
import styles from "../outros-produtos/page.module.css";

export const metadata:Metadata={title:"Meus Encontros Online | Diana Voltolini",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
type Props={searchParams:Promise<{salvo?:string;erro?:string}>};
type Product={id:string;code:string;name:string;checkout_description:string|null};
type PaidOrder={id:string;product_id:string;customer_name:string;paid_at:string;created_at:string};

const knownEncounterCode="ENC-RT-2027-001";
const materials=[
  "Apresentação em PDF",
  "Exercícios e documentos fiscais simulados",
  "Planilha de simulação",
  "Checklists operacionais",
];

export default async function EncounterPage({searchParams}:Props){
  const auth=await createClient();
  const {data:verified,error:authError}=await auth.auth.getUser();
  if(authError||!verified.user?.id) redirect("/login?retorno=%2Fpainel%2Fencontro-online");
  const uid=verified.user.id;
  const db=getSupabaseAdmin();
  const {data:products,error:productError}=await db.from("products")
    .select("id,code,name,checkout_description").like("code","ENC-%");
  if(productError) throw new Error("Não foi possível consultar o catálogo de encontros.");
  const catalog=(products??[]) as Product[];
  const ids=catalog.map(p=>p.id);
  const {data:orders,error:ordersError}=ids.length
    ? await db.from("orders")
        .select("id,product_id,customer_name,paid_at,created_at")
        .eq("user_id",uid).in("product_id",ids)
        .eq("status","paid").not("paid_at","is",null)
        .order("paid_at",{ascending:false}).limit(100)
    : {data:[] as PaidOrder[],error:null};
  if(ordersError) throw new Error("Não foi possível consultar suas inscrições.");
  const purchases=(orders??[]) as PaidOrder[];
  const confirmationResult= purchases.length
    ? await db.from("encounter_attendance_confirmations")
       .select("order_id,attendee_name,attendance_status,terms_acknowledged_at,reminder_opt_in")
       .eq("user_id",uid).in("order_id",purchases.map(o=>o.id))
    : {data:[],error:null};
  if(confirmationResult.error) throw new Error("Não foi possível consultar suas confirmações.");
  const confirmations=new Map((confirmationResult.data??[]).map(row=>[row.order_id,row]));
  const search=await searchParams;
  const inputStyle={width:"100%",maxWidth:520,padding:"12px 14px",border:"1px solid #cbd5df",borderRadius:7,fontSize:15};

  return <main className={styles.page}><div className={styles.container}>
    <header className={styles.intro}>
      <p>MINHAS COMPRAS · ENCONTROS ONLINE</p>
      <h1>Meus Encontros Online</h1>
      <span>Suas inscrições, materiais e orientações, organizados por encontro.</span>
    </header>
    {!purchases.length && <section className={styles.card} style={{marginTop:25,minHeight:0}}>
      <h2 style={{minHeight:0}}>Você ainda não possui encontros confirmados</h2>
      <p>Quando a confirmação do pagamento estiver registrada, sua inscrição aparecerá aqui.</p>
      <Link className={styles.cta} href="/painel/outros-produtos">Conhecer os encontros →</Link>
    </section>}
    {purchases.map(order=>{
      const product=catalog.find(item=>item.id===order.product_id);
      if(!product)return null;
      const isFirstEncounter=product.code===knownEncounterCode;
      const expiresAt=ebookAccessUntil([order]);
      const inAccessPeriod=ebookAccessActive(expiresAt);
      const confirmation=confirmations.get(order.id);
      const confirmed=Boolean(confirmation?.terms_acknowledged_at);
      return <section className={styles.card} key={order.id}
        style={{marginTop:24,minHeight:0,maxWidth:1100,gap:0}}>
        <div className={styles.cardHeading}>
          <span>ENCONTRO ONLINE · INSCRIÇÃO CONFIRMADA</span>
          <span className={styles.acquired}>✓ Pagamento confirmado</span>
        </div>
        <h2 style={{minHeight:0,marginBottom:12}}>
          {isFirstEncounter?"Reforma Tributária na Prática: Compras e Faturamento em 2027":product.name}
        </h2>
        {isFirstEncounter?
          <p><strong>21/01/2027, das 19h30 às 21h</strong>, horário de Brasília, pelo Google Meet.
          O link de participação será enviado nas orientações próximas ao encontro.</p>:
          <p>{product.checkout_description??"Os detalhes e orientações deste encontro serão comunicados pela organização."}</p>}
        <p>O acesso aos materiais desta compra termina em{" "}
          <strong>{expiresAt?ebookAccessDateLabel(expiresAt):"data indisponível"}</strong>.
          Os materiais disponibilizados posteriormente compartilham essa mesma data final.</p>

        {isFirstEncounter&&<div style={{borderTop:"1px solid #e8e0d4",paddingTop:22,marginTop:6,width:"100%"}}>
          <span className={styles.cardLabel}>MATERIAIS DESTE ENCONTRO</span>
          <h3 style={{font:"600 23px Georgia,serif",margin:"14px 0",color:"#102033"}}>Materiais incluídos</h3>
          <div style={{border:"1px solid #e5ded0",borderRadius:9,padding:18,marginBottom:14}}>
            <strong>E-book IBS e CBS na Prática</strong>
            <p style={{margin:"8px 0 14px"}}>Disponível após a confirmação do pagamento, com atualizações durante o prazo de acesso.</p>
            {inAccessPeriod?
              <a className={styles.cta} href="/api/ebooks/ibs-cbs-na-pratica/download?origem=encontro">Baixar e-book (PDF) ↓</a>:
              <p style={{fontWeight:750}}>Período de download encerrado.</p>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}>
            {materials.map(name=><div key={name} style={{border:"1px solid #e5ded0",borderRadius:9,padding:16,background:"#fbf9f4"}}>
              <strong>{name}</strong>
              <p style={{margin:"8px 0 0",fontSize:13}}>Disponibilização prevista para janeiro de 2027.</p>
            </div>)}
          </div>
        </div>}

        <div style={{borderTop:"1px solid #e8e0d4",paddingTop:23,marginTop:23,width:"100%"}}>
          <span className={styles.cardLabel}>ORIENTAÇÕES E LEMBRETES</span>
          <h3 style={{font:"600 24px Georgia,serif",margin:"14px 0",color:"#102033"}}>Confirmação das informações do encontro</h3>
          <p>Sua inscrição já está garantida pelo pagamento. Confirme que tomou conhecimento da data e das condições de participação. Não é necessário responder novamente para manter a inscrição.</p>
          <p>O encontro será realizado ao vivo e <strong>não está prevista reposição individual ou disponibilização de gravação</strong>.
            A ausência não gera, por si só, reembolso automático, sem prejuízo do direito de arrependimento e dos demais direitos previstos na legislação aplicável.</p>
          {search.salvo==="1"&&<p role="status" style={{color:"#167241",fontWeight:800}}>Informações registradas com sucesso.</p>}
          {search.erro&&<p role="alert" style={{color:"#a42c2c",fontWeight:800}}>Confira os campos obrigatórios e tente novamente.</p>}
          {confirmed&&<p style={{color:"#167241",fontWeight:750}}>Ciência das condições registrada. {confirmation?.reminder_opt_in?"Você autorizou o envio de lembretes por e-mail.":"Você não selecionou lembretes por e-mail."}</p>}
          <form action={confirmEncounterAttendance} style={{display:"grid",gap:14,width:"100%",maxWidth:680}}>
            <input type="hidden" name="orderId" value={order.id}/>
            <label htmlFor={`attendee-${order.id}`} style={{fontWeight:750}}>Nome completo do participante</label>
            <input id={`attendee-${order.id}`} name="attendeeName" autoComplete="name" required
              minLength={3} maxLength={150} defaultValue={confirmation?.attendee_name||order.customer_name||""} style={inputStyle}/>
            <label style={{display:"flex",gap:10,alignItems:"flex-start",lineHeight:1.5}}>
              <input type="checkbox" name="termsAcknowledged" value="yes" required defaultChecked={confirmed} style={{marginTop:5}}/>
              <span>Li e estou ciente da data, do horário e das condições de realização do encontro ao vivo.</span>
            </label>
            <label style={{display:"flex",gap:10,alignItems:"flex-start",lineHeight:1.5}}>
              <input type="checkbox" name="reminderOptIn" value="yes" defaultChecked={confirmation?.reminder_opt_in===true} style={{marginTop:5}}/>
              <span>Desejo receber um lembrete sobre este encontro no e-mail cadastrado, próximo à data do evento.</span>
            </label>
            <button type="submit" className={styles.cta} style={{border:0,cursor:"pointer",justifySelf:"start"}}>Salvar minhas preferências</button>
          </form>
        </div>
      </section>;
    })}
  </div></main>;
}
