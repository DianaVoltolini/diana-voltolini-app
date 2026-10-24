import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logout } from "./actions";
import TorreSidebar from "./sidebar";
import styles from "./sidebar.module.css";

export default async function TorreLayout({children}:{children:ReactNode}){
 const {profile}=await requireAdmin();
 return <div className={styles.shell}>
  <header className={styles.topbar}>
   <Link href="/torre" className={styles.brand} aria-label="Torre de Controle — visão geral"><Image src="/brand/logo-light.png" width={1535} height={538} alt="Diana Voltolini" priority/><span>Torre de Controle</span></Link>
   <div className={styles.actions}><span className={styles.adminName}>{profile.full_name}</span><form action={logout}><button type="submit" className={styles.logout}>Sair</button></form></div>
  </header>
  <div className={styles.body}><TorreSidebar/><div className={styles.content}>{children}</div></div>
 </div>;
}
