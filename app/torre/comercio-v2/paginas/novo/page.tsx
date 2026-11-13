// app/torre/comercio-v2/paginas/novo/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { saveCommercialPage } from "../actions";
import css from "../../commercial.module.css";
import styles from "../pages.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Editar Página de Vendas | Área Comercial" };
type Query = { editar?: string; produto?: string; em_branco?: string };
type Product = { id: string; code: string; name: string };
type Offer = { id: string; name: string; product_id: string; regular_price_cents: number };
type Page = {
 id: string; product_id: string; offer_id: string; slug: string; template: string;
 title: string; eyebrow: string | null; headline: string; subtitle: string | null;
 benefits: string | null; audience: string | null; details: string | null;
 faq: string | null; cta_label: string; seo_title: string | null;
 seo_description: string | null; version: number;
};
const types = { online_event: "Encontro online", ebook: "E-book", service: "Serviço", course: "Curso" };
const ENCOUNTER_EXAMPLE = {
  slug: "encontro-reforma-tributaria-2027-piloto",
  template: "online_event",
  title: "Reforma Tributária na Prática: Compras e Faturamento em 2027",
  headline: "Em 2027, você vai saber o que conferir nas notas fiscais com IBS e CBS?",
  eyebrow: "BLACK NOVEMBER 2026 · PRIMEIRA TURMA · ENCONTRO ONLINE",
  subtitle: "A Reforma Tributária está mudando as rotinas de compras e faturamento. Aprenda, com exemplos práticos, a identificar possíveis erros, conferir informações fiscais e entender o que exige atenção nas operações da sua empresa.",
  benefits: "Encontro ao vivo de 90 minutos com exemplos de compras e faturamento.\nE-book IBS e CBS na Prática, liberado após confirmação do pagamento.\nApresentação em PDF e exercícios comentados com documentos fiscais simulados.\nPlanilha de simulação de IBS e CBS com valores hipotéticos.\nChecklists operacionais para compras e faturamento.",
  audience: "Profissionais de faturamento, compras, fiscal, administrativo, cadastros fiscais e empresários que trabalham com documentos fiscais.",
  details: "Encontro online: 21/01/2027, das 19h30 às 21h (horário de Brasília), pelo Google Meet.\nConteúdos: conferência de NF-e de entrada, CST e cClassTrib, possíveis créditos de IBS/CBS, NF-e de saída, parametrização de ERP, devoluções e operações especiais.\nLaboratório com documentos fictícios de compra, venda e devolução.\nO e-book é liberado após o pagamento; os demais materiais serão disponibilizados em janeiro de 2027. Prazo único de acesso: 90 dias desde a confirmação do pagamento, sem prorrogação por liberações posteriores.\nPreço é obtido da oferta vinculada, não deste conteúdo.",
  faq: "Quando será o encontro? 21/01/2027, das 19h30 às 21h, pelo Google Meet.\nPreciso conhecer IBS e CBS? Não; conhecimentos básicos sobre NF-e facilitam o acompanhamento.\nHaverá exemplos? Sim, com documentos fiscais simulados.\nO e-book está incluído? Sim, na inscrição do encontro.\nQuando os materiais ficam disponíveis? E-book após confirmação do pagamento; apresentação, exercícios, planilha e checklists em janeiro de 2027.\nPor quanto tempo? 90 dias desde a confirmação do pagamento para todos os materiais.\nPosso tirar dúvidas? Haverá espaço para dúvidas gerais ao final do encontro.",
  cta_label: "Quero garantir minha inscrição",
  seo_title: "Reforma Tributária na Prática: Compras e Faturamento em 2027",
  seo_description: "Encontro online em 21/01/2027, das 19h30 às 21h, pelo Google Meet. Conferência de NF-e, IBS, CBS e exercícios simulados, com e-book e materiais de apoio.",
} as const;

export default async function CommercialPageEditor({ searchParams }: {searchParams: Promise<Query>}) {
 await requireAdmin();
 const q=await searchParams;
 const db=getSupabaseAdmin();
 const [presult,oresult,pageresult]=await Promise.all([
  db.from("commerce_v2_products").select("id,code,name").order("name").limit(500),
  db.from("commerce_v2_offers").select("id,name,product_id,regular_price_cents").eq("status","draft").order("name").limit(500),
  q.editar ? db.from("commerce_v2_pages").select("id,product_id,offer_id,slug,template,title,eyebrow,headline,subtitle,benefits,audience,details,faq,cta_label,seo_title,seo_description,version").eq("id",q.editar).maybeSingle()
   : Promise.resolve({data:null,error:null}),
 ]);
 const products=(presult.data??[]) as Product[];
 const offers=(oresult.data??[]) as Offer[];
 const page=pageresult.data as Page|null;
 const bad=Boolean(presult.error || oresult.error || pageresult.error || (q.editar && !page));
 const example = !page && q.em_branco !== "1";
 const exampleProduct = products.find(p=>p.code==="ENC-RT-2027-001");
 const productId=page?.product_id ?? (products.some(p=>p.id===q.produto)?q.produto:(example ? exampleProduct?.id : undefined)) ?? "";
 const offerOptions = offers.filter(o=>o.product_id===productId);
 const exampleOffer = example ? offerOptions.find(o=>/black november/i.test(o.name)) ?? offerOptions[0] : undefined;
 const defaults = example ? ENCOUNTER_EXAMPLE : null;
 const fields: Array<{key: "eyebrow"|"subtitle"|"benefits"|"audience"|"details"|"faq"|"seo_title"|"seo_description",label:string,max:number,rows?:number}> = [
  {key:"eyebrow",label:"Chamada superior",max:100},
  {key:"subtitle",label:"Texto de apresentação",max:1000,rows:3},
  {key:"benefits",label:"O que está incluído (um item por linha)",max:4000,rows:4},
  {key:"audience",label:"Para quem é",max:2000,rows:3},
  {key:"details",label:"Informações do evento ou produto",max:4000,rows:4},
  {key:"faq",label:"Perguntas frequentes (texto livre)",max:4000,rows:4},
  {key:"seo_title",label:"Título SEO",max:160},
  {key:"seo_description",label:"Descrição SEO",max:320,rows:2},
 ];
 return <main className={css.page}>
  <header className={css.header}>
   <div><p className={css.eyebrow}>ÁREA COMERCIAL · PÁGINAS DE VENDAS</p>
    <h1 className={css.title}>{page?"Editar página":"Nova página"}</h1>
    <p className={css.subtitle}>Monte o conteúdo da página piloto. Salvar não publica nem ativa vendas.</p></div>
   <Link className={css.secondary} href="/torre/comercio-v2/paginas">Voltar à lista</Link>
  </header>
  {bad ? <p className={css.error} role="alert">Não foi possível abrir este cadastro. Verifique a migração ou selecione outra página.</p> :
  <section className={css.section}>
   <h2>Conteúdo da página</h2>
   {!page && <p className={css.note}>{example ? "Exemplo do encontro carregado a partir da página existente. Revise as informações e clique em Salvar rascunho apenas quando desejar gravá-las." : "Formulário em branco para outro produto."}{" "}<Link className={css.link} href={example ? "/torre/comercio-v2/paginas/novo?em_branco=1" : "/torre/comercio-v2/paginas/novo"}>{example ? "Começar em branco" : "Carregar exemplo do encontro"}</Link></p>}
   <form action={saveCommercialPage} className={css.form+" "+css.formWide+" "+styles.form}>
    <input type="hidden" name="id" value={page?.id??""}/>
    <input type="hidden" name="version" value={page?.version??1}/>
    <div className={styles.editorGrid}>
     <label>Produto
      <select name="product_id" required defaultValue={productId} key={productId} id="commercial-product">
       <option value="" disabled>Selecione o produto</option>
       {products.map(p=><option value={p.id} key={p.id}>{p.code} — {p.name}</option>)}
      </select>
     </label>
     <label>Oferta vinculada
      <select name="offer_id" required defaultValue={page?.offer_id??exampleOffer?.id??""} key={page?.id??"new"}>
       <option value="" disabled>Selecione uma oferta</option>
       {offers.map(o=><option value={o.id} key={o.id}>{o.name} — {products.find(p=>p.id===o.product_id)?.code??"Produto"}</option>)}
      </select>
     </label>
    </div>
    <p className={css.note}>Produto e oferta devem pertencer ao mesmo cadastro. A validação acontece ao salvar. Existem {offerOptions.length} oferta(s) para o produto inicialmente selecionado.</p>
    <div className={styles.editorGrid}>
     <label>Modelo
      <select name="template" defaultValue={page?.template??defaults?.template??"online_event"}>
       {Object.entries(types).map(([k,v])=><option key={k} value={k}>{v}</option>)}
      </select>
     </label>
     <label>Endereço interno (slug)
      <input name="slug" required maxLength={100} readOnly={Boolean(page)}
       pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={page?.slug??defaults?.slug??""} placeholder="encontro-reforma-tributaria-piloto"/>
     </label>
    </div>
    <label>Nome interno da página
     <input name="title" required minLength={3} maxLength={160} defaultValue={page?.title??defaults?.title??""}/>
    </label>
    <label>Título principal
     <input name="headline" required minLength={3} maxLength={250} defaultValue={page?.headline??defaults?.headline??""}/>
    </label>
    {fields.map(field=><label key={field.key}>{field.label}
     {field.rows?<textarea name={field.key} maxLength={field.max} rows={field.rows}
      defaultValue={page?.[field.key]??defaults?.[field.key]??""}/>:
     <input name={field.key} maxLength={field.max} defaultValue={page?.[field.key]??""}/>}
    </label>)}
    <label>Texto do botão (visual, desabilitado no piloto)
     <input name="cta_label" required minLength={3} maxLength={80} defaultValue={page?.cta_label??defaults?.cta_label??"Inscrições em preparação"}/>
    </label>
    <div className={css.banner}><strong>Somente rascunho</strong>A prévia ficará disponível para administradores depois de salvar. Não há publicação, cobrança ou checkout.</div>
    <div><button type="submit" disabled={!products.length||!offers.length}>Salvar rascunho</button></div>
   </form>
  </section>}
 </main>;
}
