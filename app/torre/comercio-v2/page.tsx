// app/torre/comercio-v2/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import css from "./commercial.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Área Comercial | Torre de Controle" };

const catalogue = [
  { code:"ENC-RT-2027-001", name:"Encontro Online", href:"/torre/comercio-v2/ofertas" },
  { code:"EBOOK-IBSCBS-001", name:"E-book IBS/CBS", href:"/torre/comercio-v2/ofertas" },
  { code:"DIAGNOSTICO-EXPRESSO-IBS-CBS", name:"Diagnóstico Expresso", href:"/torre/comercio-v2/produtos" },
  { code:"ASSINATURA-FISCAL-001", name:"Fiscal na Prática", href:"/torre/comercio-v2/produtos" },
] as const;

const stages = [
  {name:"01 · Produtos",status:"Cadastros existentes",description:"Produtos V2 vinculados ao catálogo comercial. A ativação de vendas é conferida separadamente.",href:"/torre/comercio-v2/produtos"},
  {name:"02 · Biblioteca de materiais",status:"Entrega integrada em produtos selecionados",description:"Materiais privados e programação por produto, com acesso conforme compra confirmada.",href:"/torre/comercio-v2/materiais"},
  {name:"03 · Ofertas e preços",status:"Encontro e e-book conectados",description:"O checkout atual utiliza a oferta do encontro e o preço cadastrado do e-book.",href:"/torre/comercio-v2/ofertas"},
  {name:"04 · Páginas de vendas",status:"Publicação V2 controlada",description:"Páginas V2 não substituem automaticamente as páginas públicas já utilizadas nas vendas.",href:"/torre/comercio-v2/paginas"},
  {name:"05 · Checkout",status:"Checkout atual em funcionamento",description:"Encontro e e-book utilizam o checkout central. Os demais produtos ainda dependem de liberação específica.",href:null},
  {name:"06 · Entregas",status:"Em operação para produtos selecionados",description:"E-book e Encontro possuem acesso por pedido pago; materiais futuros seguem a programação.",href:null},
  {name:"07 · Homologação",status:"Por produto",description:"As verificações de produção, recorrência e demais fluxos devem ser concluídas individualmente.",href:null},
] as const;

type V2Product={code:string;sales_product_id:string|null};
type LiveProduct={id:string;active:boolean;checkout_enabled:boolean;bling_product_id:number|null};

export default async function ComercioV2Home() {
  await requireAdmin();
  const db=getSupabaseAdmin();
  const [v2Result,liveResult]=await Promise.all([
    db.from("commerce_v2_products").select("code,sales_product_id").in("code",catalogue.map(p=>p.code)),
    db.from("products").select("id,active,checkout_enabled,bling_product_id"),
  ]);
  const unavailable=Boolean(v2Result.error||liveResult.error);
  const v2Map=new Map(((v2Result.data??[]) as V2Product[]).map(p=>[p.code,p]));
  const liveMap=new Map(((liveResult.data??[]) as LiveProduct[]).map(p=>[p.id,p]));
  const statuses=catalogue.map(item=>{
    const linked=v2Map.get(item.code);
    const product=linked?.sales_product_id?liveMap.get(linked.sales_product_id):null;
    const enabled=Boolean(product?.active&&product.checkout_enabled&&Number.isSafeInteger(product.bling_product_id)&&Number(product.bling_product_id)>0);
    return {...item,enabled};
  });
  return (
    <main className={css.page}>
      <header className={css.header}>
        <div>
          <p className={css.eyebrow}>TORRE DE CONTROLE · ÁREA COMERCIAL</p>
          <h1 className={css.title}>Área Comercial</h1>
          <p className={css.subtitle}>Acompanhe os produtos conectados ao checkout atual e as etapas da nova plataforma comercial.</p>
        </div>
      </header>
      <div className={css.banner}>
        <strong>Implantação em andamento — vendas existentes preservadas</strong>
        O Encontro Online e o e-book já têm fluxos comerciais ativos. A plataforma V2 permanece em implantação; publicar uma página V2 não cria automaticamente outro checkout.
      </div>
      <section className={css.section}>
        <h2>Produtos e vendas</h2>
        {unavailable
          ? <p className={css.error} role="alert">Não foi possível consultar a situação dos checkouts. Nenhum status foi presumido.</p>
          : <div className={css.grid}>
              {statuses.map(p=><article key={p.code} className={css.card}>
                <h3>{p.name}</h3>
                <p className={css.status}>{p.enabled?"Checkout habilitado":"Checkout não habilitado"}</p>
                <p>{p.enabled?"Produto vinculado a um checkout ativo no sistema atual.":"Cadastro preservado na Torre; a primeira venda ainda não está habilitada."}</p>
                <Link className={css.link} href={p.href}>Consultar cadastro comercial</Link>
              </article>)}
            </div>}
      </section>
      <section className={css.section}>
        <h2>Etapas da implantação</h2>
        <div className={css.grid}>
          {stages.map(stage=>(
            <article key={stage.name} className={css.card}>
              <h3>{stage.name}</h3>
              <p className={css.status}>{stage.status}</p>
              <p>{stage.description}</p>
              {stage.href?<Link className={css.link} href={stage.href}>Abrir módulo</Link>
                :<span className={css.note}>Acompanhamento por produto, sem ativação automática</span>}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
