-- Fiscal na Prática: pedido de cancelamento e controle de renovação.
-- Não cria cobranças nem altera assinaturas existentes.
ALTER TABLE public.fiscal_subscriptions
  ADD COLUMN IF NOT EXISTS renewal_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamptz;

CREATE INDEX IF NOT EXISTS fiscal_invoices_subscription_pending_idx
ON public.fiscal_subscription_invoices(subscription_id, due_date DESC)
WHERE status = 'pending';

COMMENT ON COLUMN public.fiscal_subscriptions.renewal_enabled IS
  'false impede novas renovações; a automação de cobrança deverá respeitar este campo';
COMMENT ON COLUMN public.fiscal_subscriptions.cancellation_requested_at IS
  'Solicitação de cancelamento pelo cliente; não antecipa o fim do acesso pago';
