// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\esqueci-senha\actions.ts

"use server";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

function getAppOrigin() {
  return process.env.NODE_ENV ===
    "development"
    ? "http://localhost:3000"
    : "https://app.dianavoltolini.com.br";
}

export async function requestPasswordReset(
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

  if (!email) {
    redirect(
      "/esqueci-senha?erro=email-obrigatorio",
    );
  }

  const supabase =
    await createClient();

  const redirectTo =
    `${getAppOrigin()}/auth/callback?next=/redefinir-senha`;

  const {
    error,
  } =
    await supabase.auth
      .resetPasswordForEmail(
        email,
        {
          redirectTo,
        },
      );

  if (error) {
    console.error(
      "Erro ao enviar recuperação de senha:",
      error,
    );

    redirect(
      `/esqueci-senha?erro=envio-falhou&email=${encodeURIComponent(
        email,
      )}`,
    );
  }

  redirect(
    `/esqueci-senha?sucesso=1&email=${encodeURIComponent(
      email,
    )}`,
  );
}