-- Executar no Supabase SQL Editor ANTES de publicar a landing.
create table if not exists public.marketing_landings (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 eyebrow text not null default 'MATERIAL GRATUITO',
 summary text not null,
 button_text text not null default 'Receber material gratuito',
 delivery_title text not null default 'Seu material está pronto',
 file_path text,
 status text not null default 'draft' check(status in ('draft','published')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.marketing_leads (
 id uuid primary key default gen_random_uuid(),
 landing_id uuid not null references public.marketing_landings(id) on delete restrict,
 name text not null,
 email text not null,
 interest text not null,
 newsletter_opt_in boolean not null default false,
 newsletter_consented_at timestamptz,
 privacy_acknowledged_at timestamptz not null,
 delivery_token uuid not null default gen_random_uuid() unique,
 created_at timestamptz not null default now(),
 unique(landing_id,email)
);
create index if not exists marketing_leads_landing_idx on public.marketing_leads(landing_id,created_at desc);
alter table public.marketing_landings enable row level security;
alter table public.marketing_leads enable row level security;
revoke all on public.marketing_landings from anon,authenticated;
revoke all on public.marketing_leads from anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('marketing-deliveries','marketing-deliveries',false,10485760,array['application/pdf'])
on conflict (id) do nothing;
