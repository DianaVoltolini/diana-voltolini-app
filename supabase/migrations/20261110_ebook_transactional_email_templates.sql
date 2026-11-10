-- Modelos transacionais do e-book, compartilhados pelo site público e pela Torre.
-- Mantém campanhas e newsletters independentes dos eventos de pagamento.
alter table public.marketing_email_templates
  add column if not exists event_key text;

alter table public.marketing_email_templates
  drop constraint if exists marketing_email_templates_kind_check;
alter table public.marketing_email_templates
  add constraint marketing_email_templates_kind_check
  check (kind in ('manual','welcome','transactional'));

create unique index if not exists marketing_email_templates_event_key_unique
  on public.marketing_email_templates(event_key) where event_key is not null;

insert into public.marketing_email_templates
(id,name,description,subject,body,kind,active,auto_enabled,auto_include_existing,cta_label,cta_url,event_key)
values
(
 'eb0c0000-0000-4000-8000-000000000001',
 'E-book IBS/CBS — Cobrança gerada',
 'Transacional: disparado exclusivamente quando a cobrança do e-book é gerada.',
 'Seu pedido de IBS e CBS na Prática foi recebido',
 $body$Olá, {{nome}}!

Recebemos seu pedido do IBS e CBS na Prática — E-book Digital + Encontro Online.

Resumo da compra:
Produto: IBS e CBS na Prática
Valor: {{valor}}
Forma de pagamento: {{forma_pagamento}}
Situação: Aguardando pagamento

Para consultar a cobrança, use o botão abaixo.

Assim que o pagamento for confirmado, você receberá um novo e-mail com as orientações para acessar o material.

Seu encontro online já tem data: 21 de janeiro de 2027, das 19h30 às 21h, horário de Brasília, pelo Google Meet.

O acesso ao e-book ficará disponível por 90 dias após a confirmação do pagamento, incluindo eventuais atualizações nesse período, sem custo adicional.

Diana Voltolini
Conhecimento fiscal sem complicação.$body$,
 'transactional',true,false,false,'Ver cobrança','https://dianavoltolini.com.br/ibs-cbs-na-pratica','ebook_charge_generated'
),
(
 'eb0c0000-0000-4000-8000-000000000002',
 'E-book IBS/CBS — Pagamento confirmado',
 'Transacional: disparado exclusivamente após confirmação do pagamento do e-book.',
 'Pagamento confirmado! Seu e-book IBS e CBS na Prática está disponível',
 $body$Olá, {{nome}}!

Seu pagamento foi confirmado!

Agora você já pode acessar o IBS e CBS na Prática, um material desenvolvido para ajudar você a compreender e aplicar os conceitos da Reforma Tributária nas rotinas de faturamento.

Seu e-book está disponível na Área do Cliente.

Primeiro acesso? Crie sua conta usando o mesmo e-mail informado na compra. Se já possui cadastro, entre na Área do Cliente e abra Meus E-books.

Encontro online — reserve esta data:
Data: 21/01/2027
Horário: das 19h30 às 21h (Brasília)
Plataforma: Google Meet

{{situacao_encontro}}

As orientações de participação e o link do encontro serão enviados oportunamente.

Sobre o acesso ao material:
Você terá 90 dias, contados da confirmação do pagamento, para acessar e baixar o e-book. Caso o material receba atualizações nesse período, a versão mais recente ficará disponível automaticamente, sem custo adicional.

Após esse prazo, o download será encerrado, mas sua Área do Cliente continuará acessível.

Bons estudos!
Diana Voltolini
Conhecimento fiscal sem complicação.$body$,
 'transactional',true,false,false,'Criar meu acesso','https://app.dianavoltolini.com.br/painel/ebooks','ebook_payment_confirmed'
)
on conflict (id) do nothing;
