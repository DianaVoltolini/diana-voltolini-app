-- Proteção atômica dos modelos gerais de e-mail de compra.
-- Não altera pedidos, pagamentos, assinaturas nem os e-mails específicos existentes.
create table if not exists public.purchase_email_dispatches (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  event_key text not null check (event_key in ('default_charge_generated','default_payment_confirmed')),
  status text not null default 'reserved' check (status in ('reserved','sent','failed')),
  recipient_email text not null,
  reserved_at timestamptz not null default now(),
  sent_at timestamptz,
  failed_at timestamptz,
  error_message text,
  constraint purchase_email_dispatches_unique_event unique(order_id,event_key)
);
create index if not exists purchase_email_dispatches_status_idx
  on public.purchase_email_dispatches(status,reserved_at);
alter table public.purchase_email_dispatches enable row level security;
revoke all on public.purchase_email_dispatches from anon,authenticated;
grant select,insert,update on public.purchase_email_dispatches to service_role;

create or replace function public.reserve_purchase_email(
  p_order_id uuid,p_event_key text,p_recipient_email text
) returns boolean language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Operação não autorizada';
  end if;
  if p_event_key not in ('default_charge_generated','default_payment_confirmed') then
    raise exception 'Evento de compra inválido';
  end if;
  if p_recipient_email is null or length(btrim(p_recipient_email))<5 then
    raise exception 'Destinatário inválido';
  end if;
  insert into public.purchase_email_dispatches(order_id,event_key,recipient_email)
  values (p_order_id,p_event_key,lower(btrim(p_recipient_email)))
  on conflict(order_id,event_key) do nothing
  returning id into v_id;
  return v_id is not null;
end;
$$;
revoke all on function public.reserve_purchase_email(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_purchase_email(uuid,text,text) to service_role;

create or replace function public.finish_purchase_email(
  p_order_id uuid,p_event_key text,p_success boolean,p_error text default null
) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Operação não autorizada';
  end if;
  update public.purchase_email_dispatches
  set status=case when p_success then 'sent' else 'failed' end,
      sent_at=case when p_success then now() else null end,
      failed_at=case when p_success then null else now() end,
      error_message=case when p_success then null else left(coalesce(p_error,'Falha de envio'),500) end
  where order_id=p_order_id and event_key=p_event_key and status='reserved';
  if not found then
    raise exception 'Reserva não encontrada ou já finalizada';
  end if;
end;
$$;
revoke all on function public.finish_purchase_email(uuid,text,boolean,text) from public,anon,authenticated;
grant execute on function public.finish_purchase_email(uuid,text,boolean,text) to service_role;
