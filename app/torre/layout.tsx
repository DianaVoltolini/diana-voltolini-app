import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/require-admin";
import TorreSidebar from "./sidebar";
import styles from "./sidebar.module.css";
export default async function TorreLayout({children}:{children:ReactNode}){
 await requireAdmin();
 return <div className={styles.shell}><TorreSidebar/><div className={styles.content}>{children}</div></div>;
}
