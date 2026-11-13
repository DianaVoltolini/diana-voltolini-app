# F3A — Exemplo pré-preenchido do Encontro Online

**Fonte revisada:** `DianaVoltolini/diana-site/app/black-november-ibs-cbs/page.tsx`, página comercial existente (revisada em 13/11/2026).

## Objetivo
Facilitar a homologação do editor de Páginas de Vendas, iniciando `/torre/comercio-v2/paginas/novo` com uma **proposta de rascunho** para o encontro real, sem copiar dados para o banco automaticamente.

## Informações incorporadas
- Nome: Reforma Tributária na Prática: Compras e Faturamento em 2027.
- Encontro online em 21/01/2027, das 19h30 às 21h, Google Meet (Brasília).
- Conteúdos: NF-e, IBS/CBS, CST, cClassTrib, créditos, operações especiais e ERP.
- Materiais: e-book, PDF da apresentação, exercícios, planilha e checklists.
- Prazo informado na página existente: acesso por 90 dias desde confirmação do pagamento.
- E-book liberado com pagamento; demais materiais em janeiro de 2027.
- Título principal, descrição e perguntas com base na página atual.
- Preferência de produto `ENC-RT-2027-001` e oferta Black November **somente quando esses registros V2 existirem**. IDs nunca são hardcoded.
- O valor **não** é gravado no texto: continua vinculado ao cadastro da oferta V2.

## Regras de preservação
- Não há INSERT/UPDATE automático ao visitar o formulário. Para persistir o conteúdo, a administradora deve clicar em **Salvar rascunho**.
- Em edição de página existente, os dados salvos prevalecem e não são substituídos pelo exemplo.
- O link **Começar em branco** permite criar outra página sem o modelo de teste.
- Formulário continua exigindo vinculação de produto e oferta compatíveis, verificados pelo servidor.
- Nenhum checkout, site público, produto legado, pedido ou cobrança é modificado.
- A prévia é administrativa e o CTA não processa pagamento.

## Homologação
1. Abrir `/torre/comercio-v2/paginas/novo` e observar os textos pré-preenchidos.
2. Confirmar que produto e oferta foram sugeridos corretamente; se não existirem, selecionar manualmente.
3. Corrigir a redação se necessário, salvar, voltar à lista e abrir prévia.
4. Verificar preço consultado da oferta, data do encontro e materiais anunciados.
5. Verificar que a página pública atual permanece intocada e que não há pagamentos habilitados.
6. Abrir **Começar em branco** e confirmar formulário vazio.
7. Validar lint, build e responsividade antes do merge.

**Nota:** O preenchimento é apenas uma conveniência de homologação; a etapa F3B de publicação dinâmica continua pendente.
