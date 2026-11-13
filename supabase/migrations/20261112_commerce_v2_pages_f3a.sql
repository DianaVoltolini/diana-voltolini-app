-- F3A: paginas comerciais em RASCUNHO, exclusivamente administrativas.
-- Independente dos sites publicos, tabelas financeiras e checkout existentes.
create table if not exists public.commerce_v2_pages (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.commerce_v2_products(id) on delete restrict,
 offer_id uuid not null references public.commerce_v2_offers(id) on delete restrict,
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 100),
 template text not null default 'online_event' check (template in ('online_event','ebook','service','course')),
 title text not null check (length(btrim(title)) between 3 and 160),
 eyebrow text check (eyebrow is null or length(eyebrow) <= 100),
 headline text not null check (length(btrim(headline)) between 3 and 250),
 subtitle text check (subtitle is null or length(subtitle) <= 1000),
 benefits text check (benefits is null or length(benefits) <= 4000),
 audience text check (audience is null or length(audience) <= 2000),
 details text check (details is null or length(details) <= 4000),
 faq text check (faq is null or length(faq) <= 4000),
 cta_label text not null default 'Inscrições em preparação'
   check (length(btrim(cta_label)) between 3 and 80),
 seo_title text check (seo_title is null or length(seo_title) <= 160),
 seo_description text check (seo_description is null or length(seo_description) <= 320),
 status text not null default 'draft' check (status = 'draft'),
 version integer not null default 1 check (version > 0),
 created_by uuid references auth.users(id) on delete set null,
 updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists commerce_v2_pages_product_idx
 on public.commerce_v2_pages(product_id,created_at desc);
alter table public.commerce_v2_pages enable row level security;
revoke all on public.commerce_v2_pages from public,anon,authenticated;
comment on table public.commerce_v2_pages is
 'Paginas V2 em rascunho administrativo; nao publicas e sem checkout.';
-- Nenhuma politica publica, nenhuma rota comercial habilitada.
