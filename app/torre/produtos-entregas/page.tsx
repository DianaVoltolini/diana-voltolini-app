import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {publishProductDelivery} from "./actions";
import {copyCurrentEbookToV2} from "./import-to-v2";
import styles from "./page.module.css";
export const metadata:Metadata={title:"Produtos e Entregas | Torre"};
export const dynamic="force-dynamic";
type Search={searchParams:Promise<{salvo?:string;erro?:string;migracao?:string}>};
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
 const [{data:products,error:productError},{data:mappings,error:mapError},{data:history},{data:imports,error:importsError}]=await Promise.all([
   db.from("products").select("id,code,name,active").eq("active",true).order("name"),
   db.from("product_deliveries").select("product_id,page_path,material_name,version,published_at,updated_at").order("page_path"),
   db.from("product_delivery_versions").select("product_id,version,material_name,published_at").order("published_at",{ascending:false}).limit(40),
   db.from("commerce_v2_legacy_material_imports").select("legacy_product_id,material_id,legacy_version").limit(100)
 ]);
 if(productError)throw new Error("Não foi possível consultar os produtos.");
 const byId=new Map((products??[]).map(p=>[p.id,p]));
 return <main className={styles.page}>
   <div className={styles.header}><p className={styles.eyebrow}>TORRE · HISTÓRICO DE ENTREGAS</p><h1>Publicação anterior de e-book</h1>
     <p>Esta área permanece disponível durante a migração, pois ainda fornece o PDF entregue aos compradores existentes. O cadastro central de materiais está no Comércio V2.</p>
     <Link href="/torre/comercio-v2/materiais">Abrir Biblioteca V2</Link>
   </div>
   <section className={styles.panel}>
     <h2>Consolidar o e-book na Biblioteca V2</h2>
     <p>Copie uma única vez o PDF vigente do e-book IBS e CBS na Prática para a Biblioteca. Esta operação não apaga o original, não altera a entrega aos compradores, não ativa o material e não envia avisos.</p>
     {importsError && <p className={styles.error}>Consulte a migração SQL antes de importar o PDF.</p>}
     {query.migracao==="concluida"&&<p className={styles.success}>Cópia concluída. Confira o novo arquivo na Biblioteca V2 antes de ativar qualquer entrega.</p>}
     {query.migracao==="jaimportado"&&<p className={styles.success}>O e-book já possui uma cópia registrada na Biblioteca V2.</p>}
     {query.migracao && !["concluida","jaimportado"].includes(query.migracao)&&<p className={styles.error}>A cópia não foi concluída ({query.migracao}). A entrega legada foi preservada.</p>}
     <form action={copyCurrentEbookToV2} className={styles.form}>
       <button type="submit" disabled={Boolean(importsError||imports?.some(i=>byId.get(i.legacy_product_id)?.code==="EBOOK-IBSCBS-001"))}>Copiar PDF vigente para a Biblioteca V2</button>
     </form>
     <p className={styles.hint}>A cópia ficará como “Disponível para aluno: Não” até revisão. A mudança de entrega e os avisos de atualização serão homologados separadamente.</p>
   </section>
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
       <p className={styles.hint}>Somente a versão mais recente fica disponível para download. O histórico registra as publicações realizadas. O sininho informa os clientes sobre uma atualização publicada. Nesta primeira etapa, o download automático por material publicado está ligado ao e-book IBS/CBS.</p>
     </div>
     <div className={styles.panel}><h2>Páginas e entregas</h2>
       <div className={styles.list}>
        {(mappings??[]).map(m=><article key={m.product_id} className={styles.item}>
          <strong>{byId.get(m.product_id)?.name??"Produto cadastrado"}</strong>
          <small>{m.page_path}</small>
          <span>{m.version>0?`Versão ${m.version} · ${m.material_name}`:"Aguardando primeiro PDF publicado"}</span>
          {m.published_at&&<small>Última publicação: {new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}).format(new Date(m.published_at))}</small>}
          {byId.get(m.product_id)?.code==="EBOOK-IBSCBS-001" && m.version>0 && <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
            <a href="/api/torre/ebooks/current?mode=view" target="_blank" rel="noopener noreferrer">Visualizar PDF atual</a>
            <a href="/api/torre/ebooks/current">Baixar PDF atual</a>
          </div>}
          <Link href={m.page_path.startsWith("/")?`https://dianavoltolini.com.br${m.page_path}`:"https://dianavoltolini.com.br"} target="_blank">Ver página de vendas</Link>
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
