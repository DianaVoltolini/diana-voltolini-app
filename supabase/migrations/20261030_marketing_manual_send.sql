-- Envio manual: campanhas independentes dos modelos e entregas automáticas
CREATE TABLE IF NOT EXISTS public.marketing_manual_sends (
 id uuid PRIMARY KEY,
 template_id uuid NOT NULL REFERENCES public.marketing_email_templates(id),
 description text NOT NULL,
 interest text,
 landing_id uuid,
 recipient_count integer NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'processing' CHECK(status IN ('processing','completed','partial')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.marketing_manual_send_recipients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 send_id uuid NOT NULL REFERENCES public.marketing_manual_sends(id),
 email text NOT NULL,
 lead_name text,
 unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted','failed','skipped')),
 accepted_at timestamptz,
 error_message text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(send_id,email)
);
CREATE INDEX IF NOT EXISTS idx_manual_recipients_send ON public.marketing_manual_send_recipients(send_id,status);
ALTER TABLE public.marketing_manual_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_manual_send_recipients ENABLE ROW LEVEL SECURITY;
-- Acesso exclusivamente por servidor com SUPABASE_SECRET_KEY.
