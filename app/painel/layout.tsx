// app/painel/layout.tsx

import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import CustomerSidebar from "./customer-sidebar";
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

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const [diagnosticsResult, ordersResult, ebookProductResult, subscriptionResult] = await Promise.all([
    admin.from("diagnostics").select("id").eq("user_id",userId).limit(1),
    admin.from("orders").select("id,product_id").eq("user_id",userId).eq("status","paid").limit(200),
    admin.from("products").select("id").eq("code","EBOOK-IBSCBS-001").maybeSingle(),
    admin.from("fiscal_subscriptions").select("id").eq("user_id",userId).eq("status","active").gt("paid_until",now).limit(1)
  ]);
  const hasDiagnostics = Boolean(diagnosticsResult.data?.length);
  const hasEbook = Boolean(ebookProductResult.data && ordersResult.data?.some(o=>o.product_id===ebookProductResult.data.id));
  const hasSubscription = !subscriptionResult.error && Boolean(subscriptionResult.data?.length);
  return <div className={styles.shell}>
    <CustomerSidebar diagnostics={hasDiagnostics} subscriber={hasSubscription} ebooks={hasEbook}/>
    <div className={styles.content}>{children}</div>
  </div>;
}