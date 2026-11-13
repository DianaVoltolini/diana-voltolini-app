# F3B — Publicação controlada pela Torre

**Status:** implementação em PR, homologação pendente. **Não habilita vendas.**

## Mudanças
- Migração `20261113_commerce_v2_pages_publication_f3b.sql`: permite `draft` e `published`, adicionando `published_at`.
- Nova Server Action administrativa `changeCommercialPagePublication` para publicar ou retirar página com checagem de versão e vínculo entre produto/oferta.
- Coluna Situação distingue rascunho e publicada; a listagem oferece as ações **Publicar** ou **Retirar**. Editar só é permitido em rascunho.
- Prévia administrativa permanece acessível após publicação.
- **A marcação publicada não torna a URL pública sozinha.** O site exige `COMMERCE_V2_PUBLIC_PAGES_ENABLED=true`, inicialmente ausente/desligada.

## Fluxo de alteração de conteúdo após publicação
1. Clicar **Retirar** na Torre.
2. Editar a página em rascunho.
3. Visualizar a prévia.
4. Clicar **Publicar** novamente.
5. Verificar página pública, se a flag do site já tiver sido habilitada.

**Nota:** durante edição, a URL pública retorna 404 se já estiver habilitada. Uma futura etapa poderá adicionar publicação por versões sem indisponibilidade. Até lá, controlar a janela de edição. Esta limitação deve ser resolvida antes de migrar produtos comerciais ativos.

## Testes
- [ ] SQL aplicado após revisar schema.
- [ ] Confirmar constraints e RLS ativas.
- [ ] Criar, editar, visualizar página em rascunho.
- [ ] Publicar e retirar, com mudança correta de status e versão.
- [ ] Confirmar que operações sem admin são bloqueadas.
- [ ] Recusar publicações com vínculo de oferta/produto inconsistente.
- [ ] Site sem flag retorna 404 mesmo com status published.
- [ ] Site com flag ativa exibe apenas páginas published.
- [ ] Botão não compra, site mantém noindex.
- [ ] Build/lint das duas aplicações e regressão.
- [ ] Checkout e páginas existentes sem alteração.

## Cuidados de deploy
Os dois repositórios têm implantações independentes. Manter flag pública desligada até completar a homologação. Em eventual erro, desligar a flag no Site antes de qualquer alteração de legado.

## Estado anterior
O PR #187 do formulário de exemplo foi incorporado ao main. A existência do exemplo não comprova gravação ou homologação do rascunho pela responsável.
