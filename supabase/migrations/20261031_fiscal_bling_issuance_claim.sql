-- supabase/migrations/20261031_fiscal_bling_issuance_claim.sql
-- Controle local fail-closed de tentativa de emissão; NÃO envia cobrança ao Bling.
-- NÃO APLICAR EM PRODUÇÃO ANTES DE HOMOLOGAR E REVISAR O SCHEMA.
-- Cada pedido de renovação recebe no máximo um claim. Em caso de timeout,
-- mantém-se reconcile_required, sem possibilidade de novo POST automático.

CREATE TABLE IF NOT EXISTS public.fiscal_bling_issuance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL UNIQUE REFERENCES public.fiscal_subscription_invoices(id),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id),
  subscription_id uuid NOT NULL REFERENCES public.fiscal_subscriptions(id),
  state text NOT NULL DEFAULT 'claimed'
    CHECK (state IN ('claimed','reconcile_required','linked','cancelled')),
  provider_order_id text,
  provider_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fiscal_bling_claim_linked_ids CHECK (
    state <> 'linked' OR (provider_order_id IS NOT NULL AND provider_payment_id IS NOT NULL)
  )
);
ALTER TABLE public.fiscal_bling_issuance_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fiscal_bling_issuance_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.fiscal_bling_issuance_claims TO service_role;

CREATE OR REPLACE FUNCTION public.claim_fiscal_bling_issuance(
  p_invoice_id uuid,
  p_user_id uuid
)
RETURNS TABLE(claim_id uuid, claim_state text, is_new boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_invoice public.fiscal_subscription_invoices%ROWTYPE;
  v_subscription public.fiscal_subscriptions%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_claim public.fiscal_bling_issuance_claims%ROWTYPE;
  v_inserted boolean := false;
BEGIN
  IF p_invoice_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'Identificação inválida';
  END IF;

  SELECT * INTO v_invoice
  FROM public.fiscal_subscription_invoices WHERE id=p_invoice_id FOR UPDATE;
  IF NOT FOUND OR v_invoice.status <> 'pending' OR v_invoice.order_id IS NULL THEN
    RAISE EXCEPTION 'Mensalidade indisponível';
  END IF;

  SELECT * INTO v_subscription FROM public.fiscal_subscriptions
  WHERE id=v_invoice.subscription_id FOR UPDATE;
  IF NOT FOUND OR v_subscription.user_id IS DISTINCT FROM p_user_id
    OR v_subscription.renewal_enabled IS DISTINCT FROM true
    OR v_subscription.cancellation_requested_at IS NOT NULL
    OR v_subscription.status NOT IN ('active','past_due') THEN
    RAISE EXCEPTION 'Assinatura não elegível';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=v_invoice.order_id FOR UPDATE;
  IF NOT FOUND OR v_order.user_id IS DISTINCT FROM p_user_id
    OR v_order.status <> 'pending'
    OR v_order.payment_provider IS DISTINCT FROM 'bling'
    OR v_order.provider_order_id IS NOT NULL
    OR v_order.amount_cents IS DISTINCT FROM v_invoice.amount_cents
    OR v_order.metadata->>'fiscal_subscription_id' IS DISTINCT FROM v_subscription.id::text
    OR v_order.metadata->>'reference_month' IS DISTINCT FROM v_invoice.reference_month::text
    OR v_order.product_id IS DISTINCT FROM (
      SELECT p.id FROM public.products p WHERE p.code = 'ASSINATURA-FISCAL-001'
    )
    OR v_order.metadata->>'fiscal_renewal' IS DISTINCT FROM 'true'
    OR v_order.metadata->>'checkout_state' IS DISTINCT FROM 'reserved' THEN
    -- Se já houver registro externo, não criar outro; exige conciliação.
    RAISE EXCEPTION 'Pedido exige conferência antes de emitir cobrança';
  END IF;

  -- Um payment já persistido significa possível cobrança externa:
  -- a emissão exige conciliação, mesmo sem provider_order_id no pedido.
  IF EXISTS (SELECT 1 FROM public.payments pay WHERE pay.order_id = v_order.id) THEN
    RAISE EXCEPTION 'Pagamento já registrado; conciliar antes de nova emissão';
  END IF;

  -- Sem duplicar tentativas; claims existentes são SEMPRE apenas consultivos.
  INSERT INTO public.fiscal_bling_issuance_claims (invoice_id,order_id,subscription_id,state)
  VALUES (v_invoice.id,v_order.id,v_subscription.id,'claimed')
  ON CONFLICT DO NOTHING
  RETURNING * INTO v_claim;
  v_inserted := FOUND;

  IF NOT v_inserted THEN
    SELECT * INTO v_claim FROM public.fiscal_bling_issuance_claims
    WHERE invoice_id=v_invoice.id OR order_id=v_order.id FOR UPDATE;
    IF NOT FOUND OR v_claim.invoice_id IS DISTINCT FROM v_invoice.id
      OR v_claim.order_id IS DISTINCT FROM v_order.id THEN
      RAISE EXCEPTION 'Conflito de identificação da cobrança';
    END IF;
  END IF;

  RETURN QUERY SELECT v_claim.id,v_claim.state,v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_fiscal_bling_issuance(uuid,uuid)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_fiscal_bling_issuance(uuid,uuid) TO service_role;

-- Atenção: is_new=true NÃO autoriza, isoladamente, POST no Bling.
-- Definir/revisar protocolo de reconciliação e estado externo antes da integração.
