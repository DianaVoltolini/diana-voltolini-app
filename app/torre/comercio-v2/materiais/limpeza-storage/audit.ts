// app/torre/comercio-v2/materiais/limpeza-storage/audit.ts
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const BUCKET = "commerce-v2-materials";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const FILE = /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(pdf|docx|pptx|xlsx|png|jpg|jpeg|webp|zip|txt)$/i;

export function validMaterialPath(path: string) {
  const [folder, filename] = path.split("/");
  return FILE.test(path) && UUID.test(folder ?? "") && UUID.test((filename ?? "").split(".")[0]);
}

/** Consulta apenas o bucket V2 e falha fechado em consultas incompletas. */
export async function auditStorage() {
  const db = getSupabaseAdmin();
  const [productsResult, materialsResult] = await Promise.all([
    db.from("commerce_v2_products").select("id").limit(5001),
    db.from("commerce_v2_materials").select("storage_path").limit(5001),
  ]);
  if (productsResult.error || materialsResult.error ||
      !productsResult.data || !materialsResult.data ||
      productsResult.data.length > 5000 || materialsResult.data.length > 5000) {
    throw new Error("Não foi possível auditar integralmente os cadastros V2.");
  }
  const referenced = new Set(materialsResult.data.map(m => m.storage_path).filter((p): p is string => Boolean(p)));
  const stored: string[] = [];
  for (const product of productsResult.data) {
    if (!UUID.test(product.id)) throw new Error("Identificador de produto inválido.");
    for (let offset = 0; ; offset += 1000) {
      if (offset >= 10000) throw new Error("Limite de auditoria atingido. Nenhum arquivo pode ser excluído.");
      const { data, error } = await db.storage.from(BUCKET).list(product.id, {
        limit: 1000, offset, sortBy: { column: "name", order: "asc" },
      });
      if (error || !data) throw new Error("Falha na listagem do Storage: " + (error?.message ?? ""));
      for (const item of data) {
        if (item.id && validMaterialPath(product.id + "/" + item.name)) stored.push(product.id + "/" + item.name);
      }
      if (data.length < 1000) break;
    }
  }
  const files = [...new Set(stored)].sort();
  return {
    protectedCount: files.filter(p => referenced.has(p)).length,
    orphanPaths: files.filter(p => !referenced.has(p)),
    total: files.length,
    // Arquivos cuja nomenclatura não segue o padrão não são elegíveis para remoção por esta rotina.
  };
}
