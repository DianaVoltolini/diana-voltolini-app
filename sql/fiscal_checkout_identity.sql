-- Fiscal na Prática: preparação segura para vincular checkout e conta do cliente.
-- Sem geração de cobranças. Executar antes de implementar o checkout autenticado.
CREATE TABLE IF NOT EXISTS public.fiscal_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  order_id uuid UNIQUE REFERENCES public.orders(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fiscal_checkout_token_sha256 CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT fiscal_checkout_expiry CHECK (expires_at > created_at),
  CONSTRAINT fiscal_checkout_consumption CHECK (order_id IS NULL OR consumed_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS fiscal_checkout_user_idx
 ON public.fiscal_checkout_sessions(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS fiscal_checkout_expiry_idx
 ON public.fiscal_checkout_sessions(expires_at)
 WHERE consumed_at IS NULL;
ALTER TABLE public.fiscal_checkout_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fiscal_checkout_sessions FROM anon,authenticated;
COMMENT ON TABLE public.fiscal_checkout_sessions IS
 'Sessões de compra emitidas a usuários autenticados. Somente serviços de backend podem escrever/consumir; token é armazenado como hash SHA-256.';
-- Data fixa de renovação, dia 1 a 31; dia 31 passa para o último dia dos meses menores.
ALTER TABLE public.fiscal_subscriptions ADD COLUMN IF NOT EXISTS billing_day smallint;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='fiscal_billing_day_range') THEN
  ALTER TABLE public.fiscal_subscriptions ADD CONSTRAINT fiscal_billing_day_range
  CHECK (billing_day BETWEEN 1 AND 31);
 END IF;
END $$;
COMMENT ON COLUMN public.fiscal_subscriptions.billing_day IS
 'Dia fixo de vencimento mensal de PIX e boleto; meses curtos usam o último dia.';
