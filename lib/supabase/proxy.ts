// lib/supabase/proxy.ts

import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

export async function updateSession(
  request: NextRequest,
) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              supabaseResponse.cookies.set(
                name,
                value,
                options,
              );
            },
          );

          Object.entries(headers).forEach(
            ([key, value]) => {
              supabaseResponse.headers.set(key, value);
            },
          );
        },
      },
    },
  );

  /*
   * Não inserir código entre a criação do cliente
   * e a validação das credenciais.
   */
  const { data } = await supabase.auth.getClaims();

  const userClaims = data?.claims;
  const pathname = request.nextUrl.pathname;

  const isPublicRoute =
    pathname === "/login" ||
    pathname.startsWith("/auth/");

  if (!userClaims && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = "/login";
    redirectUrl.search = "";

    if (pathname !== "/") {
      redirectUrl.searchParams.set(
        "retorno",
        pathname,
      );
    }

    return NextResponse.redirect(redirectUrl);
  }

  if (userClaims && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = "/painel";
    redirectUrl.search = "";

    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}