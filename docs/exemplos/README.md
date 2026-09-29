# Exemplos para o fluxo Email → Oportunidade

Fixtures usadas por `npm run email:test-fixtures` para calibrar o extrator sem conectar numa caixa de email.

> Os emails e `produtos-exemplo.csv` são **sintéticos**. O catálogo real é `CotadoRealizadoPorProdutoMES_a_MES-JULHO-2026_Sem Revenda.xlsx` (export do ERP, ~33,8 mil produtos). `Base Teste.xlsx` é uma base de clientes, não de produtos.

## `emails/`

- Um arquivo `.eml` por email (no Outlook: *Salvar como* → `.eml`; no Gmail: *Mostrar original* → *Baixar original*).
- Anexos (PDF, XLSX, CSV) vão dentro do próprio `.eml`.
- Anonimize nomes, telefones e CNPJs antes de commitar.
- `expected.json` descreve o resultado esperado por arquivo (`is_quote_request` e os itens com `codigo` e `quantidade`; `codigo: null` = item que não existe no catálogo). O código é comparado normalizado contra o produto escolhido e as alternativas; se o código não existir no catálogo carregado, só a quantidade é conferida.

## `produtos/`

Catálogo usado nos testes. Aceita `.csv` (separador `;` ou `,`) ou `.xlsx`, com o cabeçalho em qualquer uma das 10 primeiras linhas. Por padrão o script usa a planilha que rende mais produtos; `--catalog <arquivo>` escolhe outra.

### Mapeamento de colunas

O import (tela **Produtos** e o script de fixtures) reconhece os cabeçalhos abaixo, sem diferenciar maiúsculas/acentos. Colunas não reconhecidas são guardadas em `produtos.atributos` (JSON) e também ficam visíveis para a IA.

| Campo em `produtos` | Cabeçalhos aceitos |
|---|---|
| `codigo` (obrigatório) | Código, Cod, Cód. Produto, Código Item, Referência, Ref, SKU, Part Number, PN, Cod_Conversao |
| `codigo_erp` (chave do upsert) | idConversao, Id ERP, Código ERP, Id Produto, Id |
| `codigo_sap` | SAP, Código SAP, Material SAP |
| `descricao` | Descrição, Desc, Produto, Nome, Nome Produto, Denominação |
| `marca` | Marca, Fabricante, Brand |
| `unidade` | Unidade, Un, Und, Unid, UM |
| `preco` | Preço, Preço Base, Preço de Venda, Preço Unitário, Preço Tabela, Valor, Valor Unitário, Vlr Unit |
| `custo` | Custo, Preço de Custo, UltimaPrecoCompra, Último Preço Compra |
| `icms` | ICMS, Alíquota ICMS |
| `pis_cofins` | PIS/COFINS, PIS COFINS |
| `estoque` | Estoque, Saldo, Qtd Estoque, Disponível, EstoqueAtual |

Valores monetários e percentuais em formato brasileiro (`R$ 4.280,00`, `18%`, `9,25%`) são convertidos para número; preço/custo 0 viram vazio, e `-` ou `01/01/1900` contam como "sem informação". O código é normalizado em `codigo_normalizado` (maiúsculas, sem espaços, hífens, pontos ou barras) para casar `22320-E1-K`, `22320 E1 K` e `22320E1K`.

O mesmo código pode existir em várias marcas (ex.: `6205` NTN, Timken e FAG), por isso `codigo` não é único: o upsert usa `codigo_erp` quando a planilha traz, senão o código. O código SAP casa pelo valor inteiro ou pela raiz (`019006381` → `019006381-0000-02`).

Os aliases ficam em `directus/extensions/email-oportunidades/src/domain/product-columns.ts`.
