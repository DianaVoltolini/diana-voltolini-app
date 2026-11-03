-- Fila de campanhas manuais: enfileiramento atomico e claim unico por destinatario.
-- Execute no Supabase SQL Editor antes de ativar o worker.
ALTER TABLE public.marketing_manual_sends
  ADD COLUMN IF NOT EXISTS subject_snapshot text,
  ADD COLUMN IF NOT EXISTS body_snapshot text,
  ADD COLUMN IF NOT EXISTS cta_url_snapshot text,
  ADD COLUMN IF NOT EXISTS cta_label_snapshot text;
ALTER TABLE public.marketing_manual_send_recipients
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_manual_recipients_pending
  ON public.marketing_manual_send_recipients (created_at, id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_manual_recipients_claimed
  ON public.marketing_manual_send_recipients (claimed_at)
  WHERE claimed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enqueue_marketing_manual_campaign(
  p_send_id uuid, p_template_id uuid, p_description text, p_interest text,
  p_landing_id uuid, p_recipients jsonb
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_template public.marketing_email_templates%ROWTYPE;
  v_count integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Operacao nao autorizada';
  END IF;
  IF p_recipients IS NULL OR jsonb_typeof(p_recipients) <> 'array'
    OR jsonb_array_length(p_recipients) = 0 OR jsonb_array_length(p_recipients) > 5000 THEN
    RAISE EXCEPTION 'Lista de destinatarios invalida';
  END IF;
  SELECT * INTO v_template FROM public.marketing_email_templates
    WHERE id = p_template_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Modelo indisponivel'; END IF;
  SELECT count(*) INTO v_count FROM (
    SELECT DISTINCT lower(btrim(t.email)) AS email
    FROM jsonb_to_recordset(p_recipients) AS t(email text, name text)
    WHERE t.email IS NOT NULL AND length(btrim(t.email)) BETWEEN 3 AND 320
  ) x;
  IF v_count <> jsonb_array_length(p_recipients) THEN
    RAISE EXCEPTION 'Destinatarios duplicados ou invalidos';
  END IF;

  INSERT INTO public.marketing_manual_sends
    (id,template_id,description,interest,landing_id,recipient_count,status,
     subject_snapshot,body_snapshot,cta_url_snapshot,cta_label_snapshot)
  VALUES
    (p_send_id,p_template_id,p_description,NULLIF(p_interest,''),p_landing_id,v_count,
     'processing',v_template.subject,v_template.body,v_template.cta_url,v_template.cta_label);

  INSERT INTO public.marketing_manual_send_recipients (send_id,email,lead_name,status)
  SELECT p_send_id,lower(btrim(t.email)),nullif(btrim(t.name),'') ,'pending'
  FROM jsonb_to_recordset(p_recipients) AS t(email text, name text);
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_marketing_manual_campaign(uuid,uuid,text,text,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_marketing_manual_campaign(uuid,uuid,text,text,uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_marketing_manual_recipient(p_max_24h integer DEFAULT 800)
RETURNS TABLE (
  recipient_id uuid, campaign_id uuid, email text, lead_name text,
  unsubscribe_token uuid, subject text, body text, cta_url text, cta_label text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_id uuid; v_total bigint;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Operacao nao autorizada';
  END IF;
  IF p_max_24h NOT BETWEEN 1 AND 900 THEN
    RAISE EXCEPTION 'Limite diario fora da faixa de seguranca';
  END IF;
  -- Serializa claims entre workers para evitar ultrapassar o limite.
  PERFORM pg_advisory_xact_lock(719183,202611);
  SELECT
    (SELECT count(*) FROM public.marketing_manual_send_recipients WHERE claimed_at >= now()-interval '24 hours')
    +
    (SELECT count(*) FROM public.marketing_email_deliveries WHERE claimed_at >= now()-interval '24 hours')
  INTO v_total;
  IF v_total >= p_max_24h THEN RETURN; END IF;
  SELECT r.id INTO v_id
    FROM public.marketing_manual_send_recipients r
    JOIN public.marketing_manual_sends s ON s.id=r.send_id
    WHERE r.status='pending' AND s.status='processing'
    ORDER BY r.created_at,r.id LIMIT 1 FOR UPDATE OF r SKIP LOCKED;
  IF v_id IS NULL THEN RETURN; END IF;
  UPDATE public.marketing_manual_send_recipients r SET status='sending',claimed_at=now()
    WHERE r.id=v_id AND r.status='pending';
  RETURN QUERY
    SELECT r.id,r.send_id,r.email,r.lead_name,r.unsubscribe_token,
      s.subject_snapshot,s.body_snapshot,s.cta_url_snapshot,s.cta_label_snapshot
    FROM public.marketing_manual_send_recipients r
    JOIN public.marketing_manual_sends s ON s.id=r.send_id
    WHERE r.id=v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_marketing_manual_recipient(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_marketing_manual_recipient(integer) TO service_role;
