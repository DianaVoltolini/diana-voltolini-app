-- Marketing: fila segura para campanhas manuais e descadastro
CREATE TABLE IF NOT EXISTS public.marketing_email_optouts(
 email text PRIMARY KEY,
 token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 opted_out_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.marketing_email_dispatches(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 template_id uuid NOT NULL REFERENCES public.marketing_email_templates(id),
 subject text NOT NULL,
 body text NOT NULL,
 cta_url text,
 cta_label text,
 interest text,
 landing_id uuid REFERENCES public.marketing_landings(id),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','paused','completed','canceled')),
 batch_size integer NOT NULL DEFAULT 10 CHECK(batch_size BETWEEN 1 AND 20),
 interval_minutes integer NOT NULL DEFAULT 15 CHECK(interval_minutes BETWEEN 5 AND 60),
 last_batch_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.marketing_email_recipients(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 dispatch_id uuid NOT NULL REFERENCES public.marketing_email_dispatches(id) ON DELETE CASCADE,
 email text NOT NULL,
 name text,
 unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted','failed','skipped')),
 claimed_at timestamptz,
 sent_at timestamptz,
 attempts integer NOT NULL DEFAULT 0,
 error text,
 UNIQUE(dispatch_id,email),
 UNIQUE(unsubscribe_token)
);
CREATE INDEX IF NOT EXISTS idx_marketing_email_queue ON public.marketing_email_recipients(dispatch_id,status);
ALTER TABLE public.marketing_email_optouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_email_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_email_recipients ENABLE ROW LEVEL SECURITY;
-- Somente service role; sem políticas públicas.
CREATE OR REPLACE FUNCTION public.marketing_claim_email_batch(p_dispatch_id uuid, p_batch_size int)
RETURNS TABLE(id uuid, email text, name text, unsubscribe_token uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 RETURN QUERY
 WITH take AS (
   SELECT r.id FROM public.marketing_email_recipients r
   WHERE r.dispatch_id=p_dispatch_id AND r.status='pending'
   ORDER BY r.id LIMIT LEAST(GREATEST(p_batch_size,1),20)
   FOR UPDATE SKIP LOCKED
 ), updated AS (
  UPDATE public.marketing_email_recipients r
  SET status='sending',claimed_at=now(), attempts=attempts+1
  WHERE r.id IN (SELECT take.id FROM take)
  RETURNING r.id,r.email,r.name,r.unsubscribe_token
 )
 SELECT updated.id,updated.email,updated.name,updated.unsubscribe_token FROM updated;
END $$;
REVOKE ALL ON FUNCTION public.marketing_claim_email_batch(uuid,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_claim_email_batch(uuid,int) TO service_role;
