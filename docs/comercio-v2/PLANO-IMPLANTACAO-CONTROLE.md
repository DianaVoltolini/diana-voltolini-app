# Plano de Implantação Controlada — Comércio V2

**Versão:** 1.0 — 12/11/2026  
**Status:** Planejamento. Nenhum deploy ou alteração no fluxo atual autorizado.

## Objetivo
Implantar fluxo comercial novo, independente: **produto → oferta → página → prévia → publicação → checkout → pagamento → entrega → auditoria**, com um produto-piloto e página criada do zero. Somente após homologação ponta a ponta, migrar os produtos existentes individualmente.

## Regras inegociáveis
1. Não alterar, excluir, redirecionar ou substituir checkouts, páginas, produtos, pedidos, cobranças, documentos fiscais, PDFs e acessos atuais.
2. Implantar V2 com novas rotas, estruturas complementares e chave de ativação desligada por padrão. Reaproveitar componentes e padrões sem compartilhar gravações que interfiram no legado.
3. Valor e condições são validados no servidor; cada pedido registra snapshot imutável da oferta contratada.
4. Não gerar cobrança real de teste sem autorização específica, ambiente e plano de cancelamento/estorno.
5. Não migrar nem remover um produto antes de evidências, aprovação, backup e plano de reversão.
6. Nenhuma eliminação automática de dados históricos financeiros, fiscais ou direitos adquiridos.

## Inventário inicial confirmado no código
- **Torre/área do cliente:** `DianaVoltolini/diana-voltolini-app`
- **Site e checkout:** `DianaVoltolini/diana-site`
- `products` é consultada pelo checkout do encontro.
- `/torre/produtos-entregas` administra PDF e versões.
- `/torre/landings` é voltada à captação com material gratuito.
- O checkout do encontro contém verificação explícita de R$ 97,00 e textos fixos; **não modificar a rota legada**.
- **Pendente de auditoria:** estrutura real do Supabase, RLS, webhooks, integrações, ambientes e regressões de produção.

## Produto piloto (proposta, sujeito a confirmação de unicidade)
- **Código provisório:** `TESTE-FLUXO-001`
- **Nome:** Produto piloto — Validação do novo checkout
- **Conteúdo:** demonstração sem promessa comercial.
- **Rotas propostas:** `/teste/oferta-piloto` e `/teste/checkout-piloto`.
- **Estado inicial:** rascunho, sem indexação e sem pagamentos reais.

## Registro das fases

| Fase | Entrega | Critério de aceite | Status | PR/evidência |
|---|---|---|---|---|
| F0 | Auditoria de tabelas, RLS, rotas, Bling e dependências | Matriz de compatibilidade, rollback e regressão registrados | Pendente | — |
| F1 | Catálogo V2 isolado | Criar e editar piloto sem alterar produtos antigos | Em andamento (homologação pendente) | PR #168 |\n| F1B | Biblioteca de materiais V2 | Upload, edição, filtros, download e arquivamento sem acesso público | Em andamento (homologação pendente) | PR #170 |
| F2 | Ofertas e precificação versionadas | Preço servidor e snapshot no pedido | Pendente | — |
| F3 | Editor e publicação de página V2 | Criar/publicar/editar piloto sem PR de conteúdo | Pendente | — |
| F4 | Checkout V2 isolado | Pix/boleto, idempotência e erros verificados | Pendente | — |
| F5 | Entregas e área do cliente V2 | Pedido pago libera conteúdo e respeita prazo | Pendente | — |
| F6 | Homologação ponta a ponta | Evidências, rollback e zero regressão | Pendente | — |
| F7 | Migração gradual por produto | Cada produto passa por aceite individual | Pendente | — |
| F8 | Desativação e limpeza do legado | Inventário sem dependências e aprovação explícita | Pendente | — |

Estados aceitos: `Pendente`, `Em andamento`, `Bloqueado`, `Reprovado`, `Validado`. Um item somente é **Validado** com data, ambiente, responsável e evidência.

## Matriz de validação

| Cenário | Status | Data/ambiente | PR/evidência |
|---|---|---|---|
| Cadastro, edição, consulta e permissões do produto | Pendente de homologação | — | PR #168 |\n| Cadastro, upload, edição, filtros, download e arquivamento de materiais | Pendente de homologação | — | PR #170 |
| Oferta normal/promocional, vigência e preço | Pendente | — | — |
| Prévia, publicação, SEO e edição de página | Pendente | — | — |
| Checkout, Pix/boleto e proteção contra duplicidade | Pendente | — | — |
| Pagamento pendente, pago, cancelado e falhas | Pendente | — | — |
| Entrega, expiração e acesso por compra | Pendente | — | — |
| Regressão de checkouts e acessos legados | Pendente | — | — |
| Desativação/rollback do V2 | Pendente | — | — |

## Lista de legado — preservar até o final

| Item | Regra agora | Critério mínimo para desativar/remover |
|---|---|---|
| Rotas antigas de checkout | Não tocar | Produto migrado, estabilizado e aceito |
| Páginas comerciais codificadas | Manter públicas | Página nova validada, URLs/SEO e redirects revisados |
| Preços e textos fixos | Não remover | Novas ofertas seguras e checkout V2 verificados |
| Entregas antigas e PDFs | Preservar acesso | Garantir compras anteriores e direitos adquiridos |
| Tabelas e colunas legadas | Não excluir | Nenhuma dependência, retenção legal e backup |
| Webhooks, jobs e e-mails antigos | Não interromper | Inventário de consumidores e validação operacional |

## Condições para avançar
- **PR:** escopo, alteração em banco, arquivos, testes e rollback documentados.
- **Deploy:** build, lint, migração e permissões revisados; V2 desligado.
- **Pagamento piloto:** autorização explícita, ambiente, valor e contingência.
- **Publicação:** conteúdo revisado; URL e proteção contra indexação de testes.
- **Migração:** mapeamento IDs antigo/novo, pedidos, entregas, oferta e URLs.
- **Limpeza:** janela de estabilidade, aprovação explícita, backup e ausência de dependentes.

## Diário de decisões

| Data | Referência | Decisão | Evidências | Aprovação |
|---|---|---|---|---|
| 12/11/2026 | Plano V1 | Construir piloto em paralelo, sem modificar legado | Inspeção inicial do GitHub; banco e produção ainda pendentes | A confirmar |\n| 12/11/2026 | PR #170 | Adicionar biblioteca privada de materiais com arquivamento reversível | Implementação em branch; Supabase, upload, build e segurança ainda pendentes de teste | A validar |

**Atualizar a cada PR:** data, autor, escopo, arquivos, migração, testes e resultados, evidência, pendências, rollback e decisão de aceite.

## Modelo de validação
- **Cenário:**
- **Ambiente/data:**
- **Produto, oferta, página:**
- **Passos executados:**
- **Esperado / obtido:**
- **Evidência (sem dados pessoais/sigilosos):**
- **Responsável:**
- **Decisão:** Pendente / Em andamento / Bloqueado / Reprovado / Validado
- **Rollback:**

## Encerramento
O V2 só substitui o fluxo legado após homologação completa do piloto e migração aceita de cada produto real. Remoções requerem lista nominal, aprovação específica e plano de reversão. Histórico fiscal/financeiro e direitos de compradores não são descartados.
