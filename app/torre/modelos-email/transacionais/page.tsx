import Link from "next/link";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {saveTransactionalEmail,sendTransactionalTest} from "./actions";
import styles from "../../painel.module.css";
export const dynamic="force-dynamic";
const ids=["eb0c0000-0000-4000-8000-000000000001","eb0c0000-0000-4000-8000-000000000002"];
export default async function TransactionalEmailModels({searchParams}:{searchParams:Promise<{salvo?:string;erro?:string;teste?:string}>}){
 await requireAdmin();
 const params=await searchParams;
 const {data,error}=await getSupabaseAdmin().from("marketing_email_templates")
  .select("id,name,description,subject,body,active")
  .in("id",ids).eq("kind","transactional").order("name");
 return <main className={styles.page}><section className={styles.content}><div className="container">
  <header className={styles.pageHeader}><p className={styles.eyebrow}>MARKETING · MODELOS DE E-MAIL</p>
   <h1>E-mails da compra do e-book</h1>
   <p>Edite os textos enviados automaticamente após a geração da cobrança e a confirmação do pagamento. Salvar não dispara e-mails.</p>
   <Link href="/torre/modelos-email">← Voltar aos modelos</Link>
  </header>
  {params.salvo&&<p role="status" style={{color:"#167143"}}>Modelo salvo com sucesso.</p>}
  {params.teste&&<p role="status" style={{color:"#167143"}}>Prévia enviada exclusivamente ao endereço de teste informado.</p>}
  {params.erro&&<p role="alert" style={{color:"#b42318"}}>Não foi possível concluir a operação ({params.erro}). Confira os dados e a configuração de envio.</p>}
  {error||!data||data.length!==2?<p role="alert">Os modelos ainda não foram cadastrados. Aplique a migration 20261110_ebook_transactional_email_templates.sql antes de editar.</p>:
  <div style={{display:"grid",gap:24}}>
   {data.map(model=><section key={model.id} className={styles.diagnosticsSection} style={{display:"grid",gap:16}}>
    <h2>{model.name}</h2><p>{model.description}</p>
    <p style={{fontSize:13,color:"#607184"}}>Disparo por evento de pagamento · {model.active?"Disponível":"Desativado"}. As regras de envio não são alteradas aqui.</p>
    <form action={saveTransactionalEmail} style={{display:"grid",gap:14}}>
     <input type="hidden" name="id" value={model.id}/>
     <label style={{display:"grid",gap:6}}>Assunto
      <input type="text" name="subject" required maxLength={180} defaultValue={model.subject} style={{padding:12,border:"1px solid #cbd5e1",borderRadius:7,width:"100%"}}/>
     </label>
     <label style={{display:"grid",gap:6}}>Mensagem
      <textarea name="body" required maxLength={14000} defaultValue={model.body} rows={19} style={{padding:12,border:"1px solid #cbd5e1",borderRadius:7,width:"100%",lineHeight:1.65}}/>
     </label>
     <p style={{fontSize:12,color:"#607184"}}>Variáveis: {"{{nome}}"}, {"{{valor}}"}, {"{{forma_pagamento}}"} e {"{{situacao_encontro}}"}. Os links de pagamento e acesso são gerados pelo sistema.</p>
     <button type="submit" style={{justifySelf:"start",padding:"12px 20px",borderRadius:7,border:0,background:"#c9a227",fontWeight:700}}>Salvar modelo</button>
    </form>
    <details style={{borderTop:"1px solid #e2e8f0",paddingTop:12}}><summary>Visualizar texto salvo</summary>
     <div style={{whiteSpace:"pre-line",lineHeight:1.7,padding:20,background:"#fbfaf7",borderRadius:8,marginTop:10}}>{model.body}</div>
    </details>
    <form action={sendTransactionalTest} style={{display:"flex",alignItems:"end",flexWrap:"wrap",gap:10,borderTop:"1px solid #e2e8f0",paddingTop:14}}>
     <input type="hidden" name="id" value={model.id}/>
     <label style={{display:"grid",gap:5}}>Enviar prévia para
      <input name="test_email" type="email" required placeholder="seuemail@dominio.com" style={{padding:10,border:"1px solid #cbd5e1",borderRadius:7}}/>
     </label>
     <label style={{fontSize:13,display:"flex",gap:6,alignItems:"center"}}><input type="checkbox" name="confirm" value="yes" required/> Confirmo um único envio de teste</label>
     <button type="submit" style={{padding:"10px 16px",borderRadius:7,border:"1px solid #d7e0e9",background:"white"}}>Enviar teste</button>
    </form>
   </section>)}
  </div>}
 </div></section></main>;
}
