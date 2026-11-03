# Fila de e-mails do envio manual — implantação controlada

## Escopo
A confirmação na Torre apenas cria, de forma atômica, a campanha e seus destinatários em `pending`.
O worker percorre os registros em lotes de até **10 mensagens por execução**, com registro de
`claimed_at` **antes** do envio SMTP, preservando o histórico já existente.

## Implantação
1. Integre o PR após o build e aplique `supabase/migrations/20261103_marketing_manual_queue.sql`
   no SQL Editor do projeto Supabase correto.
2. Na Hostinger do `app.dianavoltolini.com.br`, configure
   `MARKETING_MANUAL_QUEUE_ENABLED=0` ou deixe a variável ausente inicialmente.
3. Confirme que `MARKETING_CRON_SECRET` já existe no ambiente de produção e não divulgue o valor.
   Configure um agendador no servidor para executar a cada 5 minutos:
   `GET https://app.dianavoltolini.com.br/api/marketing/manual-queue/run`
   com header `Authorization: Bearer <MARKETING_CRON_SECRET>`.
   Execute esse acesso apenas por um agendador capaz de guardar o segredo de forma restrita.
   Não coloque o segredo em URL, página pública, log nem GitHub.
4. Antes de ativar, crie uma campanha de homologação com destinatários que consentiram,
   confirme pelo painel que ela entrou na fila e consulte os registros no Supabase.
   O worker desativado responde `enabled:false` e não envia e-mails.
5. Defina `MARKETING_MANUAL_QUEUE_ENABLED=1`, execute uma rodada controlada,
   confira contagens e depois mantenha o agendamento.

## Proteções e limites
- 10 registros por execução; até 800 claims por 24 horas em conjunto com os
  registros `marketing_email_deliveries.claimed_at` da automação existente.
  Margem de 200 em relação aos 1.000 e-mails/24h informados para a caixa Hostinger.
  **Não contabiliza** e-mails enviados manualmente pela caixa ou por outros sistemas:
  deve-se respeitar também esse consumo real.
- Consulta consentimento novamente antes do SMTP, verifica descadastro e usa apenas
  um e-mail normalizado por campanha.
- Uma tentativa `sending` jamais é automaticamente reencaminhada após falha ou
  timeout. Verificar log, histórico e provedor SMTP antes de qualquer reconciliação.
- `accepted` indica aceitação pelo SMTP; não comprova entrega na caixa de entrada.
- A rotina automática de boas-vindas permanece independente; ela não é migrada aqui.
- Não habilitar a fila antes de confirmar migração, agendador, configuração e teste.
