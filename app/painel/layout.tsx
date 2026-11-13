// app/painel/layout.tsx

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { logout } from "./actions";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import CustomerSidebar from "./customer-sidebar";
import MaterialUpdatesBell, {type MaterialNotice} from "./material-updates-bell";
import { ensureClientAccess } from "@/lib/supabase/client-access";
import { getFiscalAccess } from "@/lib/fiscal/subscription-access";
import styles from "./customer-sidebar.module.css";

export const dynamic = "force-dynamic";

type PainelLayoutProps = {
  children: ReactNode;
};

export default async function PainelLayout({
  children,
}: PainelLayoutProps) {
  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    typeof claimsData?.claims?.sub ===
    "string"
      ? claimsData.claims.sub
      : null;

  if (!userId) {
    redirect("/login");
  }

  const {
    data: profile,
    error,
  } =
    await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", userId)
      .maybeSingle();

  if (
    error ||
    !profile ||
    profile.status !== "active"
  ) {
    redirect("/login");
  }

  if (profile.role === "admin") {
    redirect("/torre");
  }

  // Vincula compras públicas ao usuário já autenticado, inclusive após logins posteriores.
  // A consulta usa somente o e-mail da sessão verificada do Supabase.
  const verifiedEmail = claimsData?.claims?.email;
  if (typeof verifiedEmail === "string" && verifiedEmail.length > 0) {
    await ensureClientAccess({ userId, email: verifiedEmail });
  }

  const admin = getSupabaseAdmin();
  const [diagnosticsResult, ordersResult, ebookProductResult, subscriptionAccess, subscriptionHistory] = await Promise.all([
    admin.from("diagnostics").select("id").eq("user_id",userId).limit(1),
    admin.from("orders").select("id,product_id").eq("user_id",userId).eq("status","paid").limit(200),
    admin.from("products").select("id,code").or("code.like.EBOOK-%,code.like.ENC-%"),
    getFiscalAccess(userId),
    admin.from("fiscal_subscriptions").select("id").eq("user_id",userId).limit(1)
  ]);
  const hasDiagnostics = Boolean(diagnosticsResult.data?.length);
  const ownedProductIds=new Set((ordersResult.data??[]).map(o=>o.product_id));
  const hasEncounter=Boolean(ebookProductResult.data?.some(p=>p.code.startsWith("ENC-")&&ownedProductIds.has(p.id)));
  const hasEbook=Boolean(ebookProductResult.data?.some(p=>p.code.startsWith("EBOOK-")&&ownedProductIds.has(p.id)));
  const hasSubscription = subscriptionAccess.allowed;
  const hasFiscalHistory = Boolean(subscriptionHistory.data?.length);
  const purchasedProductIds=[...new Set((ordersResult.data??[]).map(o=>o.product_id).filter((id):id is string=>typeof id==="string"))];
  let notices:MaterialNotice[]=[];
  if(purchasedProductIds.length) {
    const [{data:deliveries,error:deliveryError},{data:seen,error:seenError},{data:products,error:productsError}]=await Promise.all([
      admin.from("product_deliveries").select("product_id,version,published_at,page_path").in("product_id",purchasedProductIds).gt("version",0),
      admin.from("product_delivery_reads").select("product_id,seen_version").eq("user_id",userId).in("product_id",purchasedProductIds),
      admin.from("products").select("id,name,code").in("id",purchasedProductIds),
    ]);
    if(deliveryError||seenError||productsError) {
      console.error("Não foi possível consultar atualizações de materiais:",{deliveryError,seenError,productsError});
    } else {
      const lastSeen=new Map((seen??[]).map(x=>[x.product_id,x.seen_version]));
      const productsById=new Map((products??[]).map(x=>[x.id,x]));
      notices=(deliveries??[]).filter(d=>d.version>(lastSeen.get(d.product_id)??0)).map(d=>({
        product_id:d.product_id,
        name:productsById.get(d.product_id)?.name??"Material adquirido",
        version:d.version,published_at:d.published_at,
        href:productsById.get(d.product_id)?.code==="EBOOK-IBSCBS-001"?"/painel/ebooks":"/painel/minhas-compras",
      }));
    }
  }
  return <div className={styles.shell}>
    <header className={styles.topbar}>
      <a className={styles.brand} href="https://dianavoltolini.com.br" aria-label="Diana Voltolini — voltar ao site"><Image src="/brand/logo-light.png" alt="Diana Voltolini" width={1535} height={538} priority /></a>
      <div className={styles.noticeArea}><MaterialUpdatesBell notices={notices}/></div>
      <details className={styles.mobileTopMenu}><summary aria-label="Abrir menu de navegação"><span aria-hidden="true">☰</span></summary><nav aria-label="Menu do cliente"><a href="/painel">Visão Geral</a><a href="/painel/meus-dados">Meus Dados</a><a href="/painel/minhas-compras">Minhas Compras</a>{(hasDiagnostics||hasEbook||hasEncounter||hasSubscription||hasFiscalHistory)&&<div className={styles.mobilePurchaseLinks}>{hasDiagnostics&&<Link href="/painel/diagnosticos">Diagnósticos</Link>}{hasEbook&&<a href="/painel/ebooks">E-books</a>}{hasEncounter&&<a href="/painel/encontro-online">Encontro Online</a>}{(hasSubscription||hasFiscalHistory)&&<Link href="/painel/assinatura">Fiscal na Prática</Link>}</div>}<a href="/painel/outros-produtos">Outros Produtos</a><form action={logout}><button type="submit">Sair da conta</button></form></nav></details>
      <div className={styles.headerActions}>
        <a className={styles.siteLink} href="https://dianavoltolini.com.br" target="_blank" rel="noopener noreferrer">Visitar site ↗</a>
        <form action={logout}><button className={styles.logout} type="submit">Sair</button></form>
      </div>
    </header>
    <div className={styles.body}>
      <CustomerSidebar diagnostics={hasDiagnostics} subscriber={hasSubscription} ebooks={hasEbook} encounters={hasEncounter} hasFiscalHistory={hasFiscalHistory}/>
      <div className={styles.content}>{children}</div>
    </div>
  </div>;
}