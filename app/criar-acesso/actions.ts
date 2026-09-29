// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\criar-acesso\actions.ts

"use server";

import { redirect } from "next/navigation";

import {
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

  /*
   * Garante que um primeiro acesso nunca
   * aproveite uma sessão já existente no
   * navegador.
   */
  await supabase.auth.signOut({
    scope: "local",
  });

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
   * A confirmação de e-mail é obrigatória
   * para o primeiro acesso.
   *
   * Mesmo que uma sessão seja devolvida por
   * alguma configuração externa, ela não é
   * mantida aqui. O acesso ao painel somente
   * será criado pelo callback depois que o
   * cliente confirmar o e-mail.
   */
  if (data.session) {
    await supabase.auth.signOut({
      scope: "local",
    });
  }

  redirectToForm({
    sucesso:
      "verifique-email",
    email,
  });
}
