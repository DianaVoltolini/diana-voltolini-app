-- Comércio V2 — adicionar categoria Exercícios à biblioteca já criada.
-- Não altera materiais existentes, produtos legados ou arquivos do Storage.
BEGIN;

ALTER TABLE public.commerce_v2_materials
  DROP CONSTRAINT IF EXISTS commerce_v2_materials_category_check;

ALTER TABLE public.commerce_v2_materials
  ADD CONSTRAINT commerce_v2_materials_category_check
  CHECK (category IN (
    'slides','ebook','worksheet','checklist','script','image',
    'support','exercises','other'
  ));

COMMIT;

-- Conferência somente leitura:
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.commerce_v2_materials'::regclass
  AND conname = 'commerce_v2_materials_category_check';
