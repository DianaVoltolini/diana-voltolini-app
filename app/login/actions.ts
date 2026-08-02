// app/login/actions.ts

"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?erro=campos-obrigatorios");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?erro=credenciais-invalidas");
  }

  redirect("/painel");
}