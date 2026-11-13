// app/torre/comercio-v2/produtos/materiais/page.tsx
import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {saveStudentDelivery,removeStudentDelivery} from "./actions";
import css from "../../commercial.module.css";

export const metadata:Metadata={title:"Materiais para entrega | Produtos V2"};
export const dynamic="force-dynamic";
type Query={produto?:string;salvo?:string;removido?:string;erro?:string};
type Product={id:string;name:string;code:string};
type Material={id:string;title:string;category:string;product_id:string};
type Assignment={material_id:string;release_mode:string;release_date:string|null};

export default async function DeliveryMaterials({searchParams}:{searchParams:Promise<Query>}){
  await requireAdmin();
  const query=await searchParams;
  const db=getSupabaseAdmin();
  const {data:products,error:productsError}=await db.from("commerce_v2_products")
    .select("id,name,code").order("name").limit(500);
  const catalog=(products??[]) as Product[];
  const selected=catalog.find(p=>p.id===query.produto)??null;
  const [{data:materials,error:materialsError},{data:linked,error:linkedError}]=await Promise.all([
    db.from("commerce_v2_materials").select("id,title,category,product_id")
      .eq("is_archived",false).eq("available_to_student",true)
      .not("storage_path","is",null).order("title").limit(500),
    selected?db.from("commerce_v2_product_materials")
      .select("material_id,release_mode,release_date").eq("product_id",selected.id)
      :Promise.resolve({data:[] as Assignment[],error:null}),
  ]);
  const eligible=(materials??[]) as Material[];
  const assignments=(linked??[]) as Assignment[];
  const activeMaterialIds=new Set(assignments.map(item=>item.material_id));
  const errors=Boolean(productsError||materialsError||linkedError);

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
      <strong>Configuração V2 — sem publicação automática</strong>
      Este cadastro ainda não altera a entrega aos clientes ou o checkout. A integração com a Área do Cliente será ativada depois da homologação.
    </div>
    {errors&&<p className={css.error} role="alert">Falha ao consultar os materiais. Verifique a migração e os cadastros.</p>}
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
        <p className={css.note}>São listados apenas materiais ativos, com arquivo e com “Disponível para aluno: Sim”.</p>
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
        {!eligible.length&&<p className={css.note}>Não há materiais elegíveis. <Link href="/torre/comercio-v2/materiais">Acesse a Biblioteca</Link> e marque “Disponível para aluno”.</p>}
      </section>
    </>}
  </main>;
}
