import type {Metadata} from "next";
import {requireAdmin} from "@/lib/auth/require-admin";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import ClientDirectory from "./directory";
import styles from "../painel.module.css";
export const metadata:Metadata={title:"Clientes | Torre de Controle"};
export const dynamic="force-dynamic";
type Client={id:string;name:string;email:string;document:string;phone:string;address:string;products:string[];registered:string};
const norm=(s:string|null|undefined)=>(s??"").trim().toLowerCase();
const date=(v:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo"}).format(new Date(v));
export default async function ClientesPage(){
 await requireAdmin();
 const db=getSupabaseAdmin();
 const [profiles,orders,products]=await Promise.all([
 db.from("profiles").select("id,full_name,email,created_at").order("created_at",{ascending:false}).limit(1000),
 db.from("orders").select("id,user_id,customer_name,customer_email,customer_document,customer_phone,product_id,status,created_at").order("created_at",{ascending:false}).limit(1000),
 db.from("products").select("id,name")
 ]);
 const errors=Boolean(profiles.error||orders.error||products.error);
 const productMap=new Map((products.data??[]).map(x=>[x.id,x.name]));
 const customers=new Map<string,Client>();
 for(const p of profiles.data??[]){
 const key=norm(p.email)||p.id;
 customers.set(key,{id:p.id,name:p.full_name||"Cliente",email:p.email||"",document:"",phone:"",address:"",products:[],registered:date(p.created_at)});
 }
 for(const o of orders.data??[]){
 const key=norm(o.customer_email)||o.user_id||o.id;
 const item:Client=customers.get(key)??{id:o.user_id||o.id,name:o.customer_name||"Cliente",email:o.customer_email||"",document:"",phone:"",address:"",products:[],registered:date(o.created_at)};
 if(!item.name||item.name==="Cliente")item.name=o.customer_name||item.name;
 if(!item.document)item.document=o.customer_document||"";
 if(!item.phone)item.phone=o.customer_phone||"";
 if(o.status==="paid"){const product=productMap.get(o.product_id);if(product&&!item.products.includes(product))item.products.push(product);}
 customers.set(key,item);
 }
 return <main className={styles.page}><section className={styles.content}><div className="container">
 <header className={styles.pageHeader}><div><p className={styles.eyebrow}>ADMINISTRAÇÃO</p><h1>Clientes</h1><p>Consulte cadastros, contatos e produtos adquiridos, com pesquisa e filtros.</p></div></header>
 {errors?<p className={styles.errorMessage}>Não foi possível consultar os clientes.</p>:<section className={styles.diagnosticsSection}><h2>Clientes cadastrados e compradores</h2><p style={{color:"#647381",fontSize:13}}>Consolidação por e-mail dos perfis e pedidos disponíveis. Endereço será exibido quando houver cadastro estruturado disponível; não é inferido.</p><ClientDirectory rows={[...customers.values()]}/></section>}
 </div></section></main>;
}