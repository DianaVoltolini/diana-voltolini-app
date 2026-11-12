# F1A — Cadastro piloto Comércio V2

**Estado:** PR implementado; revisão e homologação pendentes. Não declarar validado apenas pelo merge.

## Escopo entregue no código
- Migração aditiva `20261112_commerce_v2_products_pilot.sql` cria somente `commerce_v2_products`, com RLS ligada, grants revogados e status exclusivamente `draft`.
- `/torre/comercio-v2/produtos` lista, cadastra e edita campos comerciais do piloto. Acesso exige `requireAdmin()`.
- Código do produto não pode ser alterado após criação; unicidade garantida pelo banco.
- A V2 não cria, publica, cobra ou entrega qualquer produto. Não é uma rota pública.
- A navegação da Torre passa a ter um link adicional **Comércio V2 (piloto)**.

## Não alterado
Tabelas e rotas legadas `products`, `orders`, `payments`, `product_deliveries`, `marketing_landings`, Bling, pagamentos, e-mails e PDFs.

## Aplicação segura
1. Revisar e aprovar a migração proposta após consulta de somente leitura ao Supabase, especialmente nomes existentes e permissões.
2. Aplicar a migração no ambiente adequado antes de testar a tela. A atualização do código sem a migração exibe mensagem de indisponibilidade, sem tentar gravar no legado.
3. Executar `npm run lint` e `npm run build` no repositório em CI/ambiente; os comandos ainda não foram executados nesta entrega.
4. Acessar `/torre/comercio-v2/produtos` com perfil admin, criar `TESTE-FLUXO-001`, editar nome/descrições e observar listagem.
5. Conferir com SELECT no banco que `products`, `orders` e `payments` não receberam registros da V2.
6. Confirmar que usuário não admin não acessa a tela e anon/authenticated não consultam `commerce_v2_products` diretamente.
7. Registrar evidências e aprovar F1A no plano mestre.

## Teste SQL somente leitura (após migração)
```sql
select table_name from information_schema.tables
where table_schema='public' and table_name='commerce_v2_products';

select code, name, status, created_at from public.commerce_v2_products
order by created_at desc limit 10;

select grantee, privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name='commerce_v2_products';
```

## Reversão
- Reverter o PR/ocultar o link da Torre; a rota não será mais publicada com o código revertido.
- Se houver cadastro piloto, exportá-lo para o histórico de validação antes de decidir excluir a tabela. **Não executar DROP automaticamente**.
- Não há necessidade de reverter qualquer migração legada.

## Decisões seguintes
- F1B: conferir tabelas reais e política de desenvolvimento/teste, upload seguro de imagens e registros de auditoria detalhados.
- F2: ofertas versionadas e preços (sem substituir valores do checkout legado).
- F3: páginas dinâmicas com preview e publicação.
- F4: checkout V2 com idempotência e integração financeira testada em ambiente autorizado.
- F5/F6: entrega, conciliação e homologação ponta a ponta.

**Pendências:** esquema vivo do Supabase, execução da migration, CI/build/lint, testes funcionais e regressivos.
