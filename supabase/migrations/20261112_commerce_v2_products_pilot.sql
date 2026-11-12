-- F1A | Comercio V2: catalogo administrativo isolado.
-- Migration aditiva. NAO altera products/orders/payments nem rotas legadas.
-- Aplicar somente apos revisar o schema real no Supabase.
create table if not exists public.commerce_v2_products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9][A-Z0-9_-]{2,59}$'),
  name text not null check (length(btrim(name)) between 3 and 180),
  short_name text,
  product_type text not null check (product_type in ('ebook','online_event','course','service','other')),
  summary text,
  description text,
  delivery_description text,
  sales_page_url text,
  status text not null default 'draft' check (status = 'draft'),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_v2_short_name_length check (short_name is null or length(short_name) <= 120),
  constraint commerce_v2_summary_length check (summary is null or length(summary) <= 600),
  constraint commerce_v2_description_length check (description is null or length(description) <= 8000),
  constraint commerce_v2_delivery_length check (delivery_description is null or length(delivery_description) <= 4000),
  constraint commerce_v2_page_url_length check (sales_page_url is null or length(sales_page_url) <= 500)
);
create index if not exists commerce_v2_products_created_idx on public.commerce_v2_products(created_at desc);
alter table public.commerce_v2_products enable row level security;
revoke all on public.commerce_v2_products from anon, authenticated;
-- Acesso apenas pelo servidor com service role, sempre apos requireAdmin().
-- Nenhuma policy publica: mesmo com erro de cliente, navegador nao acessa tabela.
comment on table public.commerce_v2_products is
  'Catalogo experimental V2; somente rascunhos; sem checkout nem ligacao com pagamentos legados.';
