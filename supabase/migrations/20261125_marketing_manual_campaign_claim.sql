-- Adiciona processamento por campanha preservando a chamada da fila agendada.
CREATE OR REPLACE FUNCTION public.claim_marketing_manual_recipient(p_max_24h integer, p_send_id uuid)
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
  IF p_send_id IS NULL THEN
    RAISE EXCEPTION 'Campanha nao informada';
  END IF;
  IF p_max_24h IS NULL OR p_max_24h NOT BETWEEN 1 AND 900 THEN
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
    WHERE r.send_id=p_send_id AND r.status='pending' AND s.status='processing'
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
REVOKE ALL ON FUNCTION public.claim_marketing_manual_recipient(integer,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_marketing_manual_recipient(integer,uuid) TO service_role;
