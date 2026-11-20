-- Análise Fiscal Individual: estrutura inicial, sem ativar checkout ou captação pública.
-- Os registros são criados somente por rotas de servidor a implementar.
create table if not exists public.fiscal_analysis_requests (
  id uuid primary key default gen_random_uuid(),
  protocol text unique,
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 180),
  customer_email text not null check (char_length(btrim(customer_email)) between 5 and 254),
  customer_phone text not null check (char_length(btrim(customer_phone)) between 8 and 30),
  preferred_contact text not null default 'email' check (preferred_contact in ('email','whatsapp')),
  question text not null check (char_length(btrim(question)) between 10 and 10000),
  status text not null default 'received' check (status in ('received','awaiting_details','quoting','quote_sent','quote_accepted','awaiting_payment','paid','in_progress','awaiting_client','completed','expired','cancelled')),
  paid_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.fiscal_analysis_requests is 'Solicitações da Análise Fiscal Individual. Anexos são opcionais na abertura.';
create index if not exists fiscal_analysis_requests_status_created_idx on public.fiscal_analysis_requests (status, created_at desc);
create index if not exists fiscal_analysis_requests_email_idx on public.fiscal_analysis_requests (lower(customer_email));
create index if not exists fiscal_analysis_requests_user_idx on public.fiscal_analysis_requests (user_id) where user_id is not null;

create table if not exists public.fiscal_analysis_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.fiscal_analysis_requests(id) on delete restrict,
  version integer not null check (version > 0),
  scope text not null check (char_length(btrim(scope)) between 10 and 10000),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  delivery_business_days integer not null check (delivery_business_days between 1 and 90),
  valid_until timestamptz not null,
  notes text,
  status text not null default 'draft' check (status in ('draft','sent','accepted','expired','revoked')),
  access_token_hash text unique check (access_token_hash is null or access_token_hash ~ '^[a-f0-9]{64}$'),
  token_expires_at timestamptz,
  sent_at timestamptz,
  email_sent_at timestamptz,
  accepted_at timestamptz,
  order_id uuid unique references public.orders(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id,version),
  check (token_expires_at is null or token_expires_at <= valid_until)
);
comment on table public.fiscal_analysis_quotes is 'Versões de orçamento; valor e versão devem ser congelados pelo backend ao criar pedido.';
create index if not exists fiscal_analysis_quotes_request_idx on public.fiscal_analysis_quotes (request_id,version desc);
create unique index if not exists fiscal_analysis_quotes_one_active_idx on public.fiscal_analysis_quotes (request_id) where status in ('sent','accepted');

create table if not exists public.fiscal_analysis_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.fiscal_analysis_requests(id) on delete restrict,
  sender_role text not null check (sender_role in ('admin','client')),
  sender_user_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  visible_to_client boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists fiscal_analysis_messages_request_idx on public.fiscal_analysis_messages (request_id,created_at);

create table if not exists public.fiscal_analysis_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.fiscal_analysis_requests(id) on delete restrict,
  message_id uuid references public.fiscal_analysis_messages(id) on delete set null,
  storage_path text not null unique,
  original_filename text not null,
  media_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 15728640),
  uploaded_by_role text not null check (uploaded_by_role in ('admin','client','applicant')),
  created_at timestamptz not null default now()
);
create index if not exists fiscal_analysis_attachments_request_idx on public.fiscal_analysis_attachments (request_id);

create table if not exists public.fiscal_analysis_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.fiscal_analysis_requests(id) on delete restrict,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists fiscal_analysis_events_request_idx on public.fiscal_analysis_events (request_id, created_at);

-- Por padrão, bloquear acessos pelo browser. A abertura anônima e o vínculo
-- de identidade verificada deverão passar por endpoints de servidor protegidos.
alter table public.fiscal_analysis_requests enable row level security;
alter table public.fiscal_analysis_quotes enable row level security;
alter table public.fiscal_analysis_messages enable row level security;
alter table public.fiscal_analysis_attachments enable row level security;
alter table public.fiscal_analysis_events enable row level security;
revoke all on public.fiscal_analysis_requests, public.fiscal_analysis_quotes, public.fiscal_analysis_messages, public.fiscal_analysis_attachments, public.fiscal_analysis_events from anon, authenticated;

-- Apenas dados de atendimentos pagos vinculados ao usuário autenticado.
grant select on public.fiscal_analysis_requests, public.fiscal_analysis_quotes, public.fiscal_analysis_messages, public.fiscal_analysis_attachments to authenticated;
create policy fiscal_analysis_requests_paid_owner_read on public.fiscal_analysis_requests
 for select to authenticated using (user_id = (select auth.uid()) and paid_at is not null);
create policy fiscal_analysis_quotes_paid_owner_read on public.fiscal_analysis_quotes
 for select to authenticated using (exists (
   select 1 from public.fiscal_analysis_requests r
   where r.id = request_id and r.user_id = (select auth.uid()) and r.paid_at is not null
 ));
create policy fiscal_analysis_messages_paid_owner_read on public.fiscal_analysis_messages
 for select to authenticated using (visible_to_client and exists (
   select 1 from public.fiscal_analysis_requests r
   where r.id = request_id and r.user_id = (select auth.uid()) and r.paid_at is not null
 ));
create policy fiscal_analysis_attachments_paid_owner_read on public.fiscal_analysis_attachments
 for select to authenticated using (exists (
   select 1 from public.fiscal_analysis_requests r
   where r.id = request_id and r.user_id = (select auth.uid()) and r.paid_at is not null
 ));
-- Mensagens e arquivos somente via rotas de servidor, com checagem explícita
-- de propriedade, estado e tipo do arquivo; não há permissões de gravação de browser.
-- Não criar bucket público nem liberar URLs de Storage diretamente.
