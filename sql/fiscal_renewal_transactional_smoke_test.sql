-- sql/fiscal_renewal_transactional_smoke_test.sql
-- HOMOLOGAÇÃO LOCAL, SEM BLING. NÃO É TESTE DE PAGAMENTO EXTERNO.
-- Execute somente em banco com uma assinatura de TESTE elegível.
-- TODAS as mutações estão em transação revertida, inclusive a simulação de pagamento.
-- NÃO modificar para COMMIT. Não publicar como rotina/cron.

BEGIN;
SAVEPOINT fiscal_homologacao_pago;
DO $$
DECLARE
  v_sub uuid; v_user uuid; v_original timestamptz;
  v_new timestamptz; v_first record; v_second record;
BEGIN
  SELECT id,user_id,paid_until INTO v_sub,v_user,v_original
  FROM public.fiscal_subscriptions
  WHERE status='active' AND renewal_enabled=true
    AND cancellation_requested_at IS NULL
    AND (now() AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN
      (paid_until AT TIME ZONE 'America/Sao_Paulo')::date-10 AND
      (paid_until AT TIME ZONE 'America/Sao_Paulo')::date+3
  ORDER BY created_at DESC LIMIT 1;
  IF v_sub IS NULL THEN RAISE EXCEPTION 'Sem assinatura de teste elegível'; END IF;

  SELECT * INTO v_first FROM public.reserve_fiscal_renewal(v_sub,v_user);
  SELECT * INTO v_second FROM public.reserve_fiscal_renewal(v_sub,v_user);
  IF v_first.invoice_id IS NULL OR v_first.reserved_order_id IS NULL
     OR v_first.invoice_id IS DISTINCT FROM v_second.invoice_id
     OR v_first.reserved_order_id IS DISTINCT FROM v_second.reserved_order_id
  THEN RAISE EXCEPTION 'Reserva não idempotente'; END IF;
  IF (SELECT count(*) FROM public.fiscal_subscription_invoices
      WHERE subscription_id=v_sub AND status='pending')<>1
  THEN RAISE EXCEPTION 'Mensalidade duplicada'; END IF;

  -- NÃO CONSULTA OU CRIA COBRANÇA BLING; apenas simula o retorno pago.
  UPDATE public.orders SET status='paid',paid_at=now()
  WHERE id=v_first.reserved_order_id AND status='pending';
  SELECT paid_until INTO v_new FROM public.fiscal_subscriptions WHERE id=v_sub;
  IF v_new<=v_original OR
     (SELECT status FROM public.fiscal_subscription_invoices
      WHERE id=v_first.invoice_id)<>'paid'
  THEN RAISE EXCEPTION 'Renovação local não prorrogou acesso'; END IF;

  -- Reprocessamento do mesmo status não pode prorrogar pela segunda vez.
  UPDATE public.orders SET status='paid'
  WHERE id=v_first.reserved_order_id;
  IF (SELECT paid_until FROM public.fiscal_subscriptions WHERE id=v_sub)
     IS DISTINCT FROM v_new
  THEN RAISE EXCEPTION 'Prorrogação duplicada'; END IF;
  RAISE NOTICE 'PASS: reserva única, confirmação local e reprocessamento idempotente';
END $$;
ROLLBACK TO SAVEPOINT fiscal_homologacao_pago;

SAVEPOINT fiscal_homologacao_cancelado;
DO $$
DECLARE
  v_sub uuid; v_user uuid; v_original timestamptz;
  v_res record;
BEGIN
  SELECT id,user_id,paid_until INTO v_sub,v_user,v_original
  FROM public.fiscal_subscriptions
  WHERE status='active' AND renewal_enabled=true AND cancellation_requested_at IS NULL
    AND (now() AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN
      (paid_until AT TIME ZONE 'America/Sao_Paulo')::date-10 AND
      (paid_until AT TIME ZONE 'America/Sao_Paulo')::date+3
  ORDER BY created_at DESC LIMIT 1;
  IF v_sub IS NULL THEN RAISE EXCEPTION 'Sem assinatura de teste elegível'; END IF;
  SELECT * INTO v_res FROM public.reserve_fiscal_renewal(v_sub,v_user);

  UPDATE public.fiscal_subscriptions SET
    renewal_enabled=false,cancellation_requested_at=now()
  WHERE id=v_sub;

  -- Pagamento tardio após pedido de cancelamento exige conciliação manual;
  -- não deve prorrogar acesso automaticamente.
  UPDATE public.orders SET status='paid',paid_at=now()
  WHERE id=v_res.reserved_order_id AND status='pending';
  IF (SELECT status FROM public.fiscal_subscription_invoices
      WHERE id=v_res.invoice_id)<>'pending'
     OR (SELECT paid_until FROM public.fiscal_subscriptions WHERE id=v_sub)
        IS DISTINCT FROM v_original
  THEN RAISE EXCEPTION 'Pagamento pós-cancelamento prorrogou indevidamente'; END IF;
  RAISE NOTICE 'PASS: pagamento pós-cancelamento mantém mensalidade para revisão';
END $$;
ROLLBACK TO SAVEPOINT fiscal_homologacao_cancelado;

-- A transação inteira termina SEM mudanças persistidas.
ROLLBACK;
