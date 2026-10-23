-- Estrutura mínima de direito de acesso à assinatura Fiscal na Prática.
-- A cobrança automática ainda não é ativada por esta migração.
create table if not exists public.fiscal_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 status text not null default 'pending' check(status in ('pending','active','past_due','canceled','expired')),
 paid_until timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint fiscal_subscriptions_paid_until_check check (status <> 'active' or paid_until is not null)
);
create index if not exists fiscal_subscriptions_access_idx on public.fiscal_subscriptions(user_id,status,paid_until desc);
alter table public.fiscal_subscriptions enable row level security;
revoke all on public.fiscal_subscriptions from anon,authenticated;
-- Somente verificações no servidor com a chave administrativa.
