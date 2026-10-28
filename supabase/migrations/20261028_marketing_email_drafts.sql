-- Marketing: modelos e campanhas de e-mail (sem disparos nesta etapa).
create table if not exists public.marketing_email_templates (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 subject text not null,
 body text not null,
 kind text not null default 'manual' check (kind in ('manual','welcome')),
 active boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.marketing_email_campaigns (
 id uuid primary key default gen_random_uuid(),
 template_id uuid references public.marketing_email_templates(id) on delete set null,
 subject text not null,
 body text not null,
 interest text,
 landing_id uuid references public.marketing_landings(id) on delete set null,
 status text not null default 'draft' check(status='draft'),
 created_at timestamptz not null default now()
);
alter table public.marketing_email_templates enable row level security;
alter table public.marketing_email_campaigns enable row level security;
-- Sem políticas públicas: operações exclusivamente pelas páginas admin no servidor.
