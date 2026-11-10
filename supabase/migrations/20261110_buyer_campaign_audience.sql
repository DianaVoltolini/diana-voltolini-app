-- Classificação dos modelos de campanhas, sem afetar o envio transacional.
alter table public.marketing_email_templates
  add column if not exists audience_kind text not null default 'leads';
alter table public.marketing_email_templates
  drop constraint if exists marketing_email_templates_audience_kind_check;
alter table public.marketing_email_templates
  add constraint marketing_email_templates_audience_kind_check
  check (audience_kind in ('leads','buyers'));
create index if not exists marketing_email_templates_audience_kind_idx
  on public.marketing_email_templates(audience_kind);
