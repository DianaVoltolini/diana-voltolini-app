-- supabase/migrations/20261113_commerce_v2_material_types.sql
-- Cadastro de tipos de materiais administrado na Torre. Sem alteração nos registros existentes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.commerce_v2_material_types (
  code text PRIMARY KEY
    CHECK (code ~ '^[a-z][a-z0-9_]{1,29}$'),
  name text NOT NULL
    CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.commerce_v2_material_types(code,name) VALUES
 ('slides','Slides'),('ebook','E-book'),('worksheet','Planilha'),
 ('checklist','Checklist'),('script','Roteiro'),('exercises','Exercícios'),
 ('image','Imagem'),('support','Material de apoio'),('other','Outro')
ON CONFLICT (code) DO NOTHING;

-- Preserva também categorias não previstas que eventualmente já estejam em uso.
INSERT INTO public.commerce_v2_material_types(code,name,is_active)
SELECT DISTINCT m.category,m.category,true
FROM public.commerce_v2_materials m
WHERE m.category IS NOT NULL
  AND m.category ~ '^[a-z][a-z0-9_]{1,29}$'
ON CONFLICT (code) DO NOTHING;

-- A lista deixa de ser fixa no banco; validação relacional preserva integridade.
ALTER TABLE public.commerce_v2_materials
  DROP CONSTRAINT IF EXISTS commerce_v2_materials_category_check;

ALTER TABLE public.commerce_v2_materials
  ADD CONSTRAINT commerce_v2_materials_category_fk
  FOREIGN KEY (category)
  REFERENCES public.commerce_v2_material_types(code)
  ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE public.commerce_v2_material_types ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commerce_v2_material_types FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.commerce_v2_material_types TO service_role;

COMMENT ON TABLE public.commerce_v2_material_types IS
 'Tipos cadastrados na Torre; código estável, nome editável, ativação controlada.';
COMMIT;

SELECT code,name,is_active FROM public.commerce_v2_material_types ORDER BY name;
