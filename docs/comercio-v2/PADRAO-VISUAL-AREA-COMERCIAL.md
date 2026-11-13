# Padrão Visual — Área Comercial

**Definição:** Área Comercial é o nome de exibição do módulo em implantação.
**Compatibilidade:** as URLs internas continuam sob `/torre/comercio-v2`; tabelas `commerce_v2_*` não são renomeadas.

## Identidade visual aprovada
- Fundo geral: cinza muito claro `#f4f6f8`, herdado da Torre.
- Títulos e cabeçalhos de tabela: azul-marinho `#102033`.
- Destaques, botões primários e filetes superiores dos cards: dourado `#c9a227`.
- Superfícies: branco, borda `#d6e0e8`, raio de 12 px.
- Descrições: `#536372`, ícones neutros, destaque de ações destrutivas em vermelho.
- Estrutura: eyebrow, título grande, subtítulo, botões de ação à direita, seção em card, filtros e listagem.
- Tabelas: faixa superior azul-marinho, títulos brancos, linha dourada; corpo alternado claro.
- Formulários: campos com bordas suaves e ações primárias douradas.
- Ações: botões quadrados com ícones, tooltip e rótulo acessível; não criar funções inexistentes só para completar uma linha.
- Layout responsivo sem romper fluxo da sidebar.

## Escopo deste PR
- Renomear menu para **ÁREA COMERCIAL · EM IMPLANTAÇÃO** e rótulos visuais das páginas.
- Visão Geral: cards com filete dourado e componentes compartilhados de layout.
- Produtos: lista em tabela com cabeçalho marinho; formulário permanece operacional e aparece em seção de cadastro abaixo.
- Biblioteca: alinhamento de tipografia, seções, formulário, ações por ícones e cores; mantém upload/download/arquivo privado.
- Ofertas: tipografia, botões e cards alinhados; preserva edição e histórico.
- `commercial.module.css` passa a ser o ponto de referência visual para novas telas comerciais.

## Limitações e validações
- Não reescrever outras seções da Torre, como Leads, Blog e Painel do Cliente.
- Não alterar `products`, `orders`, `payments`, `commerce_v2_*`, Storage, Bling ou checkout.
- **Não há SQL a executar.**
- Conferir lint/build no CI e inspecionar desktop/mobile antes de merge.
- Validar visualmente menu, tipografia, cores, filetes dourados, tabelas, filtros, botões, campos e responsividade.
- Testar cadastro/edição de produto, cadastro de material, filtros, download, arquivar/restaurar e edição de oferta.
- Prévia de PDF permanece pendente como ocorrência independente; padronização visual não a resolve.
- URLs já divulgadas continuam válidas.

## Uso em próximos PRs
Qualquer nova página da Área Comercial deverá reutilizar os tokens/componentes do CSS compartilhado. Mudanças no padrão exigem revisão e aprovação antes de serem propagadas.
