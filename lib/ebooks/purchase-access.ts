// lib/ebooks/purchase-access.ts
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureClientAccess } from "@/lib/supabase/client-access";
import { ebookAccessUntil, ebookAccessActive } from "@/lib/ebooks/access";

// Uma compra confirmada de qualquer um dos dois produtos concede acesso
// ao MESMO e-book. Cada pagamento inicia 90 dias; vale o mais recente.
// A aquisição do encontro é também o registro da inscrição nessa turma.
export const EBOOK_PRODUCT_CODE = "EBOOK-IBSCBS-001";
export const ENCOUNTER_PRODUCT_CODE = "ENC-RT-2027-001";

export async function getEbookPurchaseAccess(userId: string) {
  const db = getSupabaseAdmin();

  // O cliente pode comprar enquanto já está logado. Nesse caso o pedido
  // é criado publicamente com user_id nulo e não passa por novo login.
  // Vincular somente pedidos ainda sem dono, após conferir o usuário real
  // pelo Auth, nunca usando e-mail fornecido pelo navegador.
  const auth = await createClient();
  const { data: verified, error: authError } = await auth.auth.getUser();
  if (authError || !verified.user || verified.user.id !== userId || !verified.user.email) {
    throw new Error("Não foi possível confirmar a identidade do cliente.");
  }
  const email = verified.user.email.trim().toLowerCase();
  const { data: pendingLink, error: pendingLinkError } = await db.from("orders")
    .select("id")
    .ilike("customer_email", email)
    .is("user_id", null)
    .in("status", ["pending", "paid"])
    .limit(1);
  if (pendingLinkError) throw new Error("Não foi possível conferir o vínculo da compra.");
  if (pendingLink?.length) {
    await ensureClientAccess({
      userId,
      email,
      fullName: typeof verified.user.user_metadata?.full_name === "string"
        ? verified.user.user_metadata.full_name : null,
    });
  }

  const { data: products, error: productError } = await db.from("products")
    .select("id,code")
    .in("code", [EBOOK_PRODUCT_CODE, ENCOUNTER_PRODUCT_CODE]);
  if (productError) throw new Error("Não foi possível localizar os produtos.");
  const ebookId = products?.find(product => product.code === EBOOK_PRODUCT_CODE)?.id;
  const encounterId = products?.find(product => product.code === ENCOUNTER_PRODUCT_CODE)?.id;
  const productIds = [ebookId, encounterId].filter((id): id is string => Boolean(id));

  if (!productIds.length) return {
    hasPaidOrder: false, hasEncounterOrder: false,
    expiresAt: null as Date | null, isActive: false,
    hasDirectEbookOrder: false, directEbookExpiresAt: null as Date | null,
    directEbookActive: false,
  };

  const { data: orders, error: orderError } = await db.from("orders")
    .select("product_id,paid_at,created_at")
    .eq("user_id", userId)
    .in("product_id", productIds)
    .eq("status", "paid")
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false })
    .limit(100);
  if (orderError) throw new Error("Não foi possível verificar suas compras.");

  const paidOrders = orders ?? [];
  const directEbookOrders = paidOrders.filter(order => order.product_id === ebookId);
  const directEbookExpiresAt = ebookAccessUntil(directEbookOrders);
  const expiresAt = ebookAccessUntil(paidOrders);
  return {
    hasPaidOrder: paidOrders.length > 0,
    hasDirectEbookOrder: directEbookOrders.length > 0,
    directEbookExpiresAt,
    directEbookActive: ebookAccessActive(directEbookExpiresAt),
    hasEncounterOrder: Boolean(encounterId && paidOrders.some(order => order.product_id === encounterId)),
    expiresAt,
    isActive: ebookAccessActive(expiresAt),
  };
}
