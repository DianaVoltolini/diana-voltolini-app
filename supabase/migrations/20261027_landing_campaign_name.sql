-- Campo de nome público da landing independente do título.
ALTER TABLE public.marketing_landings
ADD COLUMN IF NOT EXISTS campaign_name TEXT;

-- A capa aceita PDF e também imagens. Material principal segue validado como PDF na aplicação.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf','image/png','image/jpeg','image/webp']
WHERE id = 'marketing-deliveries';
