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

function safeNextPath(
  value: string | null,
) {
  if (
    value === "/painel" ||
    value?.startsWith("/painel/")
  ) {
    return value;
  }

  return "/painel";
}

export async function GET(
  request: NextRequest,
) {
  const requestUrl =
    new URL(request.url);

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

  const errorUrl =
    request.nextUrl.clone();

  errorUrl.pathname =
    "/login";

  errorUrl.search = "";

  errorUrl.searchParams.set(
    "erro",
    "confirmacao-invalida",
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

  const fullName =
    typeof data.user.user_metadata
      ?.full_name === "string"
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

    await supabase.auth.signOut();

    errorUrl.searchParams.set(
      "erro",
      "vinculo-indisponivel",
    );

    return NextResponse.redirect(
      errorUrl,
    );
  }

  const destination =
    request.nextUrl.clone();

  destination.pathname =
    next;

  destination.search =
    "";

  return NextResponse.redirect(
    destination,
  );
}