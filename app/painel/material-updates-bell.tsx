import Link from "next/link";
import type {V2MaterialNotice} from "@/lib/commerce-v2/material-update-notices";
import {markMaterialUpdateRead} from "./material-updates-actions";
import styles from "./material-updates.module.css";

export default function MaterialUpdatesBell({notices}:{notices:V2MaterialNotice[]}) {
 return <details className={styles.wrapper}>
   <summary className={styles.bell} aria-label={notices.length?`Materiais atualizados: ${notices.length} aviso(s)`:"Atualizações de materiais"} title="Atualizações de materiais">
     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
     {notices.length>0&&<span className={styles.count}>{notices.length}</span>}
   </summary>
   <div className={styles.menu}>
     <strong>Materiais atualizados</strong>
     {!notices.length?<p>Você está em dia. Nenhum material novo para conferir.</p>:
      notices.map(n=><div className={styles.item} key={n.product_id}>
       <b>{n.name}</b><span>{n.count===1?"1 material atualizado":`${n.count} materiais atualizados`} na Biblioteca.</span>
       <div className={styles.actions}><Link href={n.href}>Ver material</Link>
        <form action={markMaterialUpdateRead}>
         <input type="hidden" name="product_id" value={n.product_id}/>
         <button type="submit">Marcar como lido</button>
        </form>
       </div>
      </div>)}
   </div>
 </details>;
}