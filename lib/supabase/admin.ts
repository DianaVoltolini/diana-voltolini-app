// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\lib\supabase\admin.ts

import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (
    !supabaseUrl ||
    !supabaseSecretKey
  ) {
    throw new Error(
      "As variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY não foram configuradas.",
    );
  }

  return createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}