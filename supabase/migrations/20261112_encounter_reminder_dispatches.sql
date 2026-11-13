-- supabase/migrations/20261112_encounter_reminder_dispatches.sql
-- Registro único por pedido e lembrete; nunca repetir envio automaticamente.
CREATE TABLE IF NOT EXISTS public.encounter_reminder_dispatches (
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reminder_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('reserved','sent','failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(order_id,reminder_key)
);
ALTER TABLE public.encounter_reminder_dispatches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.encounter_reminder_dispatches FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.encounter_reminder_dispatches TO service_role;
