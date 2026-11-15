-- supabase/migrations/20261114_commerce_v2_material_file_updated_at.sql
-- Diferenciar edição do cadastro e substituição real do arquivo.
-- Não alterar versões existentes nem notificar materiais já publicados.
ALTER TABLE public.commerce_v2_materials
  ADD COLUMN IF NOT EXISTS file_updated_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.commerce_v2_materials.file_updated_at IS
  'Momento da substituição real de arquivo na Biblioteca V2. NULL indica arquivo inicial ou ainda não substituído.';
