-- Modelos padrão para todos os produtos com checkout integrado.
-- Não modifica modelos personalizados existentes e não dispara e-mails.
insert into public.marketing_email_templates
(id,name,description,subject,body,kind,event_key,active,auto_enabled,auto_include_existing,cta_label,cta_url)
values
('eb0c0000-0000-4000-8000-000000000011',
 'Padrão — Cobrança gerada',
 'Comunicação transacional padrão para cobrança gerada de qualquer produto com checkout integrado.',
 'Seu pedido de {{produto}} foi recebido',
 $mail$Olá, {{nome}}!

Recebemos seu pedido.

Produto: {{produto}}
Valor: {{valor}}
Forma de pagamento: {{forma_pagamento}}
Situação: Aguardando pagamento.

Utilize o botão abaixo para visualizar sua cobrança.

Assim que o pagamento for confirmado, você receberá as instruções para acessar o produto ou serviço adquirido.

Diana Voltolini
Conhecimento fiscal sem complicação.$mail$,
 'transactional','default_charge_generated',true,false,false,
 'Ver cobrança','https://dianavoltolini.com.br'),
('eb0c0000-0000-4000-8000-000000000012',
 'Padrão — Pagamento confirmado',
 'Comunicação transacional padrão para pagamento confirmado de qualquer produto com checkout integrado.',
 'Pagamento confirmado — {{produto}}',
 $mail$Olá, {{nome}}!

Seu pagamento foi confirmado!

Produto: {{produto}}
Valor: {{valor}}
Forma de pagamento: {{forma_pagamento}}
Situação: Pagamento confirmado.

Para acessar sua compra, utilize o botão abaixo. Entre com o mesmo e-mail informado no pedido.

Se o produto exigir instruções específicas de entrega ou participação, consulte as orientações disponíveis na sua Área do Cliente.

Diana Voltolini
Conhecimento fiscal sem complicação.$mail$,
 'transactional','default_payment_confirmed',true,false,false,
 'Acessar minha compra','https://app.dianavoltolini.com.br/painel')
on conflict (id) do nothing;
