-- F3B | Publicacao controlada de paginas. Nao habilita checkout.
-- Aplicar SOMENTE apos F3A (commerce_v2_pages).
begin;
alter table public.commerce_v2_pages
  add column if not exists published_at timestamptz;

alter table public.commerce_v2_pages
  drop constraint if exists commerce_v2_pages_status_check;
alter table public.commerce_v2_pages
  add constraint commerce_v2_pages_status_check
  check (status in ('draft','published'));

alter table public.commerce_v2_pages
  add constraint commerce_v2_pages_publish_consistency
  check (
    (status = 'draft' and published_at is null)
    or (status = 'published' and published_at is not null)
  );

create index if not exists commerce_v2_pages_published_slug_idx
  on public.commerce_v2_pages(slug) where status = 'published';

comment on column public.commerce_v2_pages.published_at is
  'Data da ultima publicacao controlada. Somente paginas published podem ser lidas pelo site quando a flag do site estiver habilitada.';
commit;

-- Conferencia
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='commerce_v2_pages'
  and column_name in ('status','published_at');
