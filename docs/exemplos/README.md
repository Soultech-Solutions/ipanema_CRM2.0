# Exemplos para o fluxo Email → Oportunidade

Fixtures usadas por `npm run email:test-fixtures` para calibrar o extrator sem conectar numa caixa de email.

> Os arquivos atuais são **sintéticos**. Troque/adicione pelos emails reais do cliente (anonimizados) e pela planilha de produtos oficial assim que disponíveis.

## `emails/`

- Um arquivo `.eml` por email (no Outlook: *Salvar como* → `.eml`; no Gmail: *Mostrar original* → *Baixar original*).
- Anexos (PDF, XLSX, CSV) vão dentro do próprio `.eml`.
- Anonimize nomes, telefones e CNPJs antes de commitar.
- `expected.json` descreve o resultado esperado por arquivo (`is_quote_request` e os itens com `codigo` do catálogo e `quantidade`; `codigo: null` = item que não existe no catálogo). O script compara e mostra acertos/erros.

## `produtos/`

Catálogo usado nos testes. Aceita `.csv` (separador `;` ou `,`) ou `.xlsx`. O primeiro arquivo encontrado é carregado.

### Mapeamento de colunas

O import (tela **Produtos** e o script de fixtures) reconhece os cabeçalhos abaixo, sem diferenciar maiúsculas/acentos. Colunas não reconhecidas são guardadas em `produtos.atributos` (JSON) e também ficam visíveis para a IA.

| Campo em `produtos` | Cabeçalhos aceitos |
|---|---|
| `codigo` (obrigatório) | Código, Cod, Cód. Produto, Código Item, Referência, Ref, SKU, Part Number, PN |
| `descricao` | Descrição, Desc, Produto, Nome, Nome Produto, Denominação |
| `marca` | Marca, Fabricante, Brand |
| `unidade` | Unidade, Un, Und, Unid, UM |
| `preco` | Preço, Preço Base, Preço de Venda, Preço Unitário, Preço Tabela, Valor, Valor Unitário, Vlr Unit |
| `icms` | ICMS, Alíquota ICMS |
| `pis_cofins` | PIS/COFINS, PIS COFINS |
| `estoque` | Estoque, Saldo, Qtd Estoque, Disponível |

Valores monetários e percentuais em formato brasileiro (`R$ 4.280,00`, `18%`, `9,25%`) são convertidos para número. O código é normalizado em `codigo_normalizado` (maiúsculas, sem espaços, hífens, pontos ou barras) para casar `22320-E1-K`, `22320 E1 K` e `22320E1K`.

Os aliases ficam em `directus/extensions/email-oportunidades/src/domain/product-columns.ts`.
