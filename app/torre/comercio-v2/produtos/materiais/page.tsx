// app/torre/comercio-v2/produtos/materiais/page.tsx
import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {saveStudentDelivery,removeStudentDelivery,linkSalesProduct,setStudentDeliveryActive} from "./actions";
import css from "../../commercial.module.css";

export const metadata:Metadata={title:"Materiais para entrega | Produtos V2"};
export const dynamic="force-dynamic";
type Query={produto?:string;salvo?:string;removido?:string;vinculado?:string;ativado?:string;desativado?:string;erro?:string};
type Product={id:string;name:string;code:string;sales_product_id:string|null;student_delivery_active:boolean};
type Material={id:string;title:string;category:string;product_id:string};
type Assignment={material_id:string;release_mode:string;release_date:string|null};

export default async function DeliveryMaterials({searchParams}:{searchParams:Promise<Query>}){
  await requireAdmin();
  const query=await searchParams;
  const db=getSupabaseAdmin();
  const {data:products,error:productsError}=await db.from("commerce_v2_products")
    .select("id,name,code,sales_product_id,student_delivery_active").order("name").limit(500);
  const catalog=(products??[]) as Product[];
  const selected=catalog.find(p=>p.id===query.produto)??null;
  const [{data:materials,error:materialsError},{data:linked,error:linkedError},
    {data:eligibilities,error:eligibilityError},{data:salesProducts,error:salesError}]=await Promise.all([
    db.from("commerce_v2_materials").select("id,title,category,product_id")
      .eq("is_archived",false).eq("available_to_student",true)
      .not("storage_path","is",null).order("title").limit(500),
    selected?db.from("commerce_v2_product_materials")
      .select("material_id,release_mode,release_date").eq("product_id",selected.id)
      :Promise.resolve({data:[] as Assignment[],error:null}),
    selected?db.from("commerce_v2_material_product_eligibility")
      .select("material_id").eq("product_id",selected.id)
      :Promise.resolve({data:[] as {material_id:string}[],error:null}),
    db.from("products").select("id,code,name").order("name").limit(300),
  ]);
  const allowedIds=new Set((eligibilities??[]).map(row=>row.material_id));
  const eligible=((materials??[]) as Material[]).filter(material=>allowedIds.has(material.id));
  const assignments=(linked??[]) as Assignment[];
  const activeMaterialIds=new Set(assignments.map(item=>item.material_id));
  const errors=Boolean(productsError||materialsError||linkedError||eligibilityError||salesError);

  return <main className={css.page}>
    <header className={css.header}>
      <div>
        <p className={css.eyebrow}>TORRE · PRODUTOS · MATERIAIS PARA ENTREGA</p>
        <h1 className={css.title}>Materiais para entrega</h1>
        <p className={css.subtitle}>Escolha os arquivos da Biblioteca e programe sua liberação para cada produto.</p>
      </div>
      <Link className={css.secondary} href="/torre/comercio-v2/produtos">Voltar a Produtos</Link>
    </header>
    <div className={css.banner}>
      <strong>Entrega aos clientes controlada por produto</strong>
      A programação só aparece aos compradores após vincular o mesmo código do catálogo de vendas e ativar explicitamente a entrega. O checkout não é alterado.
    </div>
    {errors&&<p className={css.error} role="alert">Falha ao consultar os materiais. Verifique a migração e os cadastros.</p>}
    {query.vinculado==="1"&&<p className={css.message} role="status">Produto de vendas vinculado. A entrega permanece desativada.</p>}
    {query.ativado==="1"&&<p className={css.message} role="status">Entrega V2 ativada para este produto.</p>}
    {query.desativado==="1"&&<p className={css.message} role="status">Entrega V2 desativada para este produto.</p>}
    {query.salvo==="1"&&<p className={css.message} role="status">Material vinculado ao produto.</p>}
    {query.removido==="1"&&<p className={css.message} role="status">Vínculo removido.</p>}
    {query.erro&&<p className={css.error} role="alert">Não foi possível salvar. Confira o produto, o arquivo e a data de liberação.</p>}
    <section className={css.section}>
      <h2>Selecionar produto</h2>
      <form method="GET" action="/torre/comercio-v2/produtos/materiais" className={css.form}>
        <label>Produto
          <select name="produto" defaultValue={selected?.id??""} required>
            <option value="" disabled>Selecione o produto</option>
            {catalog.map(p=><option value={p.id} key={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </label>
        <div><button type="submit">Consultar materiais</button></div>
      </form>
    </section>
    {selected&&!errors&&<>
      <section className={css.section}>
        <h2>Integração com o produto vendido</h2>
        <p className={css.note}>Para evitar entregas incorretas, somente é permitido vincular o mesmo código nos dois cadastros. A liberação está desligada por padrão.</p>
        <p><strong>Produto V2:</strong> {selected.code} — {selected.name}</p>
        <p><strong>Entrega na Área do Cliente:</strong> {selected.student_delivery_active?"Ativa":"Desativada"}</p>
        <form action={linkSalesProduct} className={css.form}>
          <input type="hidden" name="productId" value={selected.id}/>
          <label>Produto correspondente no catálogo de vendas
            <select name="salesProductId" defaultValue={selected.sales_product_id??""} disabled={selected.student_delivery_active}>
              <option value="">Não vincular ainda</option>
              {(salesProducts??[]).filter(p=>p.code===selected.code).map(p=><option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </label>
          <div><button type="submit" disabled={selected.student_delivery_active}>Salvar vínculo</button></div>
        </form>
        <form action={setStudentDeliveryActive} className={css.form}>
          <input type="hidden" name="productId" value={selected.id}/>
          <input type="hidden" name="active" value={selected.student_delivery_active?"false":"true"}/>
          <div><button type="submit" disabled={!selected.student_delivery_active&&(!selected.sales_product_id||assignments.length===0)}>
            {selected.student_delivery_active?"Desativar entrega aos clientes":"Ativar entrega aos clientes"}
          </button></div>
        </form>
      </section>
      <section className={css.section}>
        <h2>Materiais vinculados a {selected.name}</h2>
        <div className={css.tableScroll}>
          <table className={css.table}>
            <thead><tr><th>Material</th><th>Liberação</th><th>Ações</th></tr></thead>
            <tbody>
              {assignments.map(item=>{
                const material=eligible.find(m=>m.id===item.material_id);
                return <tr key={item.material_id}>
                  <td><strong>{material?.title??"Material indisponível"}</strong></td>
                  <td>{item.release_mode==="after_payment"?"Imediatamente após confirmação do pagamento":
                    item.release_date?"A partir de "+item.release_date.split("-").reverse().join("/"):"Data inválida"}</td>
                  <td><form action={removeStudentDelivery}>
                    <input type="hidden" name="productId" value={selected.id}/>
                    <input type="hidden" name="materialId" value={item.material_id}/>
                    <button type="submit" className={css.secondary}>Remover vínculo</button>
                  </form></td>
                </tr>;
              })}
              {!assignments.length&&<tr><td colSpan={3}>Nenhum material selecionado para este produto.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className={css.section}>
        <h2>Adicionar material da Biblioteca</h2>
        <p className={css.note}>São listados apenas materiais vinculados a este produto na Biblioteca, ativos, com arquivo e com “Disponível para aluno: Sim”.</p>
        <form action={saveStudentDelivery} className={css.form}>
          <input type="hidden" name="productId" value={selected.id}/>
          <label>Material
            <select name="materialId" required defaultValue="">
              <option value="" disabled>Selecione um material</option>
              {eligible.map(m=><option value={m.id} key={m.id}>
                {m.title}{activeMaterialIds.has(m.id)?" (já vinculado — atualizar configuração)":""}
              </option>)}
            </select>
          </label>
          <label>Quando liberar
            <select name="releaseMode" defaultValue="after_payment">
              <option value="after_payment">Imediatamente após confirmação do pagamento</option>
              <option value="scheduled">Em data programada</option>
            </select>
          </label>
          <label>Data de liberação (preencher apenas para data programada)
            <input name="releaseDate" type="date"/>
          </label>
          <p className={css.note}>Para data programada, será utilizada a data civil em Brasília, a partir de 00h. A entrega sempre depende de pedido pago e de prazo de acesso válido.</p>
          <div><button type="submit" disabled={!eligible.length}>Salvar material para entrega</button></div>
        </form>
        {!eligible.length&&<p className={css.note}>Não há materiais elegíveis para este produto. <Link href="/torre/comercio-v2/materiais">Acesse a Biblioteca</Link>, marque “Disponível para aluno” e selecione este produto.</p>}
      </section>
    </>}
  </main>;
}
