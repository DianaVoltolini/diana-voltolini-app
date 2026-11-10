import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {publishProductDelivery} from "./actions";
import styles from "./page.module.css";
export const metadata:Metadata={title:"Produtos e Entregas | Torre"};
export const dynamic="force-dynamic";
type Search={searchParams:Promise<{salvo?:string;erro?:string}>};
const failures:Record<string,string>={
 validacao:"Informe a página, o produto, o título e um arquivo PDF de até 15 MB.",
 produto:"Produto não encontrado ou inativo.",pagina:"Esta página já está vinculada a outro produto.",
 upload:"Não foi possível enviar o arquivo. Confira o bucket privado product-deliveries.",
 salvar:"Não foi possível publicar o material. Verifique se a migração SQL foi executada."
};
export default async function DeliveriesPage({searchParams}:Search){
 await requireAdmin();
 const query=await searchParams;
 const db=getSupabaseAdmin();
 const [{data:products,error:productError},{data:mappings,error:mapError},{data:history}]=await Promise.all([
   db.from("products").select("id,code,name,active").eq("active",true).order("name"),
   db.from("product_deliveries").select("product_id,page_path,material_name,version,published_at,updated_at").order("page_path"),
   db.from("product_delivery_versions").select("product_id,version,material_name,published_at").order("published_at",{ascending:false}).limit(40)
 ]);
 if(productError)throw new Error("Não foi possível consultar os produtos.");
 const byId=new Map((products??[]).map(p=>[p.id,p]));
 return <main className={styles.page}>
   <div className={styles.header}><p className={styles.eyebrow}>TORRE · CATÁLOGO DE ENTREGAS</p><h1>Produtos e Entregas</h1>
     <p>Vincule cada página comercial a um produto. Publique novas versões do PDF sem trocar o checkout ou alterar compras anteriores.</p>
   </div>
   {query.salvo==="1"&&<p className={styles.success} role="status">Material publicado. Todos os compradores com pagamento confirmado terão acesso à nova versão.</p>}
   {query.erro&&<p className={styles.error} role="alert">{failures[query.erro]??"Não foi possível concluir a publicação."}</p>}
   {(mapError||!mappings)&&<p className={styles.error}>Cadastro de entregas indisponível. Execute a migração SQL antes de publicar.</p>}
   <section className={styles.grid}>
     <div className={styles.panel}><h2>Publicar material</h2>
       <p>Selecione o produto, escolha uma página da lista ou informe um novo caminho e envie o PDF atualizado. Cada publicação cria uma nova versão e avisa os compradores.</p>
       <form action={publishProductDelivery} className={styles.form}>
         <label>Produto
           <select name="product_id" required defaultValue={products?.find(p=>p.code==="EBOOK-IBSCBS-001")?.id??""}>
             <option value="" disabled>Selecione um produto</option>
             {(products??[]).map(p=><option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
           </select>
         </label>
         <label>Página da oferta (caminho no site)
           <input name="page_path" list="sales-pages" required defaultValue="/ibs-cbs-na-pratica" placeholder="/ibs-cbs-na-pratica" pattern="/[a-z0-9][a-z0-9/-]*"/>
           <datalist id="sales-pages"><option value="/ibs-cbs-na-pratica"/><option value="/diagnostico-ibs-cbs"/><option value="/assinatura-fiscal"/></datalist>
         </label>
         <label>Nome do material
           <input name="material_name" required defaultValue="E-book IBS e CBS na Prática" maxLength={160}/>
         </label>
         <label>Arquivo PDF (até 15 MB)
           <input type="file" name="file" required accept=".pdf,application/pdf"/>
         </label>
         <button type="submit">Publicar nova versão</button>
       </form>
       <p className={styles.hint}>O histórico registra as versões, mas apenas o PDF mais recente fica disponível para download. O sininho informa os clientes sobre uma atualização publicada. Nesta primeira etapa, o download automático por material publicado está ligado ao e-book IBS/CBS.</p>
     </div>
     <div className={styles.panel}><h2>Páginas e entregas</h2>
       <div className={styles.list}>
        {(mappings??[]).map(m=><article key={m.product_id} className={styles.item}>
          <strong>{byId.get(m.product_id)?.name??"Produto cadastrado"}</strong>
          <small>{m.page_path}</small>
          <span>{m.version>0?`Versão ${m.version} · ${m.material_name}`:"Aguardando primeiro PDF publicado"}</span>
          {m.published_at&&<small>Última publicação: {new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}).format(new Date(m.published_at))}</small>}
          <div className={styles.links}>
            <Link href={`/torre/produtos-entregas/arquivo?product_id=${encodeURIComponent(m.product_id)}&modo=visualizar`} target="_blank">Visualizar PDF atual</Link>
            <Link href={`/torre/produtos-entregas/arquivo?product_id=${encodeURIComponent(m.product_id)}&modo=baixar`}>Baixar PDF atual</Link>
            <Link href={m.page_path.startsWith("/")?`https://dianavoltolini.com.br${m.page_path}`:"https://dianavoltolini.com.br"} target="_blank">Ver página de vendas</Link>
          </div>
        </article>)}
        {!mappings?.length&&<p>Nenhuma página cadastrada. Publique o primeiro arquivo para criar o vínculo.</p>}
       </div>
     </div>
   </section>
   <section className={styles.panel}><h2>Histórico das versões</h2>
     <div className={styles.list}>
       {(history??[]).map(h=><div key={`${h.product_id}-${h.version}`} className={styles.version}>
         <span><strong>{byId.get(h.product_id)?.name??"Produto"}</strong> · v{h.version} — {h.material_name}</span>
         <small>{new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}).format(new Date(h.published_at))}</small>
       </div>)}
       {!history?.length&&<p>O histórico aparecerá após a primeira publicação.</p>}
     </div>
   </section>
 </main>;
}
