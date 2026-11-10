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

-- Publicação atômica: evita versões duplicadas por edições simultâneas.
create or replace function public.publish_product_delivery(
 p_product_id uuid, p_page_path text, p_material_name text,
 p_storage_bucket text, p_storage_path text
) returns integer
language plpgsql security definer set search_path=public as $$
declare v_version integer;
begin
 if p_page_path !~ '^/[a-z0-9][a-z0-9/-]*$' or length(p_material_name)=0
    or p_storage_bucket<>'product-deliveries' or length(p_storage_path)=0 then
   raise exception 'Dados de publicação inválidos';
 end if;
 if not exists(select 1 from public.products where id=p_product_id and active=true) then
   raise exception 'Produto inativo ou inexistente';
 end if;
 insert into public.product_deliveries(product_id,page_path,version)
 values(p_product_id,p_page_path,0) on conflict(product_id) do nothing;
 perform 1 from public.product_deliveries where product_id=p_product_id for update;
 update public.product_deliveries set page_path=p_page_path,material_name=p_material_name,
 storage_bucket=p_storage_bucket,storage_path=p_storage_path,
 version=version+1,published_at=now(),updated_at=now()
 where product_id=p_product_id returning version into v_version;
 insert into public.product_delivery_versions(product_id,version,material_name,storage_bucket,storage_path)
 values(p_product_id,v_version,p_material_name,p_storage_bucket,p_storage_path);
 return v_version;
end;
$$;
revoke all on function public.publish_product_delivery(uuid,text,text,text,text) from public,anon,authenticated;
