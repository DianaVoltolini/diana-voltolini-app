-- supabase/migrations/20261031_fiscal_renewal_reservation.sql
-- Preparação ATÔMICA e IDEMPOTENTE de mensalidade; não chama o Bling.
-- REVISAR E TESTAR ANTES DE APLICAR EM PRODUÇÃO.
-- Função restrita ao service_role; chamada somente após autenticação no servidor.

CREATE UNIQUE INDEX IF NOT EXISTS fiscal_invoice_one_order
ON public.fiscal_subscription_invoices (order_id)
WHERE order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reserve_fiscal_renewal(
  p_subscription_id uuid,
  p_user_id uuid
)
RETURNS TABLE(invoice_id uuid, reserved_order_id uuid, reference_month date, due_date date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sub public.fiscal_subscriptions%ROWTYPE;
  v_invoice public.fiscal_subscription_invoices%ROWTYPE;
  v_original public.orders%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_due date;
  v_reference date;
  v_today date;
  v_order_id uuid;
  v_method text;
BEGIN
  IF p_subscription_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'Identificação de assinatura inválida';
  END IF;

  -- serializa concorrência, inclusive quando duas abas solicitam renovação
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_subscription_id::text, 733821)
  );
  SELECT * INTO v_sub
  FROM public.fiscal_subscriptions
  WHERE id = p_subscription_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_sub.status NOT IN ('active','past_due')
    OR v_sub.renewal_enabled IS DISTINCT FROM true
    OR v_sub.cancellation_requested_at IS NOT NULL
    OR v_sub.paid_until IS NULL THEN
    RAISE EXCEPTION 'Assinatura não elegível para renovação';
  END IF;

  v_today := (pg_catalog.now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_due := (v_sub.paid_until AT TIME ZONE 'America/Sao_Paulo')::date;
  IF v_today < v_due - 10 OR v_today > v_due + 3 THEN
    RAISE EXCEPTION 'Renovação fora do período permitido';
  END IF;

  v_reference := pg_catalog.date_trunc('month',v_due::timestamp)::date;

  SELECT * INTO v_invoice
  FROM public.fiscal_subscription_invoices i
  WHERE i.subscription_id = p_subscription_id
    AND i.reference_month = v_reference
  FOR UPDATE;

  IF FOUND THEN
    IF v_invoice.status = 'pending' AND v_invoice.order_id IS NOT NULL THEN
      RETURN QUERY SELECT v_invoice.id,v_invoice.order_id,v_invoice.reference_month,v_invoice.due_date;
      RETURN;
    END IF;
    RAISE EXCEPTION 'Mensalidade já registrada; verificar situação antes de criar outra';
  END IF;

  SELECT * INTO v_product
  FROM public.products
  WHERE code = 'ASSINATURA-FISCAL-001' AND active = true;
  IF NOT FOUND OR v_product.price_cents <= 0 OR v_product.currency <> 'BRL' THEN
    RAISE EXCEPTION 'Produto da assinatura não está disponível';
  END IF;

  -- Reutiliza apenas identidade comprovada no pedido da primeira mensalidade paga.
  SELECT o.* INTO v_original
  FROM public.fiscal_subscription_invoices i
  JOIN public.orders o ON o.id = i.order_id
  WHERE i.subscription_id = p_subscription_id
    AND i.status = 'paid'
    AND o.user_id = p_user_id
    AND o.status = 'paid'
    AND o.product_id = v_product.id
    AND o.customer_document IS NOT NULL
  ORDER BY i.paid_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido anterior não encontrado ou não vinculado ao usuário';
  END IF;

  v_method := v_original.metadata->>'payment_method';
  IF v_method NOT IN ('pix','boleto') OR v_method IS NULL THEN
    RAISE EXCEPTION 'Forma de pagamento anterior inválida';
  END IF;

  -- Reserva LOCAL somente; checkout_state=reserved evita afirmar que há cobrança.
  INSERT INTO public.orders (
    user_id,company_id,product_id,customer_name,customer_email,
    customer_phone,customer_document,amount_cents,currency,status,
    payment_provider,provider_order_id,checkout_key,metadata
  ) VALUES (
    p_user_id,v_original.company_id,v_product.id,v_original.customer_name,
    v_original.customer_email,v_original.customer_phone,v_original.customer_document,
    v_product.price_cents,'BRL','pending','bling',NULL,
    pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object(
      'checkout_state','reserved',
      'product_code','ASSINATURA-FISCAL-001',
      'payment_method',v_method,
      'person_type',v_original.metadata->>'person_type',
      'address',v_original.metadata->'address',
      'fiscal_renewal',true,
      'fiscal_subscription_id',p_subscription_id::text,
      'reference_month',v_reference::text
    )
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.fiscal_subscription_invoices (
    subscription_id,order_id,reference_month,amount_cents,status,due_date
  ) VALUES (
    p_subscription_id,v_order_id,v_reference,v_product.price_cents,'pending',v_due
  ) RETURNING id INTO v_invoice.id;

  RETURN QUERY SELECT v_invoice.id,v_order_id,v_reference,v_due;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_fiscal_renewal(uuid,uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_fiscal_renewal(uuid,uuid) TO service_role;

-- Integração futura: a aplicação deve passar p_user_id obtido de auth.getClaims()
-- e não do corpo da requisição. Este RPC não gera nem lança pedido no Bling.
