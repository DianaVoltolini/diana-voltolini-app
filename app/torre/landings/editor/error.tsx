"use client";
import Link from "next/link";
import {useEffect} from "react";
import styles from "./page.module.css";

export default function LandingEditorError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{console.error("[landing-editor] page error",error);},[error]);
 return <main className={styles.main}>
  <p className={styles.kicker}>LANDING PAGES</p>
  <h1>Não foi possível abrir o editor</h1>
  <div className={styles.error} role="alert">
   Ocorreu uma falha ao carregar a página. O editor mantém uma cópia local dos campos digitados neste navegador, quando disponível. Você pode tentar abrir novamente e recuperar o rascunho.
  </div>
  <div className={styles.noticeActions}>
   <button type="button" onClick={reset}>Tentar novamente</button>
   <Link href="/torre/landings">Voltar para Landing Pages</Link>
  </div>
 </main>;
}
