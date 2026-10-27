-- Execute no Supabase SQL Editor antes de integrar esta branch.
-- Preserva categoria fiscal existente e adiciona tipo de entrega editorial.
ALTER TABLE public.fiscal_articles
ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'geral';

UPDATE public.fiscal_articles
SET delivery_type = 'biblioteca'
WHERE visibility = 'subscriber' AND delivery_type = 'geral';

ALTER TABLE public.fiscal_articles
DROP CONSTRAINT IF EXISTS fiscal_articles_delivery_type_check;

ALTER TABLE public.fiscal_articles
ADD CONSTRAINT fiscal_articles_delivery_type_check
CHECK (delivery_type IN ('geral','radar','oficina','biblioteca','checklist'));

CREATE INDEX IF NOT EXISTS fiscal_articles_delivery_type_idx
ON public.fiscal_articles (delivery_type, published_at DESC)
WHERE status = 'published';
