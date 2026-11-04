-- Controle compartilhado de 800 tentativas por 24h entre envios manuais
-- e automáticos. Migração necessária ANTES de implantar o worker atualizado.
CREATE OR REPLACE FUNCTION public.claim_marketing_automatic_delivery(
 p_delivery_id uuid, p_max_24h integer DEFAULT 800
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_claimed uuid; v_count bigint;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'Operacao nao autorizada';
 END IF;
 IF p_max_24h NOT BETWEEN 1 AND 900 THEN
   RAISE EXCEPTION 'Limite diario fora da faixa de seguranca';
 END IF;
 PERFORM pg_advisory_xact_lock(719183,202611);
 SELECT
   (SELECT count(*) FROM public.marketing_manual_send_recipients WHERE claimed_at >= now()-interval '24 hours')
   +
   (SELECT count(*) FROM public.marketing_email_deliveries WHERE claimed_at >= now()-interval '24 hours')
 INTO v_count;
 IF v_count >= p_max_24h THEN RETURN false; END IF;
 UPDATE public.marketing_email_deliveries
 SET status='sending',claimed_at=now(),attempt_count=1
 WHERE id=p_delivery_id AND status='pending'
 RETURNING id INTO v_claimed;
 RETURN v_claimed IS NOT NULL;
END;$$;
REVOKE ALL ON FUNCTION public.claim_marketing_automatic_delivery(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_marketing_automatic_delivery(uuid,integer) TO service_role;
