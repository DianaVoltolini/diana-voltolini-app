-- supabase/migrations/20261113_commerce_v2_material_product_eligibility.sql
-- Uma só cópia do arquivo pode ser oferecida por vários produtos V2.
-- Relação de elegibilidade separada da configuração de quando entregar.
CREATE TABLE IF NOT EXISTS public.commerce_v2_material_product_eligibility (
  material_id uuid NOT NULL REFERENCES public.commerce_v2_materials(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.commerce_v2_products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (material_id,product_id)
);
CREATE INDEX IF NOT EXISTS commerce_v2_material_eligibility_product_idx
  ON public.commerce_v2_material_product_eligibility(product_id,material_id);
ALTER TABLE public.commerce_v2_material_product_eligibility ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commerce_v2_material_product_eligibility FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE
  ON public.commerce_v2_material_product_eligibility TO service_role;

-- Preservar o vínculo antigo de produto de referência, sem duplicar arquivos.
INSERT INTO public.commerce_v2_material_product_eligibility(material_id,product_id)
SELECT id,product_id FROM public.commerce_v2_materials
ON CONFLICT (material_id,product_id) DO NOTHING;

COMMENT ON TABLE public.commerce_v2_material_product_eligibility IS
  'Produtos que podem usar o material da Biblioteca V2; não libera acesso ao aluno nem define data.';
