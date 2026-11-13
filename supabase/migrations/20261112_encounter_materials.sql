-- supabase/migrations/20261112_encounter_materials.sql
-- Arquivos dos encontros no próprio card do produto; storage deve ser privado.
CREATE TABLE IF NOT EXISTS public.encounter_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title text NOT NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  published_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS encounter_materials_product_idx
  ON public.encounter_materials(product_id,active,published_at,display_order);
ALTER TABLE public.encounter_materials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.encounter_materials FROM anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.encounter_materials TO service_role;
-- Não publicar arquivos antes de carregá-los em bucket privado.
-- Para inserir um material, use o product_id do encontro e a localização
-- real do arquivo no Storage; published_at define a liberação.
