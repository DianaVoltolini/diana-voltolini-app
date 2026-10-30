-- Newsletter da página inicial (dianavoltolini.com.br)
CREATE TABLE IF NOT EXISTS public.marketing_newsletter_subscribers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text,
 email text NOT NULL UNIQUE,
 newsletter_opt_in boolean NOT NULL DEFAULT true,
 newsletter_consented_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketing_newsletter_optin ON public.marketing_newsletter_subscribers(newsletter_opt_in,created_at);
ALTER TABLE public.marketing_newsletter_subscribers ENABLE ROW LEVEL SECURITY;
-- Somente o servidor usa a chave de serviço; nenhuma política de escrita pública.
