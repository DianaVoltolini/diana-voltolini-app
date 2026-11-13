# F3A — Páginas de Vendas: cadastro e prévia administrativa

**Status:** implementação proposta; sem SQL aplicado, merge, deploy ou homologação confirmados.

## Entrega
- Tabela exclusiva `commerce_v2_pages` em rascunho, com RLS habilitada, acesso direto público revogado e vínculos a produto e oferta V2.
- Listagem com cabeçalho azul-escuro, detalhes dourados, ícones de editar e pré-visualizar.
- Editor para modelo de encontro online, e-book, serviço e curso; campos de chamada, título, subtítulo, benefícios, público, informações, FAQ, CTA desabilitado e SEO.
- Prévia privada sob `/torre/comercio-v2/paginas/previa/[id]`, exigindo `requireAdmin`. O preço é consultado da oferta V2 vinculada, considerando a data da promoção em São Paulo.
- Slug imutável após cadastro; versão otimista para não sobrescrever alterações concorrentes.
- Toda alteração segue o padrão visual da Área Comercial.
- Não há roteamento comercial público, checkout, botão funcional de compra, publicação ou migração de páginas existentes.

## Migração
`supabase/migrations/20261112_commerce_v2_pages_f3a.sql`. Pré-requisitos: tabelas `commerce_v2_products` e `commerce_v2_offers` já existentes. Conferir situação de ambos antes de executar.

## Checklist de aceite
| Cenário | Estado |
|---|---|
| Criar página piloto com produto e oferta do mesmo cadastro | Pendente |
| Rejeitar oferta de outro produto | Pendente |
| Salvar e editar textos sem alterar o checkout | Pendente |
| Abrir prévia somente com perfil administrador | Pendente |
| Exibir oferta normal e promocional conforme vigência | Pendente |
| Confirmar CTA não interativo (sem pedido/cobrança) | Pendente |
| Rejeitar slug duplicado ou alterado após cadastro | Pendente |
| Edição concorrente exibir conflito em vez de sobrescrever | Pendente |
| Validar desktop e celular | Pendente |
| Validar lint, TypeScript e build em CI | Pendente |
| Regressão de produtos, biblioteca e ofertas existentes | Pendente |
| Confirmar ausência de rotas públicas novas | Pendente |

## Limitações explícitas
- Os campos são texto simples, não HTML ou markdown interpretado.
- O campo de FAQ é texto livre; perguntas estruturadas podem ser adicionadas em etapa posterior.
- Não existe versionamento histórico de cada revisão; apenas número de versão e edição otimista. Histórico editorial ficará para PR separado, se necessário.
- A prévia reflete a oferta atual; o preço contratado será congelado no pedido somente quando o checkout V2 for implementado.
- A publicação pela Torre (sem novo commit) exigirá contrato de leitura pública no site, política de cache, validação da oferta e segurança de publicação, previstos em F3B.
- Página e domínio público definitivo dependem de revisão do repositório `diana-site`.

## SQL de conferência após migração
```sql
select table_name from information_schema.tables
where table_schema='public' and table_name='commerce_v2_pages';
select relname, relrowsecurity from pg_class
where oid='public.commerce_v2_pages'::regclass;
```

## Rollback
Reverter rotas e menu da nova etapa. Não excluir a tabela enquanto houver dados piloto; manter backup antes de qualquer limpeza. Nenhuma tabela ou rota anterior precisa ser restaurada.

## Próxima fase
**F3B — Publicação controlada e leitura pública**: somente após homologar F3A e auditar integração entre Torre e site, com modo desativado por padrão e checkout ainda separado.
