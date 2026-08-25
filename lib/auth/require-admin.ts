// lib/auth/require-admin.ts

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
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

  const userEmail =
    typeof claimsData?.claims?.email ===
    "string"
      ? claimsData.claims.email
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
      .select(
        "id, full_name, email, role, status",
      )
      .eq("id", userId)
      .maybeSingle();

  if (
    error ||
    !profile ||
    profile.status !== "active"
  ) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    redirect("/painel");
  }

  return {
    supabase,
    userId,
    userEmail,
    profile,
  };
}