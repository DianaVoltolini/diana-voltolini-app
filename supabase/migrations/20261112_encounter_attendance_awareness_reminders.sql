-- supabase/migrations/20261112_encounter_attendance_awareness_reminders.sql
-- Acrescenta ciência das condições e autorização de lembrete por evento.
-- Preserva registros anteriores; consentimentos não são presumidos.
ALTER TABLE public.encounter_attendance_confirmations
  ADD COLUMN IF NOT EXISTS terms_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_opt_in boolean NOT NULL DEFAULT false;
