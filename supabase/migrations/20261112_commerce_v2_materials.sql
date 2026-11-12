-- Commerce V2: biblioteca PRIVADA, independente de entregas comerciais antigas.
-- Executar depois da migration commerce_v2_products_pilot.sql.
create table if not exists public.commerce_v2_materials (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.commerce_v2_products(id) on delete restrict,
 title text not null check (length(btrim(title)) between 2 and 180),
 description text not null default '' check (length(description) <= 4000),
 category text not null default 'other'
   check (category in ('slides','ebook','worksheet','checklist','script','image','support','other')),
 original_filename text,
 storage_path text unique,
 file_mime text,
 file_size bigint check (file_size is null or (file_size > 0 and file_size <= 26214400)),
 is_archived boolean not null default false,
 created_by uuid references auth.users(id) on delete set null,
 updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint commerce_v2_material_file_pair
 check ((storage_path is null and original_filename is null and file_mime is null and file_size is null)
  or (storage_path is not null and original_filename is not null and file_mime is not null and file_size is not null))
);
create index if not exists commerce_v2_materials_product_idx
 on public.commerce_v2_materials(product_id, is_archived, created_at desc);
create index if not exists commerce_v2_materials_category_idx
 on public.commerce_v2_materials(category, is_archived);
alter table public.commerce_v2_materials enable row level security;
revoke all on public.commerce_v2_materials from public, anon, authenticated;
-- Uploads ficam privados, sem policy de leitura publica.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
 'commerce-v2-materials',
 'commerce-v2-materials',
 false,
 26214400,
 array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png', 'image/jpeg', 'image/webp',
  'application/zip','application/x-zip-compressed',
  'text/plain'
 ]
)
on conflict(id) do nothing;
-- Nao permitir reutilizar bucket publico preexistente.
do $bucket_check$
begin
 if exists (
  select 1 from storage.buckets where id = 'commerce-v2-materials' and public = true
 ) then
  raise exception 'Bucket commerce-v2-materials deve ser privado; revise a configuracao antes de continuar';
 end if;
end;
$bucket_check$;
-- Consultar configuracao do bucket apos aplicar; nao alterar buckets legados.
comment on table public.commerce_v2_materials is
 'Biblioteca interna de arquivos dos produtos V2. Nao concede acesso a compradores.';
