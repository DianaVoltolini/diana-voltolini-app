-- Modelos de e-mail: dados editoriais e direcionamento
ALTER TABLE public.marketing_email_templates
 ADD COLUMN IF NOT EXISTS description TEXT,
 ADD COLUMN IF NOT EXISTS interest TEXT,
 ADD COLUMN IF NOT EXISTS landing_id UUID REFERENCES public.marketing_landings(id) ON DELETE SET NULL,
 ADD COLUMN IF NOT EXISTS cta_label TEXT,
 ADD COLUMN IF NOT EXISTS cta_url TEXT;
