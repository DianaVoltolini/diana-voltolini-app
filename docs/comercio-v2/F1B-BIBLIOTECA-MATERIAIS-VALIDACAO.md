# F1B — Biblioteca de materiais por produto (Comércio V2)

**Estado:** implementado em branch, **não validado em produção**. Não há mudanças nas rotas financeiras atuais.

## Objetivo

Manter, por produto V2, quantos materiais forem necessários, mesmo que ainda não exista página ou checkout. O material pode ser cadastrado sem arquivo, receber upload posteriormente, ter nome/descrição/categoria editados, ser substituído, visualizado, baixado, arquivado e restaurado.

## Estrutura
- Tabela `public.commerce_v2_materials`, FK exclusivamente para `commerce_v2_products`.
- Bucket privado `commerce-v2-materials`. Não usar `product-deliveries`, `marketing-deliveries` ou buckets antigos.
- RLS habilitada e grants retirados de `anon` e `authenticated`.
- Administração somente por `requireAdmin` + cliente servidor autorizado.
- UI `/torre/comercio-v2/materiais`, com filtros produto, tipo, nome/descrição e situação.
- Rota POST `/torre/comercio-v2/materiais/salvar`: valida Origin, autenticação, tipo e tamanho do arquivo. Não aumenta limites globais de Server Actions.
- Rota GET `/torre/comercio-v2/materiais/arquivo/[id]`: somente admin, link assinado temporário.
- Materiais arquivados ficam ocultos da listagem normal e podem ser restaurados. Não há exclusão física automatizada.
- Substituição faz upload de novo arquivo, grava a nova referência e depois tenta remover o anterior. Não há versionamento dos arquivos neste PR.

## Tipos
PDF, DOCX, PPTX, XLSX, PNG, JPEG, WEBP, ZIP e TXT. Máximo 25 MiB por arquivo, sujeito aos limites do proxy/hospedagem. Extensão e MIME são verificados; para ambiente de produção definitiva, incluir verificação adicional de conteúdo/assinatura quando aplicável.

## Pré-requisitos
1. A migration `20261112_commerce_v2_products_pilot.sql` já deve ter sido aplicada.
2. Executar e revisar `20261112_commerce_v2_materials.sql` no Supabase adequado.
3. Confirmar `storage.buckets.public = false` e RLS/grants da nova tabela.
4. Conferir limites de upload do Hostinger/proxy. Não presumir que 25 MiB funcionam sem teste.
5. Executar build/lint na branch antes de merge e implantação.

## Casos de teste a registrar

| Cenário | Estado |
|---|---|
| Criar material A no produto piloto, com nome e descrição, sem arquivo | Pendente |
| Enviar PDF no material A | Pendente |
| Cadastrar material B no mesmo produto com arquivo diferente | Pendente |
| Filtrar por produto, tipo e busca de texto | Pendente |
| Editar título e descrição sem trocar arquivo | Pendente |
| Substituir arquivo e baixar versão atual | Pendente |
| Visualizar PDF/imagem; baixar DOCX/PPTX/XLSX | Pendente |
| Arquivar e restaurar material | Pendente |
| Negar acesso de usuário não administrador, URL direta e bucket privado | Pendente |
| Recusar extensão/tamanho inválidos e requisição cross-origin | Pendente |
| Confirmar que não houve alterações em products/orders/payments/Bling/entregas existentes | Pendente |
| Verificar limite real de upload no proxy e rollback | Pendente |

## Conteúdo inicial sugerido da aula online
Criar um **produto V2 em rascunho** (não reutilizar o ID do produto comercial atual). Exemplos de materiais:
- Slides da apresentação;
- Roteiro da aula e perguntas;
- Planilha de exercícios;
- Checklist de conferência;
- E-book de apoio;
- Simulação de NF-e.

Cada item deve ter descrição própria e arquivo opcional; não conceder acesso aos compradores automaticamente.

## Rollback
Reverter somente o código deste PR. Preservar a nova tabela/bucket enquanto contiverem materiais; exportar/guardar arquivos antes de qualquer exclusão futura. Nenhuma tabela antiga precisa ser alterada para desfazer este módulo.

## Pendências para etapas seguintes
- Histórico de versões dos arquivos (opcional).
- Paginação acima de 500 registros por consulta.
- Vinculação de materiais à entrega contratada em uma oferta V2 (futuro PR).
- Teste real com arquivos de 1, 5 e 20 MiB, incluindo plano de contingência da hospedagem.

**Atenção:** biblioteca privada de autoria é diferente de entrega automática ao cliente. A entrega só será implementada após o checkout V2 ser homologado.
