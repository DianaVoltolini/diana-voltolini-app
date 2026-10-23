-- Fiscal na Prática: artigos públicos e exclusivos.
-- Aplicar manualmente no Supabase SQL Editor antes de publicar o painel editorial.
create table if not exists public.fiscal_articles (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique,
 title text not null,
 summary text not null default '',
 body text not null default '',
 category text not null,
 visibility text not null default 'public' check (visibility in ('public','subscriber')),
 status text not null default 'draft' check (status in ('draft','published')),
 source_links text not null default '',
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.fiscal_articles enable row level security;
-- Sem policies para anon e authenticated: leituras e alterações feitas
-- somente por rotas de servidor que validam requireAdmin(), via service role.
revoke all on public.fiscal_articles from anon, authenticated;
create index if not exists fiscal_articles_status_idx on public.fiscal_articles(status,visibility,published_at desc);
