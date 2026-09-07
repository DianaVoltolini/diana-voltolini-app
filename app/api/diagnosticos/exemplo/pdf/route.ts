// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\api\diagnosticos\exemplo\pdf\route.ts

import {
  readFile,
} from "node:fs/promises";

import {
  join,
} from "node:path";

import {
  generateDiagnosticPdf,
} from "@/lib/pdf/diagnostico-pdf";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

function toArrayBuffer(
  bytes:
    Uint8Array,
) {
  const copy =
    new Uint8Array(
      bytes.byteLength,
    );

  copy.set(
    bytes,
  );

  return copy.buffer;
}

export async function GET() {
  let logoBytes:
    Uint8Array |
    null =
    null;

  try {
    const logoPath =
      join(
        process.cwd(),
        "public",
        "brand",
        "logo-light.png",
      );

    const logoFile =
      await readFile(
        logoPath,
      );

    logoBytes =
      new Uint8Array(
        logoFile,
      );
  } catch (
    logoError
  ) {
    console.warn(
      "Logo não carregado no PDF ilustrativo:",
      logoError,
    );
  }

  try {
    const pdfBytes =
      await generateDiagnosticPdf({
        data: {
          code:
            "EXEMPLO ILUSTRATIVO",

          companyName:
            "Empresa Modelo Ltda. - Dados fictícios",

          cnpj:
            "00000000000000",

          city:
            "Blumenau",

          state:
            "SC",

          taxRegime:
            null,

          erpName:
            "ERP Exemplo",

          completedAt:
            "2026-09-07T12:00:00-03:00",

          classification:
            "partially_prepared",

          generalAssessment:
            `EXEMPLO ILUSTRATIVO - TODOS OS DADOS DESTE DOCUMENTO SÃO FICTÍCIOS.

Foram analisados dois documentos fiscais fictícios representativos do tipo de análise realizada no Diagnóstico Expresso IBS/CBS.

O primeiro documento é uma NFC-e modelo 65 emitida em 22/07/2026 por contribuinte enquadrado no Simples Nacional. O XML não contém os grupos e campos de IBS/CBS. Considerando o regime tributário apresentado no cenário e o cronograma utilizado nesta demonstração, essa ausência não foi classificada como inconsistência do documento analisado.

Entretanto, esse XML também não permite comprovar que o ERP esteja tecnicamente preparado para gerar os campos e grupos de IBS/CBS quando eles forem aplicáveis ao cenário da empresa.

O segundo documento é uma NF-e modelo 55 emitida em 18/06/2026 por contribuinte do Regime Normal e já apresenta estrutura de IBS/CBS, contendo CST 000, cClassTrib 000001, base de cálculo, IBS estadual, IBS municipal, CBS e respectivas totalizações.

A conferência matemática do segundo XML demonstrou coerência entre a base de cálculo de R$ 208,80 e os valores de IBS e CBS informados.

Também foi identificada uma divergência relevante entre a operação informada no questionário fictício, como "Venda de produção própria", e o conteúdo do XML, que registra venda de mercadoria adquirida de terceiros com CFOP 5102.

A amostra demonstra capacidade técnica de geração da estrutura IBS/CBS em uma das operações analisadas.

Entretanto, ainda não existe evidência suficiente para concluir que todas as operações relevantes estejam integralmente parametrizadas e testadas.

Permanecem pendentes a confirmação da natureza efetiva da segunda operação e a validação tributária do CST 000 e do cClassTrib 000001 utilizados.

Por isso, neste exemplo, a empresa é classificada como PARCIALMENTE PREPARADA.`,

          strengths:
            `- Foi identificado documento com estrutura IBS/CBS efetivamente gerada pelo ERP no cenário fictício.

- No XML que contém IBS/CBS foram localizados CST, cClassTrib, grupo de cálculo, base, alíquotas, valores e totalizações.

- A base de cálculo de R$ 208,80 apresentou coerência matemática com os valores utilizados na operação.

- Os cálculos de IBS estadual e CBS conferem com as respectivas alíquotas e valores informados no XML fictício.

- Não foi identificada divergência entre os valores individuais de IBS/CBS e suas totalizações.

- Os documentos utilizados no exemplo demonstram como a análise separa a conformidade atual do XML da comprovação efetiva de preparação para IBS/CBS.`,

          risks:
            `Não foi identificado erro matemático ou estrutural relevante no XML fictício que já contém IBS/CBS.

Os principais pontos de atenção são:

1. A existência de um documento tecnicamente preparado não comprova, isoladamente, que todas as operações da empresa estejam parametrizadas e testadas para IBS/CBS.

2. Permanece pendente a confirmação de que o CST 000 e o cClassTrib 000001 representam efetivamente o tratamento tributário correto para o produto e a operação analisados.

3. Foi identificada divergência entre a operação informada no questionário fictício como "Venda de produção própria" e o XML, que registra venda de mercadoria adquirida de terceiros com CFOP 5102.

Caso o produto seja efetivamente de produção própria, a operação fiscal utilizada no XML deverá ser revista.

Caso seja mercadoria adquirida de terceiros, deverá ser corrigida apenas a informação fornecida no questionário.

4. Outras operações com benefícios, reduções, devoluções, operações interestaduais ou tratamentos diferenciados podem exigir parametrizações distintas que não foram comprovadas pelos documentos incluídos nesta amostra.

O principal risco é considerar a empresa preparada apenas porque o ERP já consegue gerar campos de IBS e CBS em uma operação.`,

          actionPlan:
            `1. Confirmar com o faturamento se o produto do segundo XML é de produção própria ou mercadoria adquirida de terceiros.

2. Se for mercadoria adquirida de terceiros, corrigir o contexto informado no questionário.

3. Se for produção própria, revisar com a contabilidade a operação fiscal e o CFOP utilizados e emitir novo XML para conferência.

4. Confirmar com a contabilidade ou responsável tributário se o CST 000 e o cClassTrib 000001 utilizados no segundo XML representam o tratamento correto da operação.

5. Manter como evidência técnica o XML que já apresenta os grupos e cálculos de IBS/CBS corretamente estruturados.

6. Mapear as demais operações relevantes da empresa que possuam tratamento diferente da venda padrão analisada.

7. Emitir e conferir XMLs de teste das operações prioritárias que ainda não possuam evidência de preparação para IBS/CBS.

8. Verificar nos novos testes, conforme aplicável, CST IBS/CBS, cClassTrib, grupos IBSCBS/gIBSCBS, base de cálculo, alíquotas, valores e totalizações.

9. Caso alguma classificação tributária seja alterada pela contabilidade, revisar a parametrização correspondente no ERP e gerar novo XML para validação.

10. Considerar a preparação integral concluída somente após existir evidência das principais operações utilizadas no faturamento.`,

          finalOpinion:
            `EXEMPLO ILUSTRATIVO - DADOS FICTÍCIOS.

Com base nos dois documentos incluídos neste exemplo, a empresa seria classificada como PARCIALMENTE PREPARADA para a adequação do faturamento ao IBS e à CBS.

No primeiro documento, emitido no cenário fictício por contribuinte do Simples Nacional, não foram identificadas inconsistências decorrentes da ausência dos campos IBS/CBS, considerando o regime tributário e a data utilizados na demonstração.

Entretanto, esse documento também não constitui evidência de que o ERP esteja preparado para gerar os campos de IBS e CBS quando eles forem aplicáveis.

No segundo documento foi identificada estrutura IBS/CBS completa, com CST, cClassTrib, base de cálculo, alíquotas, valores e totalizações.

Os cálculos conferidos apresentaram coerência matemática, constituindo evidência positiva de preparação técnica para a operação representada por esse XML.

Apesar disso, foi identificada divergência entre a operação informada no questionário fictício como "Venda de produção própria" e o XML, que registra venda de mercadoria adquirida de terceiros com CFOP 5102.

Essa informação precisaria ser confirmada antes do encerramento definitivo do item.

Também permaneceria necessária a validação tributária do CST 000 e do cClassTrib 000001 utilizados no segundo documento.

A amostra analisada não permitiria concluir que todas as operações relevantes da empresa estivessem igualmente parametrizadas e testadas.

Por isso, a recomendação seria concluir as validações pendentes e ampliar os testes antes de considerar o faturamento integralmente preparado.`,

          limitation:
            `EXEMPLO ILUSTRATIVO - DADOS FICTÍCIOS. Todos os nomes, documentos, números, produtos, valores, protocolos e informações empresariais apresentados neste arquivo foram criados exclusivamente para demonstrar a estrutura da entrega do Diagnóstico Expresso IBS/CBS. Este documento não representa análise de empresa real. O diagnóstico contratado possui natureza operacional e documental, limitado aos arquivos, operações e informações fornecidos pela empresa. Não substitui parecer jurídico, auditoria fiscal completa, responsabilidade técnica da contabilidade ou responsabilidade do fornecedor do ERP.`,

          operations: [
            {
              fileName:
                "NFCe-exemplo-001.xml",

              operation:
                "Venda de mercadoria",

              result:
                "compliant",

              documentConformity:
                "compliant",

              preparationStatus:
                "not_applicable",

              cfop:
                "5.102 - Venda de mercadoria adquirida ou recebida de terceiros",

              operationIdentification:
                `NFC-e modelo 65, série 9, nº 1.284, emitida em 22/07/2026.

Emitente fictício enquadrado no Simples Nacional (CRT 1), localizado em Blumenau/SC.

Natureza da operação: Saída de Mercadoria.

Operação interna (idDest 1), destinada a consumidor final (indFinal 1), com atendimento presencial (indPres 1).

Item analisado:
Produto: REFEIÇÃO PRONTA MODELO
NCM: 21069090
CFOP: 5102
Quantidade: 8 unidades
Valor do item: R$ 198,40

Destinatário indicado como não contribuinte do ICMS (indIEDest 9).

Documento considerado autorizado no cenário fictício.

Todos os dados desta operação foram criados exclusivamente para demonstração.`,

              evidenceFound:
                `Foram identificados no XML fictício os seguintes elementos:

- Regime tributário do emitente: CRT 1 - Simples Nacional.
- CFOP: 5102.
- NCM: 21069090.
- Tributação do ICMS pelo grupo ICMSSN102.
- CSOSN: 102.
- PIS CST 08.
- COFINS CST 08.
- Valor do produto: R$ 198,40.
- Valor total da NFC-e: R$ 198,40.
- PIS total: R$ 0,00.
- COFINS total: R$ 0,00.
- ICMS total: R$ 0,00.
- Documento considerado autorizado no cenário fictício.

Não foram localizados no XML:

- grupo IBSCBS;
- grupo gIBSCBS;
- CST específico de IBS/CBS;
- cClassTrib;
- base de cálculo de IBS/CBS;
- alíquotas ou valores de IBS e CBS;
- totalização de IBS/CBS.

Considerando o cenário fictício utilizado neste exemplo, a ausência desses grupos não foi classificada, isoladamente, como inconsistência do documento.`,

              calculationReview:
                `Não há cálculo de IBS ou CBS a ser conferido neste XML fictício, pois os respectivos grupos não foram gerados no documento.

Na conferência dos valores disponíveis:

Valor dos produtos: R$ 198,40
Valor total da NFC-e: R$ 198,40
Valor do pagamento: R$ 198,40
ICMS: R$ 0,00
PIS: R$ 0,00
COFINS: R$ 0,00

O valor do produto, o valor total do documento e o valor do pagamento são coincidentes.

Não foi identificada divergência matemática nesses totais.`,

              technicalFinding:
                `Não foi identificada inconsistência relacionada à ausência dos campos de IBS e CBS nesta NFC-e dentro do cenário fictício apresentado.

O XML apresenta estrutura compatível com a tributação utilizada no documento: ICMS pelo Simples Nacional, por meio do grupo ICMSSN102 e CSOSN 102, além dos grupos de PIS e COFINS.

Entretanto, este documento não permite comprovar que o ERP esteja tecnicamente preparado para gerar CST IBS/CBS, cClassTrib, grupos de cálculo e totalizações de IBS/CBS quando essas informações forem aplicáveis ao cenário da empresa.

Portanto, a conformidade do documento atual está demonstrada dentro do escopo deste exemplo, mas a preparação futura do ERP para IBS/CBS não pode ser concluída com base exclusivamente neste XML.`,

              technicalBasis:
                `O emitente fictício foi enquadrado no Simples Nacional (CRT 1) apenas para demonstrar um cenário em que a ausência dos campos IBS/CBS no documento atual não significa automaticamente falha de emissão.

O objetivo desta parte do exemplo é demonstrar a diferença entre duas conclusões distintas:

1. O documento atual pode estar conforme dentro do cenário analisado.

2. Isso não significa que a preparação técnica futura do ERP esteja comprovada.

A preparação somente pode ser considerada comprovada quando existir evidência técnica suficiente do cenário que efetivamente precisa ser testado.`,

              riskImpact:
                `Não foi identificado risco imediato decorrente da ausência de IBS/CBS no documento fictício apresentado.

O ponto de atenção está na preparação futura.

Este XML não comprova que o ERP esteja pronto para gerar corretamente os campos, grupos de cálculo e totalizações de IBS/CBS quando eles forem aplicáveis.

Caso essa preparação não seja testada previamente, poderão ser necessários ajustes posteriores no ERP, cadastros ou regras fiscais, aumentando o risco de retrabalho e dificuldades operacionais no faturamento.`,

              recommendedAction:
                `Não foi identificada necessidade de correção específica nesta NFC-e fictícia quanto à ausência de IBS/CBS.

Como ação preventiva, recomenda-se:

1. Confirmar com o fornecedor do ERP o cronograma de disponibilização das funcionalidades aplicáveis.

2. Identificar quando a operação deverá ser testada com a estrutura IBS/CBS.

3. Assim que a funcionalidade estiver disponível, realizar teste com operação equivalente.

4. Gerar novo XML e conferir, quando aplicáveis, CST IBS/CBS, cClassTrib, grupo IBSCBS/gIBSCBS, base de cálculo, alíquotas, valores e totalizações.

5. Somente após essa evidência considerar comprovada a preparação técnica do ERP para esta operação.`,

              responsibleParty:
                `ERP/TI + Faturamento.

A Contabilidade ou responsável tributário deverá participar quando for necessária a confirmação do CST, cClassTrib ou do tratamento tributário aplicável à operação.`,

              closureEvidence:
                `Para o documento fictício atual, não é necessária correção adicional no escopo demonstrado.

Para considerar comprovada a preparação IBS/CBS desta operação, deverá existir pelo menos uma evidência técnica, preferencialmente:

- novo XML de teste emitido pelo mesmo ERP para operação equivalente, contendo os campos e grupos IBS/CBS aplicáveis ao cenário; e/ou

- confirmação formal do fornecedor do ERP demonstrando que a versão utilizada está preparada para gerar as informações necessárias.

O XML de teste deverá ser novamente conferido antes de considerar o item plenamente preparado.`,

              technicalAnalysis:
                "",

              recommendation:
                "",
            },

            {
              fileName:
                "NFe-exemplo-002.xml",

              operation:
                "Venda de produção própria",

              result:
                "compliant",

              documentConformity:
                "compliant",

              preparationStatus:
                "proven",

              cfop:
                "5.102 - Venda de mercadoria adquirida ou recebida de terceiros",

              operationIdentification:
                `NF-e modelo 55, série 4, nº 87.451, emitida em 18/06/2026.

Emitente fictício enquadrado no CRT 3 - Regime Normal, localizado em Blumenau/SC.

Natureza da operação: Venda de mercadoria adquirida de terceiros.

Operação interna (idDest 1), destinada a contribuinte do ICMS e não destinada a consumidor final.

Item analisado:
Produto: CONECTOR MODELO RJ45 CAT6 - 20 UN
NCM: 85369090
CEST: 1200400
CFOP: 5102
Benefício ICMS informado no cenário fictício: SC820042
Quantidade: 10 unidades
Valor do item: R$ 261,50

Documento considerado autorizado no cenário fictício.

Todos os dados desta operação foram criados exclusivamente para demonstração.`,

              evidenceFound:
                `Foram identificados no XML fictício os seguintes elementos relacionados à tributação e à preparação para IBS/CBS:

- CRT do emitente: 3 - Regime Normal.
- CFOP: 5102.
- NCM: 85369090.
- CEST: 1200400.
- Benefício ICMS utilizado no exemplo: SC820042.
- ICMS CST 20.
- Redução de base de cálculo utilizada no cenário: 29,4120%.
- Base de cálculo do ICMS: R$ 184,60.
- Alíquota ICMS: 17,00%.
- Valor ICMS: R$ 31,40.
- PIS CST 01.
- Base PIS: R$ 230,10.
- Alíquota PIS: 1,65%.
- Valor PIS: R$ 3,80.
- COFINS CST 01.
- Base COFINS: R$ 230,10.
- Alíquota COFINS: 7,60%.
- Valor COFINS: R$ 17,50.

Estrutura IBS/CBS localizada:

- Grupo IBSCBS presente.
- CST IBS/CBS: 000.
- cClassTrib: 000001.
- Grupo gIBSCBS presente.
- Base de cálculo IBS/CBS: R$ 208,80.
- Alíquota IBS estadual: 0,1000%.
- Valor IBS estadual: R$ 0,21.
- Alíquota IBS municipal: 0,0000%.
- Valor IBS municipal: R$ 0,00.
- Valor total IBS: R$ 0,21.
- Alíquota CBS: 0,9000%.
- Valor CBS: R$ 1,88.

A totalização IBSCBSTot também está presente no cenário fictício, com:

- Base total IBS/CBS: R$ 208,80.
- IBS estadual: R$ 0,21.
- IBS municipal: R$ 0,00.
- IBS total: R$ 0,21.
- CBS total: R$ 1,88.`,

              calculationReview:
                `Foi realizada a conferência matemática dos valores de IBS e CBS informados no XML fictício.

Valor da operação: R$ 261,50
ICMS: R$ 31,40
PIS: R$ 3,80
COFINS: R$ 17,50

Cálculo da base IBS/CBS:

R$ 261,50
- R$ 31,40 de ICMS
- R$ 3,80 de PIS
- R$ 17,50 de COFINS
= R$ 208,80

O XML fictício informou base de cálculo IBS/CBS de R$ 208,80.

Resultado: base matematicamente coerente.

IBS estadual:

R$ 208,80 x 0,1% = R$ 0,2088

Valor arredondado: R$ 0,21.

O XML informou R$ 0,21.

CBS:

R$ 208,80 x 0,9% = R$ 1,8792

Valor arredondado: R$ 1,88.

O XML informou R$ 1,88.

IBS municipal:

Alíquota informada: 0,0000%.
Valor: R$ 0,00.

As totalizações de IBS e CBS correspondem aos valores calculados no item.

Não foi identificada divergência matemática nos cálculos de IBS/CBS deste documento fictício.`,

              technicalFinding:
                `A NF-e fictícia apresenta estrutura IBS/CBS efetivamente gerada pelo ERP, com CST 000, cClassTrib 000001, grupo de cálculo, base, alíquotas, valores e totalizações.

Os cálculos de IBS e CBS conferem matematicamente com os valores informados no documento.

Foi identificada, entretanto, uma divergência entre o contexto informado no questionário fictício e o conteúdo do XML.

No questionário, a operação foi indicada como "Venda de produção própria".

O XML possui natureza "Venda de mercadoria adquirida de terceiros" e utiliza CFOP 5102.

Dessa forma, a estrutura técnica de IBS/CBS está comprovada para o XML analisado, mas a natureza efetiva da operação precisa ser confirmada antes do encerramento definitivo do item.

Esse tipo de divergência é justamente um exemplo de informação que pode não ser percebida apenas pela constatação de que a nota foi autorizada.`,

              technicalBasis:
                `O XML fictício utiliza CST IBS/CBS 000 e cClassTrib 000001.

A combinação apresentada no exemplo é estruturalmente compatível com o cenário utilizado para demonstrar tributação integral pelo IBS e pela CBS.

O documento também utiliza as alíquotas adotadas neste cenário demonstrativo:

- IBS: 0,1%.
- CBS: 0,9%.

A base de cálculo foi formada excluindo os valores de ICMS, PIS e COFINS utilizados no exemplo, resultando em R$ 208,80.

A validação realizada demonstra a coerência técnica e matemática do XML fictício.

A confirmação de que a classificação tributária é efetivamente adequada ao produto e à operação deverá sempre ser realizada pela contabilidade ou responsável tributário, pois depende do enquadramento da operação e não apenas da estrutura existente no XML.`,

              riskImpact:
                `Não foi identificado risco técnico relevante na geração dos campos IBS/CBS deste XML fictício.

O ponto de atenção está em duas validações:

1. Confirmar se o CST 000 e o cClassTrib 000001 representam o tratamento tributário correto para o produto e a operação.

2. Esclarecer a divergência entre a operação informada no questionário como "Venda de produção própria" e o XML, que registra venda de mercadoria adquirida de terceiros com CFOP 5102.

Se a mercadoria for efetivamente adquirida de terceiros, a informação fornecida no questionário deverá ser corrigida.

Caso se trate efetivamente de produção própria, a operação fiscal utilizada no XML deverá ser revista antes de considerar o cenário validado.

O risco não está apenas em gerar ou não gerar IBS/CBS.

Também é necessário comprovar que o cenário parametrizado corresponde à operação que a empresa realmente realiza.`,

              recommendedAction:
                `1. Confirmar com o faturamento se o produto vendido é de produção própria ou mercadoria adquirida de terceiros.

2. Se for mercadoria adquirida de terceiros, registrar a correção do contexto informado no questionário e manter a análise do XML.

3. Se for produto de produção própria, revisar com a contabilidade a operação fiscal e o CFOP utilizados e gerar novo XML para conferência.

4. Confirmar com a contabilidade ou responsável tributário se o CST 000 e o cClassTrib 000001 são adequados para o produto NCM 85369090 nesta operação.

5. Mantida a classificação tributária utilizada no cenário, não foi identificada necessidade de correção técnica nos cálculos ou na estrutura IBS/CBS do XML.

6. Registrar as confirmações como evidência antes de considerar o item encerrado.`,

              responsibleParty:
                `Faturamento + Contabilidade / Responsável tributário.

ERP/TI somente deverá atuar caso a validação indique necessidade de alteração da parametrização.`,

              closureEvidence:
                `Para o encerramento deste item fictício deverão existir:

1. Confirmação de que a operação corresponde efetivamente à venda de mercadoria adquirida de terceiros ou, caso seja produção própria, novo XML emitido após a correção da operação fiscal.

2. Confirmação da contabilidade ou responsável tributário de que CST 000 e cClassTrib 000001 são adequados ao produto e à operação analisados.

Se for confirmada a venda de mercadoria adquirida de terceiros e o tratamento tributário utilizado, nenhuma nova emissão será necessária.

O objetivo desta evidência é permitir que a empresa saiba exatamente o que falta para considerar o ponto efetivamente encerrado.`,

              technicalAnalysis:
                "",

              recommendation:
                "",
            },
          ],
        },

        logoBytes,
      });

    const pdfBody =
      toArrayBuffer(
        pdfBytes,
      );

    return new Response(
      pdfBody,
      {
        status:
          200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            'inline; filename="exemplo-diagnostico-expresso-ibs-cbs.pdf"',

          "Cache-Control":
            "no-store, max-age=0",

          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
  } catch (
    pdfError
  ) {
    console.error(
      "Erro ao gerar PDF ilustrativo:",
      pdfError,
    );

    return new Response(
      "Não foi possível gerar o exemplo do diagnóstico.",
      {
        status:
          500,
      },
    );
  }
}