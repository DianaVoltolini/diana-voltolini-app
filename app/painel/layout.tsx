// app/painel/layout.tsx

import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import CustomerSidebar from "./customer-sidebar";
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
  const [diagnosticsResult, ordersResult, ebookProductResult, subscriptionAccess] = await Promise.all([
    admin.from("diagnostics").select("id").eq("user_id",userId).limit(1),
    admin.from("orders").select("id,product_id").eq("user_id",userId).eq("status","paid").limit(200),
    admin.from("products").select("id").eq("code","EBOOK-IBSCBS-001").maybeSingle(),
    getFiscalAccess(userId)
  ]);
  const hasDiagnostics = Boolean(diagnosticsResult.data?.length);
  const ebookProductId = ebookProductResult.data?.id;
  const hasEbook = Boolean(ebookProductId && ordersResult.data?.some(o => o.product_id === ebookProductId));
  const hasSubscription = subscriptionAccess.allowed;
  return <div className={styles.shell}>
    <CustomerSidebar diagnostics={hasDiagnostics} subscriber={hasSubscription} ebooks={hasEbook}/>
    <div className={styles.content}>{children}</div>
  </div>;
}