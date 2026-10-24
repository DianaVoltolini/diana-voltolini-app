-- Fiscal na Prática: importar somente como rascunho exclusivo.
-- Não altera artigos existentes nem publica automaticamente.
INSERT INTO public.fiscal_articles
(slug,title,summary,body,category,visibility,status,source_links)
VALUES
('radar-fiscal-semana-2026-10-26',
'Radar Fiscal — semana de 26 a 30/10/2026',
'Três referências oficiais para organizar a rotina de faturamento na última semana de outubro, com foco na transição IBS/CBS.',
'O Radar Fiscal desta semana reúne pontos de acompanhamento, sem afirmar que houve nova alteração normativa nesta data.

**1. Cronograma dos documentos fiscais.** A Receita Federal mantém uma página de orientações com marcos distintos para publicação de leiautes e início de obrigatoriedade. Para cada documento emitido pela empresa, confirme o regime tributário aplicável, o tipo de documento e a data prevista. Não interprete a simples publicação do leiaute como início automático da exigência.

**2. Regras de validação do IBS/CBS.** A comunicação oficial de agosto de 2026 informou flexibilização de validações para evitar rejeições pela ausência de determinados campos. Isso não deve ser tratado como autorização genérica para ignorar os requisitos futuros: acompanhe as notas técnicas e orientações atualizadas do documento.

**3. Tabelas de classificação.** As tabelas oficiais de CST e cClassTrib são mantidas no Portal da NF-e. Antes de parametrizar uma operação, confira versão da tabela, vigência e correspondência com o tratamento tributário validado pela área fiscal.

**Ação prática da semana:** registre numa planilha: documento fiscal, operação, ERP, responsável, versão do leiaute utilizada, campos revisados e pendências para contabilidade/fornecedor.',
'Atualizações fiscais',
'subscriber',
'draft',
'https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-da-reforma-tributaria
https://www.gov.br/fazenda/pt-br/assuntos/noticias/2026/agosto/receita-federal-e-cgibs-flexibilizarao-obrigatoriedade-de-informacoes-em-documentos-fiscais
https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4='),
('checklist-xml-nfe-ibs-cbs',
'Checklist de conferência da NF-e com IBS/CBS',
'Conferência operacional dos dados de IBS/CBS antes de validar um XML de NF-e.',
'Este checklist é um instrumento de revisão; a obrigatoriedade de cada grupo deve ser conferida conforme a nota técnica e as regras vigentes para o emitente e a operação.

[ ] Confirmar o leiaute aplicável, sua versão e eventuais notas técnicas.
[ ] Conferir CNPJ, regime tributário, destinatário, CFOP e finalidade da NF-e.
[ ] Conferir itens, NCM, quantidades, valores, descontos e frete conforme a operação.
[ ] Conferir se CST e cClassTrib de IBS/CBS correspondem ao tratamento validado pela contabilidade.
[ ] Quando aplicável, revisar bases, alíquotas, valores e totalizações por item e documento.
[ ] Revisar operações especiais: devolução, bonificação, remessa, transferência ou outras efetivamente realizadas.
[ ] Verificar rejeições do ambiente autorizador e distinguir erro de leiaute de divergência tributária.
[ ] Arquivar XML, protocolo e evidência da parametrização testada.
[ ] Registrar responsável, data e versão das tabelas consultadas.

**Atenção:** o comunicado oficial de 2026 sobre flexibilização de validações não substitui a análise de obrigações de preenchimento nem da legislação material.',
'NF-e e XML',
'subscriber',
'draft',
'https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4=
https://www.gov.br/fazenda/pt-br/assuntos/noticias/2026/agosto/receita-federal-e-cgibs-flexibilizarao-obrigatoriedade-de-informacoes-em-documentos-fiscais'),
('roteiro-homologacao-parametrizacao-erp',
'Parametrização fiscal do ERP: roteiro de homologação',
'Uma sequência de testes para reduzir inconsistências entre cadastro, emissão da nota e XML.',
'Antes de liberar ajustes fiscais no ambiente de produção, teste o processo ponta a ponta.

**Cadastros:** produtos e serviços, NCM quando cabível, unidades, origem, cliente, fornecedor, operação e regime.

**Regras:** imposto por operação, CFOP, códigos de situação/classificação, exceções por UF, benefícios e devoluções, conforme validação tributária.

**Cenários:** nota comum, devolução, operações interestaduais, remessa e outras situações efetivamente utilizadas. Para cada cenário, registre entrada, cálculo esperado, XML produzido e resultado do autorizador.

**Controle de mudanças:** documente quem aprovou, versão do sistema, data, evidências e plano de retorno em caso de falha.

**Responsabilidades:** fornecedor do ERP garante o funcionamento técnico; a área fiscal/contábil valida o enquadramento e os parâmetros tributários. A autorização da nota isoladamente não comprova correção fiscal.

**Ação prática:** abra uma planilha de homologação com colunas operação, dado de entrada, resultado esperado, resultado real, divergência, responsável e decisão.',
'Checklists e guias',
'subscriber',
'draft',
'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214compilado.htm
https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4=')
ON CONFLICT (slug) DO NOTHING;
SELECT slug,title,category,status,visibility,published_at FROM public.fiscal_articles
WHERE slug IN ('radar-fiscal-semana-2026-10-26', 'checklist-xml-nfe-ibs-cbs', 'roteiro-homologacao-parametrizacao-erp') ORDER BY slug;
