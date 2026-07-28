# Raça analise comercial — Regras de Negócio (Backend)

Documento de referência para implementação futura em **Directus** (ou outro backend).  
Reflete as regras já aplicadas no front (`src/services/cteAnalytics.ts`, `src/types/cte.ts`).

**Versão:** 1.0  
**Produto:** Raça analise comercial  
**Fonte primária de dados:** planilha LOG FALA (base de faturamento / CT-es)

---

## 1. Visão do produto

O sistema atua como **Analista Comercial Virtual**. Consolida CT-es da operação, deriva indicadores por cliente e carteira, e gera:

- Health Score
- Receita em risco
- Receita potencial
- Eficiência comercial
- Crescimento sustentável
- **Commercial Intelligence Index (CII)** — KPI mestre (0–100)
- Insights, alertas e recomendações priorizadas

### Princípio de modelagem

| Camada | Grain | Origem |
|--------|-------|--------|
| Transacional | 1 linha = 1 CT-e | Upload Excel / API ERP |
| Analítica (cliente) | 1 registro = 1 CLIENTE pagador | Agregação dos CT-es |
| Executiva | 1 snapshot de KPIs | Agregação da carteira |

**Clientes não são cadastro mestre nesta POC** — são derivados do campo `CLIENTE` da base LOG FALA.

---

## 2. Fonte de dados — Base LOG FALA

### 2.1 Layout esperado

- Formato: `.xlsx` / `.xls` (CSV futuro)
- 1ª aba da planilha
- Cabeçalhos na primeira linha (nomes exatos abaixo)

### 2.2 Mapeamento de colunas

| Coluna Excel | Campo backend | Tipo | Observação |
|--------------|---------------|------|------------|
| TIPO DE DOCUMENTO | `tipo_documento` | string | Ex.: `CTE` |
| FILIAL | `filial` | string | |
| SÉRIE | `serie` | string | |
| CÓDIGO | `codigo` | string | Identificador do CT-e (chave natural com filial/série) |
| TIPO CTE | `tipo_cte` | string | Ver §2.3 |
| DT. CADASTRO | `dt_cadastro` | datetime | Data do documento / embarque |
| FIL. FATURA | `fil_fatura` | string \| null | |
| NÚM. FATURA | `num_fatura` | string \| null | **null/vazio = CT-e em aberto** |
| DT. VCTO. | `dt_vencimento` | datetime \| null | |
| CÓD. UNN | `cod_unn` | string \| null | Na base atual: 100% vazio |
| CÓD. CUS. | `cod_cus` | string \| null | Na base atual: 100% vazio |
| CLIENTE | `cliente_codigo` | string | Pagador (ex.: `CLIENTE 83347`) |
| GRUPO CLIENTE | `grupo_cliente` | string | |
| CÓD. ITINERÁRIO | `cod_itinerario` | string | |
| VALOR | `valor` | decimal | Frete / faturamento do CT-e |
| IMPOSTOS | `impostos` | decimal | |
| MUN. ORIGEM | `mun_origem` | string | |
| UF ORIGEM | `uf_origem` | string | |
| MUN. DESTINO | `mun_destino` | string | |
| UF DESTINO | `uf_destino` | string | |
| CÓD. REGIÃO | `cod_regiao` | string \| null | |
| REGIÃO | `regiao` | string \| null | |
| UNIDADE NEGÓCIO | `unidade_negocio` | string | |
| CENTRO CUSTO | `centro_custo` | string | |
| CENTRO GASTO | `centro_gasto` | string | |
| CLASSIFICAÇÃO | `classificacao` | string | Ver §2.4 |
| TIPO TABELA | `tipo_tabela` | string | |
| TABELA DE FRETE | `tabela_frete` | string | |
| REMETENTE | `remetente` | string | |
| DESTINATÁRIO | `destinatario` | string | |
| PESO KG | `peso_kg` | decimal | Ver §2.5 (unidade) |
| PESO CALC. | `peso_calc` | decimal \| null | |
| VALOR PEDÁGIO | `valor_pedagio` | decimal \| null | |
| VALOR MERCADORIA | `valor_mercadoria` | decimal | |
| DT. ENTREGA | `dt_entrega` | datetime \| null | |
| FRETE PESO | `frete_peso` | decimal \| null | |
| OBSERVAÇÕES | `observacoes` | string \| null | |

### 2.3 Tipos de CT-e (classificação operacional)

| `tipo_cte` | Regra |
|------------|--------|
| `DEVOLUÇÃO PARCIAL`, `DEVOLUÇÃO TOTAL` | Conta como **devolução** |
| `REENTREGA` | Conta como **reentrega** |
| Demais (`NORMAL`, `REDESPACHO*`, `NEGOCIADO`, etc.) | Operação padrão |

### 2.4 Classificações de carga observadas

`FRACIONADO`, `OPERAÇÃO LOCAL`, `CORTESIA`, `CARRETA`, `COMBINADO`, `BITREM`, `TRUCK`, `SEM CLASSIFICAÇÃO`

Usada como **proxy de segmento/produto** do cliente (moda entre os CT-es do cliente).

### 2.5 Yield comercial (R$/ton) — ponto de atenção

```
toneladas = peso_kg / 1_000_000
yield = valor / toneladas   // se toneladas > 0
```

**Premissa atual do front:** valores de `PESO KG` no extrato comportam-se como **gramas** (ex.: `2.333.990` → ~2,33 ton).  
**Backend deve confirmar a unidade real com a Raça** antes de produção. Se for kg verdadeiro, a fórmula passa a `toneladas = peso_kg / 1000`.

### 2.6 CT-e em aberto (giro)

```
cte_aberto ⇔ num_fatura IS NULL OR num_fatura = ''
```

### 2.7 Lacunas da base (fontes complementares necessárias)

A LOG FALA **não contém**:

- Vendedor responsável
- Visitas, reuniões, propostas, follow-up, conversão
- Metas comerciais
- CNPJ / razão social (apenas código anonimizado na POC)
- Reclamações explícitas (além de devolução/reentrega via `TIPO CTE`)

Esses módulos exigem integração CRM/ERP ou planilha complementar.

---

## 3. Pipeline de importação

```
Upload Excel / Sync API
        ↓
Validar cabeçalhos (mapeamento §2.2)
        ↓
Persistir collection `ctes` (upsert por chave natural)
        ↓
Job de agregação (síncrono ou fila)
        ↓
Recalcular: clientes → KPIs → insights → alertas → recomendações
        ↓
Expor via API REST para o front
```

### Regras de import

1. Linhas sem `CLIENTE` ou sem `CÓDIGO` → **descartar** (ou enviar para quarentena).
2. Upsert sugerido: `(filial, serie, codigo)` ou hash desses campos.
3. Após cada import completo (ou batch diário), **recalcular toda a camada analítica**.
4. Registrar metadados: `source_name`, `imported_at`, `total_ctes`, `total_valor`.

---

## 4. Agregação por cliente

### 4.1 Identidade

```
cliente_id = "cli-" + lower(replace(cliente_codigo, " ", "-"))
```

Ex.: `CLIENTE 83347` → `cli-cliente-83347`

### 4.2 Métricas agregadas (por cliente)

Seja \(N\) = quantidade de CT-es do cliente.

| Campo | Fórmula |
|-------|---------|
| `receita_anual` | \(\sum valor\) *(na POC = total do período importado)* |
| `ticket_medio` | `receita_anual / N` |
| `devolucoes` | count onde `tipo_cte` ∈ devolução |
| `reentregas` | count onde `tipo_cte` = `REENTREGA` |
| `ctes_abertos` | count onde CT-e em aberto |
| `devolucao_rate` | `devolucoes / N` |
| `reentrega_rate` | `reentregas / N` |
| `aberto_rate` | `ctes_abertos / N` |
| `yield_medio` | média dos yields válidos dos CT-es |
| `destinatarios` | distinct `destinatario` |
| `segmento` | moda de `classificacao` |
| `grupo_cliente` | último / predominante `grupo_cliente` |
| `dt_primeiro` | min `dt_cadastro` |
| `dt_ultimo` | max `dt_cadastro` |
| `dias_sem_embarque` | dias entre `dt_ultimo` e **data de referência** (hoje / data do job) |
| `span_dias` | max(30, dias entre primeiro e data de referência) |
| `frequencia_embarques` | round(`N / span_dias * 30`) — embarques/mês estimados |

### 4.3 Peer average (benchmark interno)

```
peer_avg = média(ticket_medio de todos os clientes)
```

Usado no cálculo de receita potencial.

---

## 5. Indicadores por cliente

### 5.1 Health Score (0–100)

Base inicial: **92**

| Fator | Efeito |
|-------|--------|
| Dias sem embarque | `− min(40, dias_sem_embarque × 0.9)` |
| Taxa de devolução | `− devolucao_rate × 120` |
| Taxa de reentrega | `− reentrega_rate × 80` |
| Taxa CT-e aberto | `− aberto_rate × 40` |
| Frequência &lt; 5/mês | `− 12` |
| Frequência &gt; 40/mês | `+ 4` |

Resultado: `round(clamp(score, 25, 99))`

> Evolução futura: incorporar ticket, sazonalidade, concentração, reclamações, margem (~50 variáveis do CII).

### 5.2 Probabilidade de perda (churn)

```
p = 0.08
p += min(0.55, dias_sem_embarque / 80)
p += devolucao_rate × 1.2
p += (100 − health_score) / 220
probabilidade_perda = clamp(p, 0.03, 0.92)
```

### 5.3 Receita em risco

```
receita_em_risco = receita_anual × probabilidade_perda
```

### 5.4 Receita potencial

```
receita_potencial = max(0, peer_avg − ticket_medio) × max(3, frequencia_embarques)
```

Interpretação POC: gap de ticket vs média da carteira × intensidade de embarques.

> Evolução futura: peer por `grupo_cliente` / `classificacao` / rota (benchmark segmentado).

### 5.5 Status do cliente

| Status | Condição (OR) |
|--------|----------------|
| `inativo` | `dias_sem_embarque ≥ 45` **OU** `health_score < 55` |
| `risco` | (não inativo) e (`health_score < 78` **OU** `probabilidade_perda ≥ 0.35` **OU** `dias_sem_embarque ≥ 20`) |
| `ativo` | demais casos |

---

## 6. KPIs executivos (dashboard)

Agregados sobre a carteira de clientes + stats globais da importação.

| KPI | Fórmula |
|-----|---------|
| **Saúde da Carteira** | média aritmética dos `health_score` |
| **Receita em Risco** | \(\sum\) `receita_em_risco` |
| **Receita Potencial** | \(\sum\) `receita_potencial` |
| **Eficiência Comercial** | `round(clamp(88 − aberto_rate×100 − devolucao_rate×80, 40, 96))` |
| **Crescimento Sustentável** | `round(clamp(90 − devolucao_rate×150, 45, 97))` |

Onde:

```
aberto_rate = total_ctes_abertos / total_ctes
devolucao_rate = total_devolucoes / total_ctes
```

> **Nota:** na POC, eficiência/crescimento usam apenas sinais da base CT-e. Com CRM, incluir visitas, propostas, conversão e margem.

---

## 7. Commercial Intelligence Index (CII)

Indicador proprietário **0–100**.

### 7.1 Pesos-alvo (produto)

| Componente | Peso |
|------------|------|
| Health Score (carteira) | 25% |
| Receita em risco (invertida) | 20% |
| Receita potencial | 20% |
| Crescimento sustentável | 15% |
| Eficiência comercial | 10% |
| Qualidade operacional | 5% |
| Contexto de mercado | 5% |

### 7.2 Implementação atual (POC)

```
risco_score     = clamp(100 − (receita_em_risco / total_valor) × 100, 0, 100)
potencial_score = clamp((receita_potencial / total_valor) × 80, 0, 100)
qualidade_op    = 100 − devolucao_rate × 400
contexto        = 75   // placeholder até haver dados de mercado

cii = round(
    saude_carteira        × 0.25
  + risco_score           × 0.20
  + potencial_score       × 0.20
  + crescimento_sustentavel × 0.15
  + eficiencia_comercial  × 0.10
  + qualidade_op          × 0.05
  + contexto              × 0.05
)

cii = clamp(cii, 40, 99)
```

### 7.3 Recalcular

- Diariamente (job)
- Após cada import de planilha / sync ERP

---

## 8. Alertas automáticos

| Regra | Severidade | Escopo |
|-------|------------|--------|
| Cliente com `dias_sem_embarque ≥ 30` | `warning`; `critical` se ≥ 45 | Top 8 por ociosidade |
| Cliente com `health_score < 70` | `warning`; `critical` se &lt; 55 | Top 5 piores scores |
| `total_ctes_abertos > 0` | `info` | Global |

Campos sugeridos: `id`, `titulo`, `descricao`, `severidade`, `cliente_id?`, `lido`, `created_at`.

### Extensões futuras

- Queda de faturamento MoM &gt; X%
- Queda de Health Score período a período
- Concentração: top 5 &gt; 40% da receita
- Aumento de devoluções / perda de margem
- CT-es abertos &gt; N dias

---

## 9. Recomendações

| Regra | Ação | Prioridade |
|-------|------|------------|
| Top 4 clientes por `receita_em_risco`; se `dias_sem_embarque ≥ 30` | Recuperar cliente | `alta` se health &lt; 70 ou idle ≥ 30; senão `media` |
| Top 4 (senão idle) | Agendar visita | idem |
| Cliente com menor `yield_medio` &gt; 0 | Renegociar tabela | `media` |

Campos: `titulo`, `descricao`, `prioridade` (`alta`\|`media`\|`baixa`), `status` (`pendente`\|`em_andamento`\|`concluida`), `cliente_id`, `acao`, `impacto_estimado` (= receita em risco ou potencial).

### Catálogo de ações (produto)

Agendar visita · Renegociar tabela · Apresentar novo serviço · Aumentar limite · Recuperar cliente · Revisar preço · Campanha comercial

---

## 10. Insights

Gerados textualmente a partir dos números (na POC, templates; no futuro, LLM + dados).

Tipos: `explicacao` | `risco` | `oportunidade` | `alerta`

Mínimo sugerido por batch:

1. Explicação do CII (volume de CT-es / clientes)
2. Concentração de receita nos top 5 em risco
3. Devoluções + CT-es abertos

Por cliente (detalhe):

1. Health Score + drivers (idle, devoluções, abertos)
2. Receita em risco = receita × probabilidade
3. Potencial vs benchmark

---

## 11. Status dos módulos de IA (painel Motor de IA)

| Módulo | Critério de status |
|--------|-------------------|
| Devoluções & Reentregas | `critico` se devolucao_rate &gt; 6%; `atencao` se &gt; 3%; senão `ok` |
| Giro CT-es abertos | `atencao` se aberto_rate &gt; 5%; senão `ok` |
| Concentração & Risco | `atencao` se top 5 clientes &gt; 40% da receita; senão `ok` |

---

## 12. Modelo Directus sugerido

### Collections

| Collection | Descrição |
|------------|-----------|
| `ctes` | Fato transacional (grain CT-e) |
| `clientes` | Agregado analítico (recalculado) |
| `dashboard_kpis` | Snapshot executivo (1 row atual ou histórico) |
| `insights` | Textos gerados |
| `alertas` | Alertas |
| `recomendacoes` | Ações sugeridas |
| `importacoes` | Log de uploads (arquivo, usuário, totais, status) |
| `vendedores` | *(fonte complementar)* |
| `metas` | *(fonte complementar)* |

### Endpoints consumidos pelo front

| Uso | Método / path (exemplo) |
|-----|-------------------------|
| KPIs + listas do dashboard | `GET /items/dashboard_kpis` + relações ou endpoint custom `/commercial/dashboard` |
| Lista clientes | `GET /items/clientes` |
| Detalhe cliente | `GET /items/clientes/:id` (+ histórico mensal) |
| Upload | `POST /files` + job, ou Flow Directus |
| Recalcular | `POST /commercial/recalculate` (endpoint custom / hook) |

### Endpoint custom recomendado

`POST /commercial/import`  

1. Recebe arquivo ou `file_id`  
2. Parseia LOG FALA  
3. Upsert `ctes`  
4. Roda agregação  
5. Retorna `{ stats, cii, total_clientes }`

`GET /commercial/dashboard` — payload único já usado pelo front (`DashboardData`).

---

## 13. Contratos de dados (JSON)

### Dashboard

```json
{
  "kpis": {
    "saudeCarteira": 0,
    "receitaEmRisco": 0,
    "receitaPotencial": 0,
    "eficienciaComercial": 0,
    "crescimentoSustentavel": 0,
    "cii": 0
  },
  "insights": [],
  "recomendacoes": [],
  "alertas": [],
  "clientesRisco": [],
  "aiModules": []
}
```

### Cliente (lista)

```json
{
  "id": "cli-cliente-83347",
  "nome": "CLIENTE 83347",
  "documento": "Grupo 76",
  "segmento": "FRACIONADO",
  "grupoCliente": "76",
  "healthScore": 84,
  "receitaAnual": 4000000,
  "probabilidadePerda": 0.82,
  "receitaEmRisco": 3280000,
  "receitaPotencial": 1200000,
  "ticketMedio": 18500,
  "frequenciaEmbarques": 12,
  "yieldMedio": 142,
  "devolucoes": 8,
  "reentregas": 5,
  "ctesAbertos": 14,
  "diasSemEmbarque": 4,
  "status": "risco"
}
```

---

## 14. Segurança e operação

- Upload restrito a perfis comercial / admin
- Validar MIME e tamanho máximo (base atual ~14 MB / 65k linhas)
- Processar import **assíncrono** acima de N linhas (fila)
- Idempotência no upsert de CT-es
- Auditoria: quem importou, quando, quantos registros
- Não versionar planilhas com dados reais no git em produção (usar storage S3/Directus Files)

---

## 15. Endpoint Analista Comercial (chat)

Interface front: rota `/analista` (`AnalystChatView`).

Especificação completa de implementação (Directus + Anthropic Claude):  
→ [`docs/ENDPOINT_CHAT.md`](./ENDPOINT_CHAT.md)

### Contrato

`POST /analista-comercial/ask`

```json
{
  "question": "Quais clientes possuem maior risco de perda?",
  "conversationId": "opcional-uuid",
  "context": { "clienteId": "opcional" }
}
```

Resposta:

```json
{
  "answer": "texto markdown leve",
  "conversationId": "uuid",
  "sources": [{ "type": "cliente", "id": "cli-…", "label": "CLIENTE 83347" }],
  "suggestedActions": [{ "label": "Ver cliente", "route": "/clientes/cli-…" }],
  "model": "claude-… | gpt-…",
  "latencyMs": 1200
}
```

### Fluxo esperado no Directus

1. Receber pergunta autenticada  
2. Montar contexto (KPIs, top clientes, alertas) a partir do banco  
3. Chamar Claude/GPT com grounding  
4. Opcional: tool/query SQL ou items Directus  
5. Devolver `answer` + `sources` + ações  

Enquanto o endpoint não existir, o front usa **fallback local** (`src/api/analyst.ts`) sobre a base carregada.

---

## 16. Roadmap de regras (pós-POC)

1. Confirmar unidade de `PESO KG` com Raça  
2. Peer group por segmento/grupo/rota  
3. Séries temporais: Health Score e faturamento MoM  
4. Metas e desvio vs meta  
5. Integração vendedor + CRM (eficiência real)  
6. CII com ~50 variáveis e pesos calibrados  
7. Insights via LLM com grounding nos indicadores  
8. Sync API ERP (substituir upload manual)  
9. Endpoint `/analista-comercial/ask` (Claude/GPT + Directus)

---

## 17. Referência de código (front atual)

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/types/cte.ts` | Schema CT-e, mapa de colunas, yield, aberto |
| `src/services/cteParser.ts` | Parse Excel → CT-es |
| `src/services/cteAnalytics.ts` | Agregação, KPIs, alertas, recomendações |
| `src/stores/commercial.ts` | Estado local / seed / import |
| `src/api/directus.ts` | Switch local vs Directus |
| `src/api/analyst.ts` | Chat → endpoint / fallback local |
| `src/views/AnalystChatView.vue` | UI de interação |

---

*Documento alinhado à implementação do front em julho/2026. Qualquer mudança de fórmula no backend deve atualizar este arquivo e o módulo `cteAnalytics` até a migração completa.*
