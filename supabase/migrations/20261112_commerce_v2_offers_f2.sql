-- F2: Ofertas e precos V2, exclusivamente em rascunho.
-- NAO faz escrita em products, orders, payments, Bling ou tabelas legadas.
-- Executar apos 20261112_commerce_v2_products_pilot.sql.
create table if not exists public.commerce_v2_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.commerce_v2_products(id) on delete restrict,
  name text not null check (length(btrim(name)) between 3 and 160),
  description text check (description is null or length(description) <= 2000),
  currency text not null default 'BRL' check (currency = 'BRL'),
  regular_price_cents bigint not null check (regular_price_cents between 1 and 1000000000),
  promotional_price_cents bigint
    check (promotional_price_cents is null or promotional_price_cents between 1 and 1000000000),
  promo_starts_on date,
  promo_ends_on date,
  status text not null default 'draft' check (status = 'draft'),
  version integer not null default 1 check (version >= 1),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_v2_offers_promo_rules check (
    (promotional_price_cents is null and promo_starts_on is null and promo_ends_on is null)
    or (promotional_price_cents is not null and
        promotional_price_cents < regular_price_cents and
        promo_starts_on is not null and promo_ends_on is not null and
        promo_ends_on >= promo_starts_on)
  )
);
create index if not exists commerce_v2_offers_product_idx
  on public.commerce_v2_offers(product_id,created_at desc);
alter table public.commerce_v2_offers enable row level security;
revoke all on public.commerce_v2_offers from public,anon,authenticated;

-- Registro imutavel de cada versao salva, inclusive a versao inicial.
create table if not exists public.commerce_v2_offer_revisions (
 id bigint generated always as identity primary key,
 offer_id uuid not null references public.commerce_v2_offers(id) on delete restrict,
 version integer not null,
 product_id uuid not null,
 name text not null,
 description text,
 currency text not null,
 regular_price_cents bigint not null,
 promotional_price_cents bigint,
 promo_starts_on date,
 promo_ends_on date,
 status text not null,
 saved_by uuid,
 saved_at timestamptz not null default now(),
 unique (offer_id,version)
);
create index if not exists commerce_v2_offer_revisions_offer_idx
  on public.commerce_v2_offer_revisions(offer_id,version desc);
alter table public.commerce_v2_offer_revisions enable row level security;
revoke all on public.commerce_v2_offer_revisions from public,anon,authenticated;

create or replace function public.commerce_v2_log_offer_revision()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $commerce_revision$
begin
  insert into public.commerce_v2_offer_revisions (
    offer_id,version,product_id,name,description,currency,
    regular_price_cents,promotional_price_cents,promo_starts_on,promo_ends_on,status,saved_by
  ) values (
    new.id,new.version,new.product_id,new.name,new.description,new.currency,
    new.regular_price_cents,new.promotional_price_cents,new.promo_starts_on,new.promo_ends_on,
    new.status,new.updated_by
  );
  return new;
end;
$commerce_revision$;
revoke all on function public.commerce_v2_log_offer_revision() from public,anon,authenticated;

drop trigger if exists commerce_v2_offer_revision_trigger on public.commerce_v2_offers;
create trigger commerce_v2_offer_revision_trigger
after insert or update on public.commerce_v2_offers
for each row execute function public.commerce_v2_log_offer_revision();

comment on table public.commerce_v2_offers is
  'Ofertas experimentais V2, somente rascunho; nao conectadas a nenhum checkout.';
comment on table public.commerce_v2_offer_revisions is
  'Historico imutavel de versoes de ofertas V2, sem permissao publica.';
