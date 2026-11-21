-- Rastreamento administrativo para impedir envios concorrentes de um orçamento.
-- A aprovação e o checkout serão habilitados conjuntamente em fase posterior.
alter table public.fiscal_analysis_quotes
 add column if not exists email_delivery_state text not null default 'idle'
 check (email_delivery_state in ('idle','sending','accepted','failed')),
 add column if not exists email_send_claim uuid,
 add column if not exists email_delivery_error text,
 add column if not exists email_send_attempts integer not null default 0 check (email_send_attempts >= 0);
create index if not exists fiscal_analysis_quotes_delivery_state_idx
 on public.fiscal_analysis_quotes(email_delivery_state)
 where email_delivery_state in ('sending','failed');