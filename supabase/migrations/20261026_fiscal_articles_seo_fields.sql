-- Campos opcionais para otimização de resultados orgânicos.
-- Execute uma vez no SQL Editor do Supabase antes de publicar os dois aplicativos.
ALTER TABLE public.fiscal_articles
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text;

ALTER TABLE public.fiscal_articles
  DROP CONSTRAINT IF EXISTS fiscal_articles_seo_title_length;
ALTER TABLE public.fiscal_articles
  ADD CONSTRAINT fiscal_articles_seo_title_length
  CHECK (seo_title IS NULL OR char_length(seo_title) <= 180);

ALTER TABLE public.fiscal_articles
  DROP CONSTRAINT IF EXISTS fiscal_articles_seo_description_length;
ALTER TABLE public.fiscal_articles
  ADD CONSTRAINT fiscal_articles_seo_description_length
  CHECK (seo_description IS NULL OR char_length(seo_description) <= 320);
