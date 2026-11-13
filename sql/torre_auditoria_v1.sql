-- sql/torre_auditoria_v1.sql
-- Executar uma única vez no SQL Editor do Supabase, antes de habilitar o menu.
-- Isolado das tabelas operacionais de diagnosticos, pedidos, assinaturas e comercio_v2.
create table if not exists public.torre_audit_tasks (
 id uuid primary key default gen_random_uuid(),
 area text not null check (char_length(area) between 2 and 100),
 title text not null check (char_length(title) between 3 and 180),
 description text,
 priority text not null default 'media'
  check (priority in ('critica','alta','media','baixa')),
 status text not null default 'pendente'
  check (status in ('pendente','em_andamento','bloqueada','concluida','validada')),
 due_date date,
 owner_name text,
 notes text,
 completed_at timestamptz,
 validated_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.torre_audit_checklist (
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.torre_audit_tasks(id) on delete cascade,
 title text not null check (char_length(title) between 3 and 240),
 is_done boolean not null default false,
 completed_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists torre_audit_tasks_status_due_idx on public.torre_audit_tasks(status, due_date);
create index if not exists torre_audit_tasks_area_idx on public.torre_audit_tasks(area);
create index if not exists torre_audit_checklist_task_idx on public.torre_audit_checklist(task_id, created_at);
alter table public.torre_audit_tasks enable row level security;
alter table public.torre_audit_checklist enable row level security;
revoke all on public.torre_audit_tasks from anon, authenticated;
revoke all on public.torre_audit_checklist from anon, authenticated;
grant all on public.torre_audit_tasks, public.torre_audit_checklist to service_role;
-- Pendente inicial documentada no adendo do inventario.
insert into public.torre_audit_tasks(area,title,description,priority,status)
select 'Área do Cliente','Criar área de suporte na Área do Cliente',
 'Permitir que o cliente abra uma solicitação, acompanhe a situação e consulte respostas. A Torre deverá permitir responder e concluir os atendimentos.',
 'media','pendente'
where not exists (
 select 1 from public.torre_audit_tasks
 where area='Área do Cliente' and title='Criar área de suporte na Área do Cliente'
);
insert into public.torre_audit_checklist(task_id,title)
select t.id, x.title
from public.torre_audit_tasks t
cross join (values
 ('Definir assuntos e regras do atendimento'),
 ('Criar abertura de solicitação na Área do Cliente'),
 ('Criar atendimento e resposta pela Torre'),
 ('Garantir privacidade e permissões por cliente'),
 ('Validar abertura, resposta e encerramento em ambiente de teste')
) as x(title)
where t.area='Área do Cliente' and t.title='Criar área de suporte na Área do Cliente'
and not exists (select 1 from public.torre_audit_checklist c where c.task_id=t.id and c.title=x.title);
