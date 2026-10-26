-- Executar uma vez no SQL Editor do Supabase.
-- Cadastro de categorias; renomeação sincroniza artigos existentes.
create table if not exists public.fiscal_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 2 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.fiscal_categories enable row level security;
-- Sem políticas públicas: ações administrativas usam a credencial server-side service role.
insert into public.fiscal_categories (name)
select distinct trim(category) from public.fiscal_articles
where category is not null and trim(category) <> ''
on conflict (name) do nothing;
insert into public.fiscal_categories (name)
select v.name from (values
 ('Reforma Tributária'),('NF-e e Faturamento'),('Tributos na Prática'),
 ('Sistemas e Parametrização'),('Obrigações e Prazos'),('Atualizações fiscais'),
 ('NF-e e XML'),('IBS e CBS'),('ICMS e DIFAL'),
 ('Checklists e guias'),('Agenda fiscal')
) as v(name)
on conflict (name) do nothing;

create or replace function public.sync_fiscal_category_name()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
 if new.name is distinct from old.name then
   update public.fiscal_articles set category = new.name, updated_at = now()
   where category = old.name;
 end if;
 new.updated_at := now();
 return new;
end;
$$;
drop trigger if exists trg_sync_fiscal_category_name on public.fiscal_categories;
create trigger trg_sync_fiscal_category_name
before update of name on public.fiscal_categories
for each row execute function public.sync_fiscal_category_name();

create or replace function public.prevent_used_fiscal_category_delete()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
 if exists (select 1 from public.fiscal_articles where category = old.name) then
   raise exception 'Categoria em uso por artigos. Reclassifique os artigos antes de excluir.';
 end if;
 return old;
end;
$$;
drop trigger if exists trg_prevent_used_fiscal_category_delete on public.fiscal_categories;
create trigger trg_prevent_used_fiscal_category_delete
before delete on public.fiscal_categories
for each row execute function public.prevent_used_fiscal_category_delete();
