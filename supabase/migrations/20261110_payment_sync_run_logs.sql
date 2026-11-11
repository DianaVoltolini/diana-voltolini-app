-- Histórico operacional da conciliação automática de pagamentos Bling.
-- Somente logs: não altera cobranças, pedidos, assinaturas ou modelos de e-mail.
create table if not exists public.payment_sync_run_logs (
 id uuid primary key,
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 status text not null default 'running' check(status in ('running','finished','error')),
 checked integer,
 opened integer,
 partial integer,
 paid integer,
 cancelled integer,
 ignored integer,
 errors integer,
 interrupted boolean,
 duration_ms integer,
 error_message text
);
create index if not exists payment_sync_run_logs_started_idx
 on public.payment_sync_run_logs(started_at desc);
alter table public.payment_sync_run_logs enable row level security;
revoke all on public.payment_sync_run_logs from anon,authenticated;
grant select,insert,update on public.payment_sync_run_logs to service_role;
