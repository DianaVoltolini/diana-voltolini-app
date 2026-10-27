-- Execute este complemento no Supabase antes do merge do PR #50.
-- Limites atomicos: 5 tentativas por IP e 3 por e-mail a cada 15 minutos.
create table if not exists public.marketing_submission_limits (
 rate_key text primary key,
 window_start timestamptz not null default now(),
 attempts integer not null default 0
);
alter table public.marketing_submission_limits enable row level security;
revoke all on public.marketing_submission_limits from public, anon, authenticated;
create or replace function public.consume_marketing_submission_limit(
 p_key text, p_max integer, p_window_seconds integer
) returns boolean language plpgsql security definer
set search_path = pg_catalog, public as $$
declare v_attempts integer;
begin
 if length(p_key)>150 or p_max<1 or p_max>100 or p_window_seconds<60 or p_window_seconds>86400 then
  return false;
 end if;
 insert into public.marketing_submission_limits(rate_key,window_start,attempts)
 values(p_key,now(),1)
 on conflict(rate_key) do update
 set attempts=case
   when marketing_submission_limits.window_start <= now()-make_interval(secs=>p_window_seconds)
   then 1 else marketing_submission_limits.attempts+1 end,
 window_start=case
   when marketing_submission_limits.window_start <= now()-make_interval(secs=>p_window_seconds)
   then now() else marketing_submission_limits.window_start end
 returning attempts into v_attempts;
 return v_attempts<=p_max;
end; $$;
revoke all on function public.consume_marketing_submission_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_marketing_submission_limit(text,integer,integer) to service_role;
