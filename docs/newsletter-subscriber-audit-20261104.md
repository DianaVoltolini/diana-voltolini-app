# Revisão de e-mails e painel — 04/11/2026

## Boas-vindas da newsletter
- O endpoint autenticado já existia: GET /api/marketing/welcome/run.
- GitHub Actions: marketing-welcome.yml, a cada 15 minutos.
- **O cron inicia desligado**: só funciona se a variável GitHub Actions MARKETING_WELCOME_CRON_ENABLED = 1.
- O workflow_dispatch manual executa independentemente da variável; não utilize antes de aprovar disparo real.
- Usar o secret GitHub MARKETING_CRON_SECRET igual ao secret da Hostinger.
- Antes de ativar: executar a migration 20261104_marketing_automatic_daily_budget.sql.
- O orçamento comum a boas-vindas e fila manual é 800 claims em janela móvel de 24 horas. A Hostinger pode contabilizar outros envios que não passam por esta base.
- O agendamento apenas executa modelos ativos e com auto_enabled = true cadastrados na Torre.
- O worker já tinha idempotência por template_id/email e verificação de descadastros; nenhum envio é executado pela implantação de código.
- **Atenção:** verificar previamente se um cron externo existente já chama /api/marketing/welcome/run, para evitar dois agendadores. O claim por destinatário evita duplicação concorrente da mesma entrega, mas dois agendadores são desnecessários.

## Newsletter de novas publicações
Não existe ainda rotina independente que observe a publicação do Blog gratuito e anuncie apenas novos conteúdos aos leads. Requer fluxo dedicado com deduplicação por publicação e consentimento e controle de edição após publicação. Não ativar nenhuma campanha genérica automaticamente para simular essa funcionalidade.

## Testes necessários para homologação
- Supabase: SQL aplicado com sucesso.
- GitHub: build verde; variables/secret configurados.
- Teste controlado do endpoint: validar resposta do cron e histórico na Torre.
- Confirmar consentimento na captura pela home e landing, e descadastro.
- Confirmar histórico de destinatários aceitos/pulando/bloqueados.
- Não tratar 'accepted' pelo SMTP como abertura ou entrega na caixa.
- Confirmar que nenhuma campanha pendente antiga será enviada indevidamente.

## Painel do assinante
- Oferta para explorar outros produtos é omitida para assinatura ativa.
- Conteúdo exclusivo mantém bloqueio via getFiscalAccess e somente publicados.
- Biblioteca informa número de resultados dos filtros, não total desatualizado.
- Textos usam 'conteúdo' em vez de 'artigo'.
- Não foi executado teste ponta a ponta autenticado de produção porque não há conta de assinante de teste conectada.
