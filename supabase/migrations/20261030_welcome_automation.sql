-- 2026-10-30 - Automação simples de newsletter
ALTER TABLE public.marketing_email_templates
 ADD COLUMN IF NOT EXISTS auto_enabled boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS auto_include_existing boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS public.marketing_email_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 template_id uuid NOT NULL REFERENCES public.marketing_email_templates(id),
 email text NOT NULL,
 lead_id uuid,
 lead_name text,
 unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted','failed','skipped')),
 claimed_at timestamptz,
 accepted_at timestamptz,
 attempt_count integer NOT NULL DEFAULT 0,
 error_message text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT unique_template_recipient UNIQUE(template_id,email)
);
CREATE TABLE IF NOT EXISTS public.marketing_email_unsubscribes (
 email text PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketing_deliveries_status ON public.marketing_email_deliveries(status,created_at);
ALTER TABLE public.marketing_email_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_email_unsubscribes ENABLE ROW LEVEL SECURITY;
-- Tabelas acessadas apenas pelo serviço no servidor, sem policies públicas.
