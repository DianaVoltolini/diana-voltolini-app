// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\redefinir-senha\actions.ts

"use server";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

export async function updatePassword(
  formData: FormData,
) {
  const password =
    String(
      formData.get(
        "password",
      ) ?? "",
    );

  const passwordConfirmation =
    String(
      formData.get(
        "passwordConfirmation",
      ) ?? "",
    );

  if (
    !password ||
    !passwordConfirmation
  ) {
    redirect(
      "/redefinir-senha?erro=campos-obrigatorios",
    );
  }

  if (
    password.length <
    8
  ) {
    redirect(
      "/redefinir-senha?erro=senha-curta",
    );
  }

  if (
    password !==
    passwordConfirmation
  ) {
    redirect(
      "/redefinir-senha?erro=senhas-diferentes",
    );
  }

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      "/login?erro=recuperacao-invalida",
    );
  }

  const {
    error,
  } =
    await supabase.auth
      .updateUser({
        password,
      });

  if (error) {
    console.error(
      "Erro ao atualizar senha:",
      error,
    );

    const samePassword =
      error.code ===
        "same_password" ||
      /new password should be different from the old password/i.test(
        error.message,
      );

    if (
      samePassword
    ) {
      redirect(
        "/redefinir-senha?erro=senha-igual",
      );
    }

    redirect(
      "/redefinir-senha?erro=alteracao-falhou",
    );
  }

  const {
    error:
      signOutError,
  } =
    await supabase.auth
      .signOut();

  if (
    signOutError
  ) {
    console.error(
      "Senha alterada, mas houve erro ao encerrar sessão:",
      signOutError,
    );
  }

  redirect(
    "/login?sucesso=senha-atualizada",
  );
}