# Fiscal na Prática — primeira coleção editorial
**Estado:** RASCUNHO — não publicar sem revisão técnica.
**Revisão de fontes:** 24/10/2026.
**Orientação de publicação:** copiar cada título, resumo, categoria, corpo e links oficiais para o CMS da Torre após revisão, mantendo status rascunho até aprovar.

---

## 1. Radar Fiscal — semana de 26 a 30/10/2026
**Slug:** radar-fiscal-semana-2026-10-26
**Categoria:** Atualizações fiscais
**Resumo:** Três referências oficiais para organizar a rotina de faturamento na última semana de outubro, com foco na transição IBS/CBS.
**Corpo:**

O Radar Fiscal desta semana reúne pontos de acompanhamento, sem afirmar que houve nova alteração normativa nesta data.

**1. Cronograma dos documentos fiscais.** A Receita Federal mantém uma página de orientações com marcos distintos para publicação de leiautes e início de obrigatoriedade. Para cada documento emitido pela empresa, confirme o regime tributário aplicável, o tipo de documento e a data prevista. Não interprete a simples publicação do leiaute como início automático da exigência.

**2. Regras de validação do IBS/CBS.** A comunicação oficial de agosto de 2026 informou flexibilização de validações para evitar rejeições pela ausência de determinados campos. Isso não deve ser tratado como autorização genérica para ignorar os requisitos futuros: acompanhe as notas técnicas e orientações atualizadas do documento.

**3. Tabelas de classificação.** As tabelas oficiais de CST e cClassTrib são mantidas no Portal da NF-e. Antes de parametrizar uma operação, confira versão da tabela, vigência e correspondência com o tratamento tributário validado pela área fiscal.

**Ação prática da semana:** registre numa planilha: documento fiscal, operação, ERP, responsável, versão do leiaute utilizada, campos revisados e pendências para contabilidade/fornecedor.

**Fontes:**
https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-da-reforma-tributaria
https://www.gov.br/fazenda/pt-br/assuntos/noticias/2026/agosto/receita-federal-e-cgibs-flexibilizarao-obrigatoriedade-de-informacoes-em-documentos-fiscais
https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4=

---

## 2. IBS/CBS no faturamento: mapa de preparação
**Slug:** ibs-cbs-mapa-preparacao-faturamento
**Categoria:** IBS e CBS
**Resumo:** Um roteiro para identificar operações, alinhar a classificação tributária e conferir impactos no faturamento e no ERP.
**Corpo:**

A Reforma Tributária do Consumo foi estruturada pela EC 132/2023, pela LC 214/2025 e por normas posteriores de regulamentação. A execução segura no faturamento começa por conhecer as operações reais da empresa, não por reproduzir um código de imposto em todos os produtos.

**Passo 1 — Inventário:** relacione vendas, devoluções, remessas, transferências, prestações de serviços, exportações e demais operações realizadas. Distinga operações habituais das excepcionais.

**Passo 2 — Classificação:** identifique o tratamento de IBS/CBS para cada operação e peça validação expressa à contabilidade. Registre a versão da tabela de CST/cClassTrib usada.

**Passo 3 — ERP:** confira se a parametrização cobre itens, impostos, bases, documentos e ambientes de emissão. Teste exceções, devoluções e notas complementares quando aplicáveis.

**Passo 4 — XML:** compare os campos informados por item, totais e regras de validação do leiaute vigente. Concilie XML autorizado, DANFE e relatórios internos sem pressupor que a autorização valida o tratamento tributário material.

**Passo 5 — Governança:** mantenha evidências de homologação, responsáveis e data de revisão.

**Ação prática:** selecione cinco operações frequentes e documente a classificação revisada, os XMLs de teste e pendências.

**Fontes:**
https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214compilado.htm
https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/legislacao/principais-marcos-regulatorios
https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4=

---

## 3. Checklist de conferência da NF-e com IBS/CBS
**Slug:** checklist-xml-nfe-ibs-cbs
**Categoria:** NF-e e XML
**Resumo:** Conferência operacional dos dados de IBS/CBS antes de validar um XML de NF-e.
**Corpo:**

Este checklist é um instrumento de revisão; a obrigatoriedade de cada grupo deve ser conferida conforme a nota técnica e as regras vigentes para o emitente e a operação.

[ ] Confirmar o leiaute aplicável, sua versão e eventuais notas técnicas.
[ ] Conferir CNPJ, regime tributário, destinatário, CFOP e finalidade da NF-e.
[ ] Conferir itens, NCM, quantidades, valores, descontos e frete conforme a operação.
[ ] Conferir se CST e cClassTrib de IBS/CBS correspondem ao tratamento validado pela contabilidade.
[ ] Quando aplicável, revisar bases, alíquotas, valores e totalizações por item e documento.
[ ] Revisar operações especiais: devolução, bonificação, remessa, transferência ou outras efetivamente realizadas.
[ ] Verificar rejeições do ambiente autorizador e distinguir erro de leiaute de divergência tributária.
[ ] Arquivar XML, protocolo e evidência da parametrização testada.
[ ] Registrar responsável, data e versão das tabelas consultadas.

**Atenção:** o comunicado oficial de 2026 sobre flexibilização de validações não substitui a análise de obrigações de preenchimento nem da legislação material.

**Fontes:**
https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4=
https://www.gov.br/fazenda/pt-br/assuntos/noticias/2026/agosto/receita-federal-e-cgibs-flexibilizarao-obrigatoriedade-de-informacoes-em-documentos-fiscais

---

## 4. Parametrização fiscal do ERP: roteiro de homologação
**Slug:** roteiro-homologacao-parametrizacao-erp
**Categoria:** Checklists e guias
**Resumo:** Uma sequência de testes para reduzir inconsistências entre cadastro, emissão da nota e XML.
**Corpo:**

Antes de liberar ajustes fiscais no ambiente de produção, teste o processo ponta a ponta.

**Cadastros:** produtos e serviços, NCM quando cabível, unidades, origem, cliente, fornecedor, operação e regime.

**Regras:** imposto por operação, CFOP, códigos de situação/classificação, exceções por UF, benefícios e devoluções, conforme validação tributária.

**Cenários:** nota comum, devolução, operações interestaduais, remessa e outras situações efetivamente utilizadas. Para cada cenário, registre entrada, cálculo esperado, XML produzido e resultado do autorizador.

**Controle de mudanças:** documente quem aprovou, versão do sistema, data, evidências e plano de retorno em caso de falha.

**Responsabilidades:** fornecedor do ERP garante o funcionamento técnico; a área fiscal/contábil valida o enquadramento e os parâmetros tributários. A autorização da nota isoladamente não comprova correção fiscal.

**Ação prática:** abra uma planilha de homologação com colunas operação, dado de entrada, resultado esperado, resultado real, divergência, responsável e decisão.

**Fontes para validação dos parâmetros fiscais:**
https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214compilado.htm
https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4=

---

## 5. Operação interestadual: pontos de atenção para ICMS e DIFAL
**Slug:** pontos-atencao-icms-difal-operacoes-interestaduais
**Categoria:** ICMS e DIFAL
**Resumo:** Perguntas essenciais para revisar a operação antes de emitir ou escriturar uma nota interestadual.
**Corpo:**

O cálculo do ICMS/DIFAL depende de circunstâncias que não podem ser inferidas apenas pela UF de origem e destino.

**Antes do cálculo, pergunte:**
1. Qual é a natureza da operação e quem é o destinatário?
2. O destinatário é contribuinte do ICMS? A aquisição é para revenda, industrialização, ativo ou uso e consumo?
3. Qual regime tributário e qual legislação estadual se aplicam às partes?
4. Há mercadoria com benefício, redução de base, isenção, substituição tributária ou regra específica?
5. Existem frete, despesas acessórias ou outras parcelas que integram a base conforme o caso?
6. A responsabilidade pelo recolhimento é do remetente ou destinatário?
7. O valor apurado confere com documentos e orientações da contabilidade?

**Ação prática:** formalize a memória de cálculo com legislação estadual vigente, alíquotas, bases, responsáveis e documento utilizado. Não replique a mesma fórmula entre operações diferentes sem verificar requisitos.

**Fontes normativas de partida:**
https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp87.htm
https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp190.htm

---

## 6. Conferência antes da transmissão da NF-e
**Slug:** checklist-antes-transmissao-nfe
**Categoria:** Checklists e guias
**Resumo:** Checklist geral de faturamento para reduzir rejeições, divergências e retrabalho.
**Corpo:**

Antes de transmitir a NF-e, confira:

[ ] Destinatário, endereço, inscrição estadual e situação cadastral conforme a operação.
[ ] Natureza da operação, CFOP e finalidade da emissão.
[ ] Produto, NCM quando aplicável, unidade, quantidade e preços.
[ ] Tributos configurados para o regime, operação, mercadoria ou serviço.
[ ] Base de cálculo, alíquotas, retenções e benefícios, quando cabíveis.
[ ] Regras aplicáveis a destino, frete, seguro, descontos e despesas.
[ ] Documentos referenciados em devoluções e demais casos que os exigirem.
[ ] Campos de IBS/CBS quando aplicáveis segundo leiaute e orientações oficiais vigentes.
[ ] Totais financeiros e fiscais conciliados com o pedido e o ERP.
[ ] XML autorizado e protocolo arquivados após a transmissão.

**Ação prática:** estabeleça amostragem de conferência reforçada em operações novas ou após atualizações do ERP. Registre as divergências encontradas para corrigir a origem do problema.

**Fontes de referência:**
https://www.nfe.fazenda.gov.br/portal/
https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-da-reforma-tributaria

---
**Revisão editorial necessária:** confirmar vigências e notas técnicas na data efetiva de publicação; adicionar assinatura editorial; definir ordem de publicação; evitar promessas de atualização automática sem rotina aprovada.
