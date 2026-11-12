# Plano de Implantação Controlada — Comércio V2

**Versão:** 1.0 — 12/11/2026  
**Status:** implantação experimental em acompanhamento; biblioteca parcialmente homologada (5/6 cenários), sem autorização para migração do legado.

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
| F1 | Catálogo V2 isolado | Criar e editar piloto sem alterar produtos antigos | Em andamento (homologação pendente) | PR #168 |
| F1B | Biblioteca de materiais V2 | Upload, edição, filtros, download e arquivamento sem acesso público | Parcialmente validado (5/6); prévia PDF pendente | PRs #170 e #172 |
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
| Cadastro, edição, consulta e permissões do produto | Pendente de homologação | — | PR #168 |
| Cadastro, upload, edição, filtros, download e arquivamento de materiais | Parcialmente validado: 5 testes aprovados, prévia de PDF pendente (não considerada falha sem diagnóstico) | 12/11/2026; ambiente não informado | PRs #170 e #172; relato da responsável |
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
| 12/11/2026 | Plano V1 | Construir piloto em paralelo, sem modificar legado | Inspeção inicial do GitHub; banco e produção ainda pendentes | A confirmar |
| 12/11/2026 | PR #170 | Adicionar biblioteca privada de materiais com arquivamento reversível | Implementação em branch; Supabase, upload, build e segurança ainda pendentes de teste | A validar |

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

## Correções identificadas na homologação de materiais — 12/11/2026
- **Constatação real:** upload e cadastro efetuados; navegação após salvar retornou `https://0.0.0.0:3000/...` com `ERR_ADDRESS_INVALID`.
- **Constatação real:** Visualizar e Baixar acionavam download de PDFs.
- **Solicitação:** adicionar categoria `Exercícios`.
- **Correções propostas:** redirecionamento por `Location` relativo; prévia PDF/imagens/texto com `Content-Disposition: inline` mediante autorização; download separado; migração aditiva da categoria.
- **Resultado:** código preparado, pendente de CI, aplicação da migração e repetição dos testes em ambiente funcional.
- **Nenhum arquivo legado editado.**

## Registro de homologação parcial — Biblioteca V2, após PR #172 (12/11/2026)

**Origem da evidência:** resultados informados pela responsável em conversa, após merge do PR #172. **Ambiente/URL exata:** não informado neste retorno. Não equivalem a teste independente da equipe técnica.

| Teste | Resultado informado | Status |
|---|---|---|
| Salvar alteração sem redirecionar para `0.0.0.0` | Funcionou | Validado funcionalmente |
| Visualizar PDF diretamente no navegador | Marcado como pendente; não há descrição do comportamento atual | **Pendente de execução/diagnóstico, não reprovado** |
| Baixar PDF por Baixar | Funcionou | Validado funcionalmente |
| Alterar categoria para Exercícios | Funcionou | Validado funcionalmente |
| Filtrar pela categoria Exercícios | Funcionou | Validado funcionalmente |
| Arquivar e restaurar | Funcionou | Validado funcionalmente |

**Balanço:** 5 de 6 testes informados como validados. **Não declarar F1B totalmente homologada** até confirmar a prévia PDF. Falta ainda confirmação específica de autorização não-admin, regressões, CI/build e limites de upload.

**Como concluir pendência de prévia:** abrir um PDF com `Visualizar`; anotar se abre em outra aba, baixa arquivo, mostra erro ou fica em branco; se possível inspecionar status HTTP e `Content-Type`/`Content-Disposition` sem compartilhar links temporários ou credenciais. Caso a prévia não funcione, abrir PR de correção restrita baseado na evidência. Se funcionar, registrar a data/ambiente e marcar como validado.

**Próximo PR funcional planejado:** F2, **Ofertas e Preços V2** isolados (preço, vigência, status, histórico), sem ligação com checkout legado. Iniciar após concluir diagnóstico de prévia e verificações de segurança ou acompanhar como pendência formal, sem confundir com validação completa.

**Regra de preservação:** arquivos já enviados, compradores e fluxos antigos continuam intocados; não realizar limpeza ou migração.

## Revisão de usabilidade — Biblioteca V2 (12/11/2026)

**Motivação:** transformar a tela única de formulário + lista lateral em uma listagem de largura integral, no mesmo padrão visual dos Modelos de E-mail da Torre.

**Mudanças propostas em PR próprio:**
- A rota `/torre/comercio-v2/materiais` passa a listar materiais em tabela com Data, Material, Produto, Descrição, Tipo, Situação e Ações.
- Filtros por texto, produto, tipo e situação ficam no topo e têm botão Limpar filtros.
- Botão `+ Novo conteúdo` abre `/torre/comercio-v2/materiais/novo`; editar usa `?editar=<id>`.
- Ações de Visualizar, Baixar, Arquivar e Restaurar são preservadas, assim como envio, vínculo por produto, categoria Exercícios e arquivo privado.
- O novo layout não muda tabelas, Storage, checkout ou regras de entrega. **Nenhum SQL novo**.
- Nota operacional: resultados limitados aos 500 registros mais recentes; paginação antes de escalar além desse volume.

**Homologação pendente:** conferir filtros e layout desktop/mobile, cadastramento e edição, links, operações de download/arquivamento e não regressão. A prévia PDF permanece pendente do teste anterior; alteração de interface não a considera resolvida.
