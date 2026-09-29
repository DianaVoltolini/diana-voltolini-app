// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\criar-acesso\actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ensureClientAccess,
  hasEligibleOrderForEmail,
} from "@/lib/supabase/client-access";
import { createClient } from "@/lib/supabase/server";

const PRODUCTION_ORIGIN =
  "https://app.dianavoltolini.com.br";

function normalizeEmail(
  value: string,
) {
  return value
    .trim()
    .toLowerCase();
}

function getSiteUrl() {
  if (
    process.env.NODE_ENV !==
    "development"
  ) {
    return PRODUCTION_ORIGIN;
  }

  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3001";

  return raw
    .trim()
    .replace(/\/+$/, "");
}

function getConfirmationCallbackUrl() {
  const url = new URL(
    "/auth/callback",
    `${getSiteUrl()}/`,
  );

  url.searchParams.set(
    "next",
    "/painel",
  );

  return url.toString();
}

function redirectToForm(
  params: Record<string, string>,
): never {
  const searchParams =
    new URLSearchParams(params);

  redirect(
    `/criar-acesso?${searchParams.toString()}`,
  );
}

export async function createAccess(
  formData: FormData,
) {
  const fullName =
    String(
      formData.get("fullName") ?? "",
    ).trim();

  const email =
    normalizeEmail(
      String(
        formData.get("email") ?? "",
      ),
    );

  const password =
    String(
      formData.get("password") ?? "",
    );

  const passwordConfirmation =
    String(
      formData.get(
        "passwordConfirmation",
      ) ?? "",
    );

  if (fullName.length < 3) {
    redirectToForm({
      erro: "nome-invalido",
      email,
    });
  }

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    redirectToForm({
      erro: "email-invalido",
      email,
    });
  }

  if (password.length < 8) {
    redirectToForm({
      erro: "senha-curta",
      email,
    });
  }

  if (
    password !==
    passwordConfirmation
  ) {
    redirectToForm({
      erro: "senhas-diferentes",
      email,
    });
  }

  let hasOrder = false;

  try {
    hasOrder =
      await hasEligibleOrderForEmail(
        email,
      );
  } catch (error) {
    console.error(
      "Erro ao verificar contratação:",
      error,
    );

    redirectToForm({
      erro:
        "verificacao-indisponivel",
      email,
    });
  }

  if (!hasOrder) {
    redirectToForm({
      erro: "sem-contratacao",
      email,
    });
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.auth.signUp({
      email,
      password,

      options: {
        emailRedirectTo:
          getConfirmationCallbackUrl(),

        data: {
          full_name:
            fullName,
        },
      },
    });

  if (error) {
    console.error(
      "Erro no cadastro Supabase:",
      error,
    );

    redirectToForm({
      erro:
        "cadastro-indisponivel",
      email,
    });
  }

  /*
   * Caso a confirmação de e-mail esteja
   * desativada, o Supabase já retorna
   * uma sessão e podemos entrar diretamente.
   */
  if (
    data.session &&
    data.user?.id &&
    data.user.email
  ) {
    try {
      await ensureClientAccess({
        userId: data.user.id,
        email: data.user.email,
        fullName,
      });
    } catch (linkError) {
      console.error(
        "Erro ao vincular contratação:",
        linkError,
      );

      await supabase.auth.signOut();

      redirectToForm({
        erro:
          "vinculo-indisponivel",
        email,
      });
    }

    revalidatePath(
      "/",
      "layout",
    );

    redirect("/painel");
  }

  /*
   * Com confirmação de e-mail habilitada,
   * o cliente precisa clicar na mensagem.
   * O callback abaixo criará a sessão e
   * enviará diretamente ao painel.
   */
  redirectToForm({
    sucesso:
      "verifique-email",
    email,
  });
}
