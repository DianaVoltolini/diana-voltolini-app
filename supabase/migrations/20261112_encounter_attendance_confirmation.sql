-- supabase/migrations/20261112_encounter_attendance_confirmation.sql
-- Registro de presença para inscritos com pedido pago.
CREATE TABLE IF NOT EXISTS public.encounter_attendance_confirmations (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendee_name text NOT NULL,
  attendance_status text NOT NULL CHECK (attendance_status IN ('confirmed','not_attending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS encounter_attendance_user_idx
  ON public.encounter_attendance_confirmations(user_id);
ALTER TABLE public.encounter_attendance_confirmations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.encounter_attendance_confirmations FROM anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.encounter_attendance_confirmations TO service_role;
