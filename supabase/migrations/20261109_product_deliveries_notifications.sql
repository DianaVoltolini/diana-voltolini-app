-- Produtos e Entregas: executar no Supabase SQL Editor ANTES do deploy.
-- Manter arquivos privados e direito de acesso vinculado a pedidos pagos.
create table if not exists public.product_deliveries (
 product_id uuid primary key references public.products(id) on delete restrict,
 page_path text not null unique check (page_path ~ '^/[a-z0-9][a-z0-9/-]*$'),
 material_name text,
 storage_bucket text,
 storage_path text,
 version integer not null default 0 check(version >= 0),
 published_at timestamptz,
 updated_at timestamptz not null default now(),
 constraint delivery_file_complete check ((storage_bucket is null and storage_path is null) or (storage_bucket is not null and storage_path is not null))
);
create table if not exists public.product_delivery_versions (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete restrict,
 version integer not null check(version > 0),
 material_name text not null,
 storage_bucket text not null,
 storage_path text not null,
 published_at timestamptz not null default now(),
 unique(product_id,version)
);
create table if not exists public.product_delivery_reads (
 user_id uuid not null references auth.users(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade,
 seen_version integer not null default 0 check(seen_version >= 0),
 seen_at timestamptz not null default now(),
 primary key(user_id,product_id)
);
create index if not exists product_delivery_versions_recent on public.product_delivery_versions(product_id,version desc);
alter table public.product_deliveries enable row level security;
alter table public.product_delivery_versions enable row level security;
alter table public.product_delivery_reads enable row level security;
revoke all on public.product_deliveries from anon,authenticated;
revoke all on public.product_delivery_versions from anon,authenticated;
revoke all on public.product_delivery_reads from anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('product-deliveries','product-deliveries',false,15728640,array['application/pdf'])
on conflict(id) do nothing;

-- Prepara o vínculo da página atual sem trocar o PDF já entregue.
insert into public.product_deliveries(product_id,page_path)
select id,'/ibs-cbs-na-pratica' from public.products where code='EBOOK-IBSCBS-001'
on conflict(product_id) do nothing;
