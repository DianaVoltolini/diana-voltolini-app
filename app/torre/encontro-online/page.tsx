import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import styles from "../painel.module.css";

export const metadata:Metadata={title:"Encontro Online | Torre de Controle"};
export const dynamic="force-dynamic";
const CODE="ENC-RT-2027-001";
const money=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
const date=(value:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short"}).format(new Date(value));
const label:Record<string,string>={paid:"Pago",pending:"Aguardando pagamento",cancelled:"Cancelado"};

export default async function EncontroOnlineTorre(){
 await requireAdmin();
 const db=getSupabaseAdmin();
 const {data:product,error:productError}=await db.from("products")
  .select("id,name,code,price_cents,currency,active,checkout_enabled")
  .eq("code",CODE).maybeSingle();
 const {data:orders,error:ordersError}=product?.id
  ?await db.from("orders").select("id,customer_name,customer_email,amount_cents,status,created_at")
    .eq("product_id",product.id).order("created_at",{ascending:false}).limit(200)
  :{data:[],error:null};
 const rows=orders??[];
 const paid=rows.filter(x=>x.status==="paid").length;
 const pending=rows.filter(x=>x.status==="pending").length;
 const paidAmount=rows.filter(x=>x.status==="paid").reduce((total,x)=>total+x.amount_cents,0);
 const hasError=Boolean(productError||ordersError);
 return <main className={styles.page}><section className={styles.content}><div className="container">
  <header className={styles.pageHeader}><div><p className={styles.eyebrow}>SERVIÇOS · ENCONTRO ONLINE</p>
   <h1>Encontro Online</h1><p>Reforma Tributária na Prática: Compras e Faturamento em 2027. Acompanhe inscrições, pagamentos e materiais.</p></div></header>
  <section className={styles.summaryGrid} aria-label="Resumo do Encontro Online">
   <article><span>Inscrições pagas</span><strong>{hasError?"—":paid}</strong><small>Pedidos com pagamento confirmado</small></article>
   <article><span>Aguardando pagamento</span><strong>{hasError?"—":pending}</strong><small>Pedidos ainda pendentes</small></article>
   <article><span>Receita confirmada</span><strong style={{fontSize:28}}>{hasError?"—":money(paidAmount)}</strong><small>Somente pedidos pagos entre os consultados</small></article>
   <article><span>Cadastro do produto</span><strong style={{fontSize:21}}>{!product?"Não encontrado":product.checkout_enabled&&product.active?"Habilitado":"Desabilitado"}</strong>
    <small>Código {CODE} · Inscrições conforme checkout vigente</small></article>
  </section>
  {hasError&&<p className={styles.errorMessage}>Não foi possível carregar todos os dados do Encontro Online. Confira o Financeiro antes de tomar decisões.</p>}
  <section className={styles.diagnosticsSection}>
   <header className={styles.sectionHeader}><div><p className={styles.eyebrow}>INSCRIÇÕES</p><h2>Pedidos do Encontro Online</h2></div>
    <Link href="/torre/financeiro" className={styles.openLink}>Abrir Financeiro</Link></header>
   <div className={styles.tableWrapper}><table className={styles.table}>
    <thead><tr><th>Data</th><th>Cliente</th><th>Valor cobrado</th><th>Situação</th></tr></thead>
    <tbody>{rows.map(row=><tr key={row.id}><td>{date(row.created_at)}</td>
     <td><strong>{row.customer_name}</strong><small>{row.customer_email}</small></td>
     <td>{money(row.amount_cents)}</td><td><span className={styles.status}>{label[row.status]??row.status}</span></td></tr>)}
    {!rows.length&&<tr><td colSpan={4}>Nenhuma inscrição encontrada.</td></tr>}</tbody>
   </table></div>
   <p style={{fontSize:12,color:"#647381",marginTop:12}}>Até 200 pedidos recentes deste produto. Os dados representam registros de vendas, não presença na aula ou envio de materiais.</p>
  </section>
  <section className={styles.diagnosticsSection}>
   <header className={styles.sectionHeader}><div><p className={styles.eyebrow}>ÁREA COMERCIAL EXISTENTE</p><h2>Gestão do Encontro</h2></div></header>
   <p>Continue a administrar oferta, página comercial e materiais nas ferramentas já existentes da Torre, sem duplicar cadastros.</p>
   <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:18}}>
    <Link href="/torre/comercio-v2/produtos" className={styles.openLink}>Produtos e materiais</Link>
    <Link href="/torre/comercio-v2/ofertas" className={styles.openLink}>Ofertas e preços</Link>
    <Link href="/torre/comercio-v2/paginas" className={styles.openLink}>Páginas de vendas</Link>
   </div>
  </section>
 </div></section></main>;
}
