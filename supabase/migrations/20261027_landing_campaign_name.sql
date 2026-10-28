-- Campo de nome público da landing independente do título.
ALTER TABLE public.marketing_landings
ADD COLUMN IF NOT EXISTS campaign_name TEXT;
