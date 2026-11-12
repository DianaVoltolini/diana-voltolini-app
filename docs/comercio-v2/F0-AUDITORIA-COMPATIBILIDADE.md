# F0 — Auditoria de compatibilidade e isolamento do Comércio V2

**Data:** 12/11/2026  
**Status:** auditoria estática inicial concluída; auditoria do banco e homologação em ambiente ainda pendentes.  
**Mudanças operacionais:** nenhuma. Este documento não autoriza migrações, ativação de endpoints, alterações de preço ou cobranças.

## 1. Objetivo e decisão arquitetural

Construir um comércio V2 experimental e isolado, capaz de operar **produto → oferta versionada → página dinâmica → checkout → pagamento → entrega**. Criar primeiro um produto fictício com página própria, sem tocar no legado; homologar antes de migrar qualquer produto real.

**Decisão F0:** não modificar `public.products`, `public.orders`, `public.payments`, `product_deliveries`, `marketing_landings` ou rotas existentes nesta fase. Em F1, propor tabelas próprias para o piloto (prefixo **commerce_v2_** ou outro namespace validado após inspeção do banco), isoladas das estruturas legadas. Nenhuma tabela será criada sem validar o esquema real, as RLS e os nomes disponíveis.

## 2. Evidências conferidas no GitHub (branch main)

| Componente | Repositório/caminho | Evidência | Risco/decisão |
|---|---|---|---|
| Produtos e Entregas | `diana-voltolini-app/app/torre/produtos-entregas/page.tsx` | Lê `products`, `product_deliveries`, `product_delivery_versions` | Não alterar a tela legada |
| Publicação de material | `diana-voltolini-app/app/torre/produtos-entregas/actions.ts` | Usa Storage `product-deliveries` e RPC `publish_product_delivery`; remove PDF anterior após publicar novo | Não publicar PDF do piloto pelo fluxo legado |
| Migração de entregas | `diana-voltolini-app/supabase/migrations/20261109_product_deliveries_notifications.sql` | Define tabelas, RLS, bucket e RPC; referencia `products` | Não reaplicar/alterar sem inventário do banco real |
| Área do cliente | `diana-voltolini-app/app/api/ebooks/ibs-cbs-na-pratica/download/route.ts` | Confere sessão, produto, pedido pago, vigência e gera link temporário | Preservar download, expiração e direitos adquiridos |
| Permissão Torre | `diana-voltolini-app/lib/auth/require-admin.ts` | Confere claims e perfil admin ativo | Reutilizar padrão de autorização em páginas V2 |
| Landing gratuita | `diana-voltolini-app/app/torre/landings/page.tsx` e `actions.ts` | Usa `marketing_landings`, uploads e captação de leads | NÃO transformar editor gratuito em checkout sem projeto separado |
| Checkout do encontro | `diana-site/app/api/checkout/encontro-reforma-tributaria/route.ts` | Consulta `products`, `orders`, `payments`; valida produto `ENC-RT-2027-001` e preço fixo de 9700 centavos | Mantenha endpoint e regras atuais intocados |
| Página do encontro | `diana-site/app/checkout/encontro-reforma-tributaria/page.tsx` | Texto, data, nome e R$ 97 no código | Nenhuma atualização automática até migração aprovada |
| Stack | `package.json` nos dois repositórios | Next.js 16.4.3, React 19, Supabase | Projetos têm ciclos de deploy independentes |
| Plano geral | PR #166 (`diana-voltolini-app`) | Plano anterior ainda aberto e não integrado à main na leitura da auditoria | Evitar conflito: este PR cria somente documento F0 independente |

**Observação:** os pontos acima demonstram o que o código consultado implementa, não provam o estado do banco de produção nem sucesso de testes ponta a ponta.

## 3. Fronteiras para não interferir no legado

- Não editar nenhum arquivo de checkout existente.
- Não usar `products.active` como chave de ativação do piloto, nem criar piloto na tabela legada antes de um desenho de compatibilidade comprovado.
- Não alterar ou remover PDFs, buckets, e-mails, webhooks, jobs, cobranças, pedidos ou redirecionamentos antigos.
- Não atribuir ao V2 os códigos já usados em produção.
- Toda V2 começa com `draft`, não listada nem indexada. Mesmo com slug conhecido, nenhuma compra deve ser viável até liberação explícita e controles de autenticação/aprovação adequados.
- Novas rotas administrativas em namespace distinto (proposta: `/torre/comercio-v2`).
- Novas rotas comerciais em namespace isolado e reservado (proposta: `/v2/p/` e `/v2/checkout/`; validar conflito de roteamento previamente).
- Não usar `/teste` como única barreira de segurança. O servidor deve recusar cobranças quando oferta não publicada.
- A interface pode aproveitar design system, checagem administrativa e serviços de leitura, mas não compartilhar gravações mutáveis com o legado neste momento.
- Utilizar identificadores internos estáveis (UUID) e código imutável; IDs do Bling em campos separados e opcionais.
- Histórico imutável da oferta contratada e vínculo ao pedido V2, independentemente de futuras edições.
- Mudanças em preço ou entrega não reescrevem pedidos emitidos nem direitos de quem já comprou.

## 4. Modelo de dados V2 candidato (a validar)

| Entidade candidata | Responsabilidade |
|---|---|
| `commerce_v2_products` | Código único, nome, tipo, descrições, status e identidade comercial |
| `commerce_v2_offers` | Preço em centavos, moeda, vigência, status e condições comerciais; histórico de versões |
| `commerce_v2_pages` | Slug, modelo, conteúdo estruturado versionado e estado de publicação |
| `commerce_v2_deliverables` | Itens prometidos e configuração de acesso/entrega por oferta |
| `commerce_v2_orders` | Snapshot do produto/oferta/preço/entregas, estado e chave de idempotência |
| `commerce_v2_payments` | Referências externas, status, conciliação e rastreamento sem duplicações |
| `commerce_v2_audit_log` | Autor, data e alterações rastreáveis |

Este é um **desenho preliminar**, não uma migração SQL pronta. Antes de implementá-lo, verificar se as tabelas V2 já existem e definir as dependências reais para Bling, autenticação, e-mails e área do cliente.

## 5. Produto e página piloto

- Código candidato: `TESTE-FLUXO-001` (verificar unicidade primeiro).
- Nome: **Produto piloto — Validação da Torre V2**.
- Status inicial: **rascunho**, não indexado, sem pagamento real.
- Página independente: modelo de encontro on-line, com informações fictícias identificadas.
- Dados demonstrativos não são oferta comercial, nem geram acesso pago.
- Validar editor, preview e publicação em ambiente de homologação; publicação em produção exige autorização separada.
- Testes financeiros somente após confirmar ambiente, controles de segurança, valor autorizado e plano de reversão/estorno.

## 6. F0 — itens ainda NÃO validados

| Item | Status | Como confirmar |
|---|---|---|
| Colunas, constraints e relações de `products`, `orders`, `payments` | Pendente | SQL de introspecção somente-leitura no Supabase |
| RLS/policies/grants e funções SECURITY DEFINER das tabelas atuais | Pendente | Consultar catálogos PostgreSQL; não alterar |
| Existência de namespaces/tabelas V2 e colisão de slugs | Pendente | Introspecção SQL e inventário de rotas |
| Rotas completas de Bling, webhooks e conciliação | Parcial | Auditoria dirigida de fontes, tarefas agendadas e banco |
| Acesso a e-books e termos de expiração atuais | Parcial | Revisão de código e testes com compras de amostra autorizadas |
| Variáveis de ambiente e isolamento do ambiente de testes | Pendente | Verificar nomes e permissões sem expor segredos |
| Controle de publicação sem deploy e estratégia de cache | Pendente | Desenhar contrato de leitura pública e invalidação |
| Checklist regressivo com evidências reais | Pendente | Homologação e aprovação da responsável |

**Conclusão F0:** é seguro iniciar o desenho independente do piloto. **Ainda não está autorizado** executar SQL de criação, criar cobranças, publicar páginas de venda reais ou considerar toda a F0 homologada.

## 7. Próximo PR proposto — F1A

**Escopo:** catálogo V2 em modo rascunho, SEM checkout.

- Inspecionar esquema real antes de gerar migration;
- criar somente estruturas V2 sem FKs ou triggers de escrita que modifiquem legado;
- UI administrativa `/torre/comercio-v2/produtos` com lista, criação e edição;
- aplicar `requireAdmin` e permissões fechadas no banco;
- campos: código imutável, nome, tipo, descrição, imagem (se suporte seguro), entrega descritiva e status draft;
- não fazer exposição pública, não publicar, não cobrar, não gravar em `orders` nem Bling;
- primeiro teste com produto fictício;
- relatórios de build/lint, evidência e rollback.

**Dependência bloqueante:** inspeção do banco e ambientes antes da execução da migração F1A.

## 8. Checklist de aceite F1A

- [ ] Cadastro V2 de teste criado e editado sem alterar linhas de `products` antigas
- [ ] Usuário não administrador não pode acessar ou gravar
- [ ] Slug e código únicos verificados
- [ ] Sem chamadas a Bling, e-mails de compra, checkout ou webhooks
- [ ] `npm run build` e `npm run lint` com resultado documentado
- [ ] Checagem regressiva de vendas e entregas legadas
- [ ] Plano de reversão da V2 disponível sem rollback do legado
- [ ] Responsável registrou validação e evidência no plano de controle

## 9. Registro de decisões

| Data | Decisão | Status |
|---|---|---|
| 12/11/2026 | Piloto integralmente paralelo e sem migração automática | Aprovado como objetivo |
| 12/11/2026 | Rotas e tabelas comerciais V2 separadas na fase piloto | Proposta técnica F0 |
| 12/11/2026 | Não efetuar teste financeiro real sem autorização expressa | Regra de segurança |
| 12/11/2026 | Migrar individualmente somente após homologação | Objetivo aprovado |
| 12/11/2026 | Eliminar legado apenas após inventário, retenção, backup e aprovação | Regra de segurança |

## 10. Modelo de atualização após cada PR

**PR / fase:**  
**Data e ambiente:**  
**Arquivos/migrations:**  
**Funcionalidade validada:**  
**Evidência e resultado:**  
**Regressões realizadas:**  
**Pendência e risco:**  
**Rollback:**  
**Decisão:** Pendente / Em andamento / Bloqueado / Reprovado / Validado.

---

Este documento complementa, mas não substitui, o plano mestre do PR #166; incorporá-los após revisão, sem sobrescrever histórico.
