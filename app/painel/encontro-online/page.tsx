// app/painel/encontro-online/page.tsx
import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {ebookAccessActive,ebookAccessDateLabel,ebookAccessUntil} from "@/lib/ebooks/access";
import {confirmEncounterAttendance} from "./actions";
import {getStudentMaterialsForOrder} from "@/lib/commerce-v2/student-delivery";
import ProductPage from "../product-page";
import styles from "./encounter-page.module.css";

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
  const {data:availableMaterials,error:materialsError}=purchases.length
    ? await db.from("encounter_materials").select("id,product_id,title,display_order")
      .in("product_id",ids).eq("active",true)
      .lte("published_at",new Date().toISOString())
      .order("display_order",{ascending:true})
    : {data:[],error:null};
  if(materialsError) throw new Error("Não foi possível consultar os materiais do encontro.");
  const studentMaterialsByOrder=new Map(await Promise.all(purchases.map(async order=>
    [order.id,await getStudentMaterialsForOrder(order)] as const
  )));
  const search=await searchParams;

  return <ProductPage title="Meus Encontros Online" description="Suas inscrições, materiais e orientações, organizados por encontro.">
    <div className={styles.stack}>
    {!purchases.length && <section className={styles.encounterCard}>
      <h2 className={styles.productTitle}>Você ainda não possui encontros confirmados</h2>
      <p>Quando a confirmação do pagamento estiver registrada, sua inscrição aparecerá aqui.</p>
      <Link className={styles.primaryButton} href="/painel/outros-produtos">Conhecer os encontros →</Link>
    </section>}
    {purchases.map(order=>{
      const product=catalog.find(item=>item.id===order.product_id);
      if(!product)return null;
      const isFirstEncounter=product.code===knownEncounterCode;
      const expiresAt=ebookAccessUntil([order]);
      const inAccessPeriod=ebookAccessActive(expiresAt);
      const confirmation=confirmations.get(order.id);
      const publishedMaterials=(availableMaterials??[]).filter(item=>item.product_id===order.product_id);
      const studentMaterials=studentMaterialsByOrder.get(order.id)??[];
      const v2EbookReady=studentMaterials.some(item=>item.category==="ebook" && item.isReleased);
      const confirmed=Boolean(confirmation?.terms_acknowledged_at);
      return <section className={styles.encounterCard} key={order.id}>
        <div className={styles.cardHeading}>
          <span>ENCONTRO ONLINE · INSCRIÇÃO CONFIRMADA</span>
          <span className={styles.paidBadge}>✓ Pagamento confirmado</span>
        </div>
        <h2 className={styles.productTitle}>
          {isFirstEncounter?"Reforma Tributária na Prática: Compras e Faturamento em 2027":product.name}
        </h2>
        {isFirstEncounter?
          <p className={styles.lead}><strong>21/01/2027, das 19h30 às 21h</strong>, horário de Brasília, pelo Google Meet.
          O link de participação será enviado nas orientações próximas ao encontro.</p>:
          <p className={styles.lead}>{product.checkout_description??"Os detalhes e orientações deste encontro serão comunicados pela organização."}</p>}
        <p className={styles.expires}>O acesso aos materiais desta compra termina em{" "}
          <strong>{expiresAt?ebookAccessDateLabel(expiresAt):"data indisponível"}</strong>.
          Os materiais disponibilizados posteriormente compartilham essa mesma data final.</p>

        <div className={styles.sectionBlock}>
          <span className={styles.sectionEyebrow}>MATERIAIS DESTE ENCONTRO</span>
          <h3 className={styles.sectionTitle}>Materiais incluídos</h3>
          {isFirstEncounter&&!v2EbookReady&&<div className={styles.materialItem}>
            <strong>E-book IBS e CBS na Prática</strong>
            <p>Disponível após a confirmação do pagamento, com atualizações durante o prazo de acesso.</p>
            {inAccessPeriod?
              <a className={styles.primaryButton} href="/api/ebooks/ibs-cbs-na-pratica/download?origem=encontro">Baixar e-book (PDF) ↓</a>:
              <p style={{fontWeight:750}}>Período de download encerrado.</p>}
          </div>}
          {studentMaterials.length>0&&<div className={styles.materialList} aria-label="Materiais da Biblioteca">
            {studentMaterials.map(item=><div key={item.id} className={styles.materialItem}>
              <strong>{item.title}</strong>
              {item.isReleased?
                <a className={styles.primaryButton}
                  href={`/api/commerce-v2/materials/${item.id}/download?pedido=${order.id}`}>
                  Baixar material ↓
                </a>:<p>{!inAccessPeriod?"Prazo de acesso encerrado.":
                  item.releaseDate?"Disponível a partir de "+item.releaseDate.split("-").reverse().join("/"):"Aguardando liberação."}</p>}
            </div>)}
          </div>}
          {publishedMaterials.length>0&&<div className={styles.materialList}>
            {publishedMaterials.map(material=><div key={material.id}
              className={styles.materialItem}>
              <strong>{material.title}</strong>
              {inAccessPeriod?
                <a className={styles.primaryButton}
                  href={`/api/encounters/materials/${material.id}/download?pedido=${order.id}`}>
                  Baixar material ↓
                </a>:
                <p style={{marginTop:9}}>Prazo de download encerrado.</p>}
            </div>)}
          </div>}
          {isFirstEncounter&&publishedMaterials.length===0&&studentMaterials.length===0&&<div className={styles.materialGrid}>
            {materials.map(name=><div key={name} className={styles.materialItem}>
              <strong>{name}</strong>
              <p>Disponibilização prevista para janeiro de 2027.</p>
            </div>)}
          </div>}
        </div>

        <div className={styles.sectionBlock}>
          <span className={styles.sectionEyebrow}>ORIENTAÇÕES E LEMBRETES</span>
          <h3 className={styles.sectionTitle}>Confirmação das informações do encontro</h3>
          <p>Sua inscrição já está garantida pelo pagamento. Confirme que tomou conhecimento da data e das condições de participação. Não é necessário responder novamente para manter a inscrição.</p>
          <p>O encontro será realizado ao vivo e <strong>não está prevista reposição individual ou disponibilização de gravação</strong>.
            A ausência não gera, por si só, reembolso automático, sem prejuízo do direito de arrependimento e dos demais direitos previstos na legislação aplicável.</p>
          {search.salvo==="1"&&<p role="status" className={styles.successText}>Informações registradas com sucesso.</p>}
          {search.erro&&<p role="alert" className={styles.errorText}>Confira os campos obrigatórios e tente novamente.</p>}
          {confirmed&&<p className={styles.successText}>Ciência das condições registrada. {confirmation?.reminder_opt_in?"Você autorizou o envio de lembretes por e-mail.":"Você não selecionou lembretes por e-mail."}</p>}
          <form action={confirmEncounterAttendance} className={styles.preferencesForm}>
            <input type="hidden" name="orderId" value={order.id}/>
            <label htmlFor={`attendee-${order.id}`} className={styles.inputLabel}>Nome completo do participante</label>
            <input id={`attendee-${order.id}`} name="attendeeName" autoComplete="name" required
              minLength={3} maxLength={150} defaultValue={confirmation?.attendee_name||order.customer_name||""} className={styles.textInput}/>
            <label className={styles.checkLabel}>
              <input type="checkbox" name="termsAcknowledged" value="yes" required defaultChecked={confirmed} />
              <span>Li e estou ciente da data, do horário e das condições de realização do encontro ao vivo.</span>
            </label>
            <label className={styles.checkLabel}>
              <input type="checkbox" name="reminderOptIn" value="yes" defaultChecked={confirmation?.reminder_opt_in===true} />
              <span>Desejo receber um lembrete sobre este encontro no e-mail cadastrado, próximo à data do evento.</span>
            </label>
            <button type="submit" className={styles.primaryButton}>Salvar minhas preferências</button>
          </form>
        </div>
      </section>;
    })}
    </div>
  </ProductPage>;
}
