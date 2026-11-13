// app/painel/encontro-online/actions.ts
"use server";

import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";


export async function confirmEncounterAttendance(formData: FormData) {
  const auth = await createClient();
  const {data: verified, error: authError} = await auth.auth.getUser();
  if (authError || !verified.user?.id) redirect("/login?retorno=%2Fpainel%2Fencontro-online");
  const userId = verified.user.id;
  const orderId = String(formData.get("orderId") ?? "").trim();
  const attendeeName = String(formData.get("attendeeName") ?? "").trim().replace(/\s+/g," ");
  const acknowledged = formData.get("termsAcknowledged") === "yes";
  const reminderOptIn = formData.get("reminderOptIn") === "yes";
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || attendeeName.length < 3 || attendeeName.length > 150 ||
      !acknowledged) {
    redirect("/painel/encontro-online?erro=dados");
  }
  const db = getSupabaseAdmin();
  // Nunca confiar em orderId/usuário do formulário: somente compra paga vinculada
  // à identidade autenticada pode registrar ou alterar confirmação de presença.
  const {data: purchase,error: purchaseError} = await db.from("orders")
    .select("id,product_id").eq("id",orderId)
    .eq("user_id",userId).eq("status","paid").not("paid_at","is",null).maybeSingle();
  if (purchaseError || !purchase) redirect("/painel/encontro-online?erro=compra");
  const {data: product,error: productError} = await db.from("products")
    .select("code").eq("id",purchase.product_id).maybeSingle();
  if (productError || !product?.code?.startsWith("ENC-")) redirect("/painel/encontro-online?erro=compra");

  const {error: saveError} = await db.from("encounter_attendance_confirmations")
    .upsert({order_id:orderId,user_id:userId,attendee_name:attendeeName,
      attendance_status:"confirmed",terms_acknowledged_at:new Date().toISOString(),
      reminder_opt_in:reminderOptIn,updated_at:new Date().toISOString()},{onConflict:"order_id"});
  if (saveError) throw new Error("Não foi possível salvar sua confirmação de presença.");
  revalidatePath("/painel/encontro-online");
  redirect("/painel/encontro-online?salvo=1");
}
