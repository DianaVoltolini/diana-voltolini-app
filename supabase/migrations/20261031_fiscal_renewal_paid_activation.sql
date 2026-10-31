-- supabase/migrations/20261031_fiscal_renewal_paid_activation.sql
-- Fiscal na Prática: prorrogar acesso SOMENTE ao reconhecer um pedido
-- de renovação pago, previamente ligado a uma invoice pendente.
-- NÃO cria pedido, cobrança no Bling, nem invoice.
-- Requer revisão, backup e teste de integração antes de aplicar em produção.

CREATE OR REPLACE FUNCTION public.activate_fiscal_paid_renewal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invoice public.fiscal_subscription_invoices%ROWTYPE;
  v_subscription public.fiscal_subscriptions%ROWTYPE;
  v_product uuid;
  v_now timestamptz;
  v_base timestamptz;
BEGIN
  IF NEW.status IS DISTINCT FROM 'paid'
     OR NEW.user_id IS NULL
     OR OLD.status = 'paid' THEN
    RETURN NEW;
  END IF;

  SELECT p.id INTO v_product
  FROM public.products p
  WHERE p.code = 'ASSINATURA-FISCAL-001';

  IF v_product IS NULL OR NEW.product_id IS DISTINCT FROM v_product THEN
    RETURN NEW;
  END IF;

  -- Somente pedidos criados explicitamente para renovação podem
  -- prorrogar uma assinatura; pedidos de primeira compra não entram.
  IF NEW.metadata->>'fiscal_renewal' IS DISTINCT FROM 'true' THEN
    RETURN NEW;
  END IF;

  -- Apenas pedidos já vinculados à mensalidade de renovação.
  SELECT * INTO v_invoice
  FROM public.fiscal_subscription_invoices i
  WHERE i.order_id = NEW.id
  LIMIT 1;
  IF NOT FOUND OR v_invoice.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  -- Bloqueia processamentos simultâneos da mesma assinatura.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_invoice.subscription_id::text, 733821)
  );

  SELECT * INTO v_invoice
  FROM public.fiscal_subscription_invoices i
  WHERE i.id = v_invoice.id
  FOR UPDATE;
  IF NOT FOUND OR v_invoice.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_subscription
  FROM public.fiscal_subscriptions s
  WHERE s.id = v_invoice.subscription_id
  FOR UPDATE;

  -- Pagamento que chega após cancelamento: registrar o pedido como pago,
  -- mas não reativar o acesso de forma automática. A invoice permanece
  -- pendente para conciliação humana (consulta em sql/fiscal_renewal_paid_review.sql).
  -- Não lançar EXCEPTION aqui: isso reverteria o status pago do pedido.
  IF FOUND AND (
     v_subscription.renewal_enabled IS DISTINCT FROM true
     OR v_subscription.cancellation_requested_at IS NOT NULL
     OR v_subscription.status = 'canceled'
  ) THEN
    RETURN NEW;
  END IF;

  IF NOT FOUND
     OR v_subscription.user_id IS DISTINCT FROM NEW.user_id
     OR v_subscription.status NOT IN ('active','past_due')
     OR v_subscription.paid_until IS NULL
     OR NEW.amount_cents <> v_invoice.amount_cents THEN
    RAISE EXCEPTION
      'Pedido de renovação inconsistente para a assinatura %',
      v_invoice.subscription_id;
  END IF;

  v_now := pg_catalog.now();
  -- Pagamento antecipado ou pontual preserva a data contratada.
  -- Se o acesso já expirou, inicia o novo mês na confirmação do pagamento,
  -- evitando conceder um período retroativo sem acesso.
  v_base := pg_catalog.greatest(v_subscription.paid_until, v_now);

  UPDATE public.fiscal_subscription_invoices
  SET status = 'paid',
      paid_at = v_now,
      updated_at = v_now
  WHERE id = v_invoice.id
    AND status = 'pending';

  UPDATE public.fiscal_subscriptions
  SET status = 'active',
      paid_until = v_base + INTERVAL '1 month',
      updated_at = v_now
  WHERE id = v_subscription.id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_fiscal_paid_renewal()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS activate_fiscal_paid_renewal_order ON public.orders;

CREATE TRIGGER activate_fiscal_paid_renewal_order
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'paid' AND NEW.user_id IS NOT NULL)
EXECUTE FUNCTION public.activate_fiscal_paid_renewal();

-- Para implantação: confirmar no Supabase que o trigger
-- activate_fiscal_first_purchase_order continua ativo.
-- Testar: novo pedido pago associado a invoice pending;
-- repetição do webhook não deve acrescentar outro mês;
-- pedidos de outros produtos não devem alterar vigência.
