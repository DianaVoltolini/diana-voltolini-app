// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\lib\supabase\client-access.ts

import { getSupabaseAdmin } from "@/lib/supabase/admin";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function cleanName(
  value: string | null | undefined,
) {
  const cleaned = value?.trim() ?? "";

  return cleaned.length > 0
    ? cleaned
    : null;
}

export async function hasEligibleOrderForEmail(
  rawEmail: string,
) {
  const email = normalizeEmail(rawEmail);

  if (!email) {
    return false;
  }

  const supabase = getSupabaseAdmin();

  const { data, error } =
    await supabase
      .from("orders")
      .select("id")
      .ilike(
        "customer_email",
        email,
      )
      .in("status", [
        "pending",
        "paid",
      ])
      .limit(1);

  if (error) {
    throw new Error(
      `Não foi possível localizar a contratação: ${error.message}`,
    );
  }

  return (data?.length ?? 0) > 0;
}

type EnsureClientAccessParams = {
  userId: string;
  email: string;
  fullName?: string | null;
};

export async function ensureClientAccess({
  userId,
  email: rawEmail,
  fullName: rawFullName,
}: EnsureClientAccessParams) {
  const email =
    normalizeEmail(rawEmail);

  if (!userId || !email) {
    throw new Error(
      "Usuário autenticado inválido.",
    );
  }

  const supabase =
    getSupabaseAdmin();

  const now =
    new Date().toISOString();

  const {
    data: existingProfile,
    error: profileReadError,
  } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, status",
    )
    .eq("id", userId)
    .maybeSingle();

  if (profileReadError) {
    throw new Error(
      `Não foi possível consultar o perfil: ${profileReadError.message}`,
    );
  }

  if (
    existingProfile?.status ===
    "blocked"
  ) {
    throw new Error(
      "Este acesso está bloqueado.",
    );
  }

  const resolvedName =
    cleanName(rawFullName) ??
    cleanName(
      existingProfile?.full_name,
    ) ??
    email.split("@")[0];

  if (existingProfile) {
    const { error } =
      await supabase
        .from("profiles")
        .update({
          full_name:
            resolvedName,
          email,
          updated_at:
            now,
        })
        .eq("id", userId);

    if (error) {
      throw new Error(
        `Não foi possível atualizar o perfil: ${error.message}`,
      );
    }
  } else {
    const { error } =
      await supabase
        .from("profiles")
        .insert({
          id:
            userId,
          full_name:
            resolvedName,
          email,
          role:
            "client",
          status:
            "active",
          created_at:
            now,
          updated_at:
            now,
        });

    if (error) {
      throw new Error(
        `Não foi possível criar o perfil: ${error.message}`,
      );
    }
  }

  const {
    data: linkedOrders,
    error: linkError,
  } = await supabase
    .from("orders")
    .update({
      user_id:
        userId,
      updated_at:
        now,
    })
    .ilike(
      "customer_email",
      email,
    )
    .is(
      "user_id",
      null,
    )
    .in("status", [
      "pending",
      "paid",
    ])
    .select("id");

  if (linkError) {
    throw new Error(
      `Não foi possível vincular a contratação: ${linkError.message}`,
    );
  }

  return {
    linkedOrders:
      linkedOrders?.length ??
      0,
  };
}