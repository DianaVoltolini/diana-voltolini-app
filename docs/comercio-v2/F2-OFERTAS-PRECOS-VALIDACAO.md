# F2 — Ofertas e Preços V2: validação

**Situação:** código proposto em PR; sem execução de SQL, deploy ou homologação confirmada.

## Objetivo
Cadastrar ofertas vinculadas aos produtos V2, com preço normal e promocional, vigência e histórico de versões. **Exclusivamente em rascunho**. Não se conecta ao checkout, Bling, pedidos, pagamentos ou entregas existentes.

## Escopo
- Nova tabela `commerce_v2_offers` com referência exclusiva a `commerce_v2_products`.
- Histórico `commerce_v2_offer_revisions` via trigger do banco, gerado na inclusão e em cada atualização.
- Valores em centavos de BRL, validação de desconto menor que preço original e período obrigatório para promoção.
- Uma nova oferta pode ser vinculada a um produto V2 existente; edições preservam versões anteriores.
- Edição otimista pelo número da versão, para evitar sobrescrever uma alteração concorrente.
- Nova tela `/torre/comercio-v2/ofertas`, formulário `/torre/comercio-v2/ofertas/novo` e item exclusivo no menu.
- RLS habilitada, acesso do cliente SQL revogado, Server Actions apenas após `requireAdmin()`.
- Status de oferta limitado a `draft`, por constraint SQL; não é possível ativar comercialmente nesta fase.

## Migração
Arquivo: `supabase/migrations/20261112_commerce_v2_offers_f2.sql`.

**Pré-requisito:** tabela `commerce_v2_products` já existente (confirmada em diálogo anterior).

Antes de executar, revisar a migração em ambiente adequado. Não se deve rodar criação de oferta em outro banco sem verificar dependências. Após aplicação, conferir:
```sql
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('commerce_v2_offers','commerce_v2_offer_revisions');

select c.relname, c.relrowsecurity from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public'
  and c.relname in ('commerce_v2_offers','commerce_v2_offer_revisions');
```

## Testes de aceite
| Teste | Estado |
|---|---|
| Nova oferta vinculada a produto piloto, em rascunho | Pendente |
| Preço normal 297,00 salvo como 29700 centavos | Pendente |
| Promocional 97,00 salvo como 9700 centavos | Pendente |
| Rejeitar promoção igual/superior ao preço normal | Pendente |
| Rejeitar promoção sem ambas as datas ou com fim anterior ao início | Pendente |
| Remover promoção sem modificar preço normal | Pendente |
| Editar e conferir versões 1 e 2 no histórico | Pendente |
| Duas edições concorrentes não sobrescrevem uma à outra | Pendente |
| Usuário não-admin não consegue editar ou ler | Pendente |
| Oferta não gera cobrança nem altera checkout legado | Pendente |
| Lint, build e acessibilidade básica | Pendente |
| Regressão de Biblioteca, produtos e vendas atuais | Pendente |

## Observações de segurança
- Cadastro não equivale a ativação. O estágio F3 (páginas) e F4 (checkout) ainda não existem neste fluxo.
- As datas representam intenção de vigência, sem nenhum agendador ou mudança de status automática.
- Valores já contratados no checkout legado permanecem exatamente como estão.
- O sistema precisa guardar snapshot da oferta e direitos do comprador quando F4 for implementado.
- Não alterar tabela legada `products` nem `orders`, `payments` e integração do Bling.

## Rollback
Reverter menu e rotas V2 do PR. Preservar ofertas e histórico do novo banco, se houver dados, até decisão de limpeza aprovada. Não alterar ou restaurar tabelas financeiras antigas.

## Registro da Biblioteca
A reorganização visual foi informada como validada pela responsável. A prévia PDF continua sem resultado positivo confirmado e permanece como pendência de F1B.

**Próxima fase:** F3 — modelos de páginas de venda dinâmicas, ainda sem checkout ao vivo.
