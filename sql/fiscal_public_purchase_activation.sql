-- PRIMEIRA COMPRA PÚBLICA / FISCAL NA PRÁTICA
-- Migração em REVISÃO. NÃO executar antes da conciliação financeira e teste de build.
-- Quando um pedido pago do Fiscal na Prática é vinculado a uma conta validada,
-- cria a assinatura e a mensalidade paga UMA única vez.
CREATE OR REPLACE FUNCTION public.activate_fiscal_first_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_product_id uuid;
 v_subscription_id uuid;
 v_paid_at timestamptz;
 v_existing_invoice uuid;
BEGIN
 IF NEW.status <> 'paid' OR NEW.user_id IS NULL THEN RETURN NEW; END IF;
 SELECT id INTO v_product_id FROM public.products
 WHERE code='ASSINATURA-FISCAL-001';
 IF v_product_id IS NULL OR NEW.product_id<>v_product_id THEN RETURN NEW; END IF;

 -- Não criar a assinatura duas vezes em reprocessamentos de pagamento/login.
 SELECT id INTO v_existing_invoice
 FROM public.fiscal_subscription_invoices
 WHERE order_id=NEW.id LIMIT 1;
 IF v_existing_invoice IS NOT NULL THEN RETURN NEW; END IF;

 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.user_id::text, 42612));
 SELECT id INTO v_existing_invoice
 FROM public.fiscal_subscription_invoices
 WHERE order_id=NEW.id LIMIT 1;
 IF v_existing_invoice IS NOT NULL THEN RETURN NEW; END IF;

 -- Evita habilitar duas assinaturas simultâneas: exige conferência humana
 -- se houver nova compra paga para uma conta já assinante.
 IF EXISTS(SELECT 1 FROM public.fiscal_subscriptions
           WHERE user_id=NEW.user_id AND renewal_enabled=true
             AND status IN ('pending','active','past_due')) THEN
   RETURN NEW;
 END IF;

 v_paid_at:=now(); -- início no primeiro vínculo de acesso confirmado; não depende de campo paid_at em orders
 INSERT INTO public.fiscal_subscriptions(
  user_id,status,paid_until,billing_day,renewal_enabled
 ) VALUES(
  NEW.user_id,'active',v_paid_at + interval '1 month',
  extract(day from (v_paid_at AT TIME ZONE 'America/Sao_Paulo'))::smallint,true
 ) RETURNING id INTO v_subscription_id;

 INSERT INTO public.fiscal_subscription_invoices(
  subscription_id,order_id,reference_month,amount_cents,
  status,due_date,paid_at
 ) VALUES(
  v_subscription_id,NEW.id,
  date_trunc('month',(v_paid_at AT TIME ZONE 'America/Sao_Paulo'))::date,
  NEW.amount_cents,'paid',
  (v_paid_at AT TIME ZONE 'America/Sao_Paulo')::date,v_paid_at
 );
 RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_fiscal_first_purchase()
 FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS activate_fiscal_first_purchase_order ON public.orders;
CREATE TRIGGER activate_fiscal_first_purchase_order
AFTER INSERT OR UPDATE OF status,user_id ON public.orders
FOR EACH ROW WHEN (NEW.status='paid' AND NEW.user_id IS NOT NULL)
EXECUTE FUNCTION public.activate_fiscal_first_purchase();
