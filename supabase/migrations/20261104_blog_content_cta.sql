-- CTA opcional por conteúdo público do Blog.
ALTER TABLE public.fiscal_articles
 ADD COLUMN IF NOT EXISTS cta_title text,
 ADD COLUMN IF NOT EXISTS cta_description text,
 ADD COLUMN IF NOT EXISTS cta_button_label text,
 ADD COLUMN IF NOT EXISTS cta_url text;

COMMENT ON COLUMN public.fiscal_articles.cta_title IS 'Título opcional do CTA específico do conteúdo';
COMMENT ON COLUMN public.fiscal_articles.cta_description IS 'Descrição opcional do CTA específico do conteúdo';
COMMENT ON COLUMN public.fiscal_articles.cta_button_label IS 'Texto do botão do CTA específico';
COMMENT ON COLUMN public.fiscal_articles.cta_url IS 'Destino do CTA; validado no formulário da Torre';
