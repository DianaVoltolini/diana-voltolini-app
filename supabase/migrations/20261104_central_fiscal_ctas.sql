-- Biblioteca central de CTAs reutilizáveis no Blog.
CREATE TABLE IF NOT EXISTS public.fiscal_ctas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 180),
 description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 600),
 button_label text NOT NULL CHECK (char_length(button_label) BETWEEN 1 AND 80),
 url text NOT NULL CHECK (char_length(url) BETWEEN 1 AND 500),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fiscal_ctas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fiscal_ctas FROM anon, authenticated;
ALTER TABLE public.fiscal_articles
 ADD COLUMN IF NOT EXISTS cta_id uuid REFERENCES public.fiscal_ctas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_fiscal_articles_cta_id ON public.fiscal_articles(cta_id);

-- Preserva CTAs personalizados já cadastrados nos conteúdos, transformando-os
-- em itens reutilizáveis sem afetar os textos publicados.
WITH existing AS (
 SELECT DISTINCT cta_title,cta_description,cta_button_label,cta_url
 FROM public.fiscal_articles
 WHERE cta_title IS NOT NULL AND btrim(cta_title)<>''
   AND cta_description IS NOT NULL AND btrim(cta_description)<>''
   AND cta_button_label IS NOT NULL AND btrim(cta_button_label)<>''
   AND cta_url IS NOT NULL AND btrim(cta_url)<>''
   AND cta_id IS NULL
), inserted AS (
 INSERT INTO public.fiscal_ctas (name,title,description,button_label,url)
 SELECT left('CTA — '||cta_title,120),cta_title,cta_description,cta_button_label,cta_url
 FROM existing
 RETURNING id,title,description,button_label,url
)
UPDATE public.fiscal_articles a SET cta_id=i.id
FROM inserted i
WHERE a.cta_id IS NULL AND a.cta_title=i.title
 AND a.cta_description=i.description
 AND a.cta_button_label=i.button_label AND a.cta_url=i.url;
