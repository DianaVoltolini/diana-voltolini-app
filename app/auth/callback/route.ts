// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\auth\callback\route.ts

import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  ensureClientAccess,
} from "@/lib/supabase/client-access";

import {
  createClient,
} from "@/lib/supabase/server";

const PRODUCTION_ORIGIN =
  "https://app.dianavoltolini.com.br";

function safeNextPath(
  value: string | null,
) {
  if (
    value ===
    "/redefinir-senha"
  ) {
    return value;
  }

  if (
    value === "/painel" ||
    value?.startsWith(
      "/painel/",
    )
  ) {
    return value;
  }

  return "/painel";
}

function getAppOrigin() {
  if (
    process.env.NODE_ENV ===
    "development"
  ) {
    return "http://localhost:3000";
  }

  return PRODUCTION_ORIGIN;
}

export async function GET(
  request: NextRequest,
) {
  const requestUrl =
    new URL(
      request.url,
    );

  const code =
    requestUrl.searchParams.get(
      "code",
    );

  const next =
    safeNextPath(
      requestUrl.searchParams.get(
        "next",
      ),
    );

  const appOrigin =
    getAppOrigin();

  const errorUrl =
    new URL(
      "/login",
      appOrigin,
    );

  errorUrl.searchParams.set(
    "erro",
    next ===
      "/redefinir-senha"
      ? "recuperacao-invalida"
      : "confirmacao-invalida",
  );

  if (!code) {
    return NextResponse.redirect(
      errorUrl,
    );
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.auth
      .exchangeCodeForSession(
        code,
      );

  if (
    error ||
    !data.user?.id ||
    !data.user.email
  ) {
    console.error(
      "Erro ao criar sessão após confirmação:",
      error,
    );

    return NextResponse.redirect(
      errorUrl,
    );
  }

  if (
    next ===
    "/redefinir-senha"
  ) {
    return NextResponse.redirect(
      new URL(
        "/redefinir-senha",
        appOrigin,
      ),
    );
  }

  const fullName =
    typeof data.user.user_metadata
      ?.full_name ===
      "string"
      ? data.user.user_metadata
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
      "Erro ao vincular contratação após confirmação:",
      linkError,
    );

    await supabase.auth
      .signOut();

    const linkErrorUrl =
      new URL(
        "/login",
        appOrigin,
      );

    linkErrorUrl.searchParams.set(
      "erro",
      "vinculo-indisponivel",
    );

    return NextResponse.redirect(
      linkErrorUrl,
    );
  }

  return NextResponse.redirect(
    new URL(
      next,
      appOrigin,
    ),
  );
}