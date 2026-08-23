// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\login\actions.ts

"use server";

import {
  revalidatePath,
} from "next/cache";
import {
  redirect,
} from "next/navigation";

import {
  ensureClientAccess,
} from "@/lib/supabase/client-access";
import {
  createClient,
} from "@/lib/supabase/server";

function safeReturnPath(
  value: string,
) {
  if (
    value === "/painel" ||
    value.startsWith(
      "/painel/",
    )
  ) {
    return value;
  }

  return "/painel";
}

export async function login(
  formData: FormData,
) {
  const email =
    String(
      formData.get(
        "email",
      ) ?? "",
    )
      .trim()
      .toLowerCase();

  const password =
    String(
      formData.get(
        "password",
      ) ?? "",
    );

  const returnTo =
    safeReturnPath(
      String(
        formData.get(
          "retorno",
        ) ?? "",
      ),
    );

  if (
    !email ||
    !password
  ) {
    redirect(
      `/login?erro=campos-obrigatorios&email=${encodeURIComponent(
        email,
      )}`,
    );
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.auth
      .signInWithPassword({
        email,
        password,
      });

  if (error) {
    const emailNotConfirmed =
      error.code ===
        "email_not_confirmed" ||
      /email not confirmed/i.test(
        error.message,
      );

    if (emailNotConfirmed) {
      redirect(
        `/login?erro=email-nao-confirmado&email=${encodeURIComponent(
          email,
        )}`,
      );
    }

    redirect(
      `/login?erro=credenciais-invalidas&email=${encodeURIComponent(
        email,
      )}`,
    );
  }

  if (
    !data.user?.id ||
    !data.user.email
  ) {
    redirect(
      `/login?erro=credenciais-invalidas&email=${encodeURIComponent(
        email,
      )}`,
    );
  }

  const fullName =
    typeof data.user
      .user_metadata
      ?.full_name ===
      "string"
      ? data.user
          .user_metadata
          .full_name
      : null;

  try {
    await ensureClientAccess({
      userId:
        data.user.id,
      email:
        data.user.email,
      fullName,
    });
  } catch (linkError) {
    console.error(
      "Erro ao vincular contratação no login:",
      linkError,
    );

    await supabase.auth.signOut();

    redirect(
      `/login?erro=vinculo-indisponivel&email=${encodeURIComponent(
        email,
      )}`,
    );
  }

  revalidatePath(
    "/",
    "layout",
  );

  redirect(returnTo);
}