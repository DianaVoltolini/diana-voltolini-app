-- Novos campos opcionais da landing; execute antes do merge.
alter table public.marketing_landings
 add column if not exists cover_path text,
 add column if not exists benefit_1 text,
 add column if not exists benefit_2 text,
 add column if not exists benefit_3 text,
 add column if not exists button_helper text;
