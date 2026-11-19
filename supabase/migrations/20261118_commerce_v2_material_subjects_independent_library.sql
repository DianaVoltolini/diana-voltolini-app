-- Biblioteca de Materiais: classificação por tema e arquivo independente de produtos.
-- Mantém os 14 materiais existentes, seus arquivos e vínculos sem alterações.
begin;
create table if not exists public.commerce_v2_material_subjects (
 code text primary key check (code ~ '^[a-z][a-z0-9_]{1,39}$'),
 name text not null check (char_length(btrim(name)) between 2 and 80),
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
insert into public.commerce_v2_material_subjects(code,name) values
 ('geral','Geral'),('simples_nacional','Simples Nacional'),
 ('mei','MEI'),('reforma_tributaria','Reforma Tributária'),
 ('ibs_cbs','IBS e CBS'),('icms','ICMS'),
 ('faturamento','Faturamento'),('documentos_fiscais','Documentos Fiscais')
on conflict(code) do nothing;
alter table public.commerce_v2_materials
 add column if not exists subject_code text not null default 'geral';
alter table public.commerce_v2_materials
 drop not null from product_id;
do $$
begin
 if not exists(select 1 from pg_constraint
  where conrelid='public.commerce_v2_materials'::regclass
    and conname='commerce_v2_materials_subject_fk') then
  alter table public.commerce_v2_materials add constraint commerce_v2_materials_subject_fk
   foreign key(subject_code) references public.commerce_v2_material_subjects(code)
   on update restrict on delete restrict;
 end if;
end $$;
create index if not exists commerce_v2_materials_subject_idx
 on public.commerce_v2_materials(subject_code,is_archived,created_at desc);
alter table public.commerce_v2_material_subjects enable row level security;
revoke all on public.commerce_v2_material_subjects from public,anon,authenticated;
grant select,insert,update,delete on public.commerce_v2_material_subjects to service_role;
comment on table public.commerce_v2_material_subjects is
 'Temas para classificar arquivos da Biblioteca V2, independentemente dos tipos de arquivo e produtos.';
comment on column public.commerce_v2_materials.product_id is
 'Produto principal legado (pode ser nulo para acervo não vinculado); vínculos de entrega na tabela commerce_v2_material_product_eligibility.';
commit;