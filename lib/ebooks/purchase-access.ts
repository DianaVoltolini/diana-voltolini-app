// lib/ebooks/purchase-access.ts
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ebookAccessUntil, ebookAccessActive } from "@/lib/ebooks/access";

// Uma compra confirmada de qualquer um dos dois produtos concede acesso
// ao MESMO e-book. Cada pagamento inicia 90 dias; vale o mais recente.
// A aquisição do encontro é também o registro da inscrição nessa turma.
export const EBOOK_PRODUCT_CODE = "EBOOK-IBSCBS-001";
export const ENCOUNTER_PRODUCT_CODE = "ENC-RT-2027-001";

export async function getEbookPurchaseAccess(userId: string) {
  const db = getSupabaseAdmin();
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
  const expiresAt = ebookAccessUntil(paidOrders);
  return {
    hasPaidOrder: paidOrders.length > 0,
    hasEncounterOrder: Boolean(encounterId && paidOrders.some(order => order.product_id === encounterId)),
    expiresAt,
    isActive: ebookAccessActive(expiresAt),
  };
}
