import type { ReactNode } from "react";
import styles from "./product-page.module.css";
type Props={title:string;description:string;children:ReactNode};
export default function ProductPage({title,description,children}:Props){
 return <main className={styles.page}><div className={styles.container}>
  <header className={styles.intro}><p className={styles.eyebrow}>MINHAS COMPRAS</p><h1>{title}</h1><p className={styles.description}>{description}</p></header>
  <div className={styles.body}>{children}</div>
 </div></main>;
}
