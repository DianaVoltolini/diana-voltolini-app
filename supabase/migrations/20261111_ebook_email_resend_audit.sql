-- Auditoria de reenvios manuais de comunicacoes do e-book.
-- Somente novos registros; nao altera pedidos, pagamentos nem usuarios.
create table if not exists public.ebook_email_resend_audit (
 id uuid primary key default gen_random_uuid(),
 request_key uuid not null unique,
 order_id uuid not null references public.orders(id) on delete restrict,
 event_key text not null check(event_key in ('ebook_charge_generated','ebook_payment_confirmed')),
 original_email text not null,
 recipient_email text not null,
 actor_user_id uuid not null,
 status text not null default 'reserved' check(status in ('reserved','sent','failed')),
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 error_message text
);
create index if not exists ebook_email_resend_audit_order_idx on public.ebook_email_resend_audit(order_id,created_at desc);
alter table public.ebook_email_resend_audit enable row level security;
revoke all on public.ebook_email_resend_audit from anon,authenticated;
grant select,insert,update on public.ebook_email_resend_audit to service_role;
