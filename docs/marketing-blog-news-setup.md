# Avisos automáticos de novos conteúdos gratuitos do Blog

## Segurança e funcionamento
- Somente conteúdo `fiscal_articles` `status=published`, `visibility=public`, `delivery_type=geral` e data de publicação recente.
- Só considera conteúdos após a data configurada e publicados nas últimas **48 horas**, para impedir disparos retrospectivos ao reativar cron.
- Cada conteúdo é registrado uma única vez em `marketing_blog_notifications`. O enfileiramento é transacional e deduplica destinatários por e-mail.
- Os destinatários são inscritos com `newsletter_opt_in=true` nas landing pages ou newsletter da home, excluindo descadastrados.
- A rotina **apenas enfileira** os avisos; o envio de SMTP ocorre pela fila manual já testada e segue o limite comum de 800 tentativas por 24 horas.
- A fila verifica consentimento e descadastro novamente imediatamente antes de cada SMTP.
- Histórico da campanha aparece em `Torre → Modelos de E-mail → Resultados` como `Blog gratuito — <título>`.
- Um material gratuito registrado sem interessados é marcado `no_audience` e não é enviado retroativamente a novos contatos.

## Ordem de ativação
1. Aplicar migration `20261104_blog_newsletter_notifications.sql` no Supabase.
2. Integrar PR e fazer deploy.
3. Confirmar `MARKETING_CRON_SECRET` no GitHub/Hostinger, já usado na fila manual.
4. Confirmar a fila de envio existente: variável GitHub `MARKETING_QUEUE_CRON_ENABLED=1` e Hostinger `MARKETING_MANUAL_QUEUE_ENABLED=1` **somente após homologação real**.
5. Criar na Hostinger `MARKETING_BLOG_NEWS_ENABLED=1` e `MARKETING_BLOG_NEWS_SINCE=2026-11-04T15:00:00-03:00`, **substituindo este exemplo pela hora exata desejada de início**. Em ambiente de testes, deixar `MARKETING_BLOG_NEWS_ENABLED` desligado.
6. Depois de verificar destinatários, modelo e publicação futura, ativar variável GitHub `MARKETING_BLOG_CRON_ENABLED=1`. Até então, o cron agendado fica skipped.
7. Não clicar em `Run workflow` se não desejar iniciar uma verificação imediata da fila em produção.

## Atenção
- O cron de descoberta roda a cada 30 minutos (GitHub Actions pode ter atrasos). O envio real sai em lotes de até 10 a cada 5 minutos pelo cron da fila.
- É preciso **validar ponta a ponta** com uma publicação nova e um destinatário autorizado antes de usar publicações reais.
- A versão inicial não tem segmento de escolha manual de destinatários para avisos automáticos: o destino são todos os opt-ins elegíveis.
- A migração cria um modelo técnico de referência. O corpo e assunto do aviso são compostos a partir do título, resumo e slug da publicação, não do texto desse modelo.
