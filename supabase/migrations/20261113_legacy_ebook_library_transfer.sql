-- supabase/migrations/20261113_legacy_ebook_library_transfer.sql
-- Controle idempotente de cópia do e-book legado para a Biblioteca V2.
-- Mantém integralmente a entrega e o histórico existentes até homologação.
CREATE TABLE IF NOT EXISTS public.commerce_v2_legacy_material_imports (
  legacy_product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE RESTRICT,
  material_id uuid NOT NULL UNIQUE REFERENCES public.commerce_v2_materials(id) ON DELETE RESTRICT,
  legacy_version integer NOT NULL CHECK (legacy_version > 0),
  imported_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commerce_v2_legacy_material_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commerce_v2_legacy_material_imports FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.commerce_v2_legacy_material_imports TO service_role;
COMMENT ON TABLE public.commerce_v2_legacy_material_imports IS
  'Registro de cópia do PDF vigente legado para Biblioteca V2; não comuta as entregas existentes.';
