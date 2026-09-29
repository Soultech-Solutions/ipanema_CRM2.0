/**
 * Roda o extrator contra os .eml de docs/exemplos/emails sem caixa de email nem Directus.
 * Catálogo: a planilha de docs/exemplos/produtos com mais produtos (ou --catalog). Clientes: docs/exemplos/clientes.json.
 *
 * Uso (na raiz do projeto):
 *   npm run email:test-fixtures              # chama o Claude (precisa de ANTHROPIC_API_KEY no .env)
 *   npm run email:test-fixtures -- --dry     # só parseia emails/anexos e testa a busca no catálogo
 *   npm run email:test-fixtures -- --only vale --verbose   # mostra cada search_products do Claude
 *   npm run email:test-fixtures -- --catalog docs/exemplos/produtos/produtos-exemplo.csv
 */
import type { ClientRepository, ClientSearchInput, ClientSummary, ProductRepository, ProductSearchInput, ProductSummary } from '../src/domain/types'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'
import { buildOpportunity } from '../src/application/build-opportunity'
import { mapProducts } from '../src/application/import-products.use-case'
import { loadConfig } from '../src/config'
import { normalizeCode, stripAccents } from '../src/domain/normalize'
import { clampLimit, rankProducts } from '../src/domain/ranking'
import { QuoteExtractor } from '../src/infrastructure/anthropic.extractor'
import { prepareAttachments } from '../src/infrastructure/attachments'
import { domainKeyword } from '../src/infrastructure/client.repository'
import { parseRawEmail } from '../src/infrastructure/mail/parse-raw'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const EXAMPLES = join(ROOT, 'docs/exemplos')
const args = process.argv.slice(2)
const dry = args.includes('--dry')
const onlyIdx = args.indexOf('--only')
const only = onlyIdx === -1 ? null : args[onlyIdx + 1]?.toLowerCase() ?? null

function loadEnvFile () {
  const envPath = join(ROOT, '.env')
  if (!existsSync(envPath)) {
    return
  }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }
    const eq = trimmed.indexOf('=')
    if (eq === -1) {
      continue
    }
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, '$2')
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

/** Mesma leitura do front (`src/services/produtosParser.ts`): cabeçalho pode não estar na 1ª linha. */
function readSheetRows (path: string): Record<string, unknown>[] {
  let wb: XLSX.WorkBook
  if (extname(path).toLowerCase() === '.csv') {
    const text = readFileSync(path, 'utf8')
    const header = text.split('\n', 1)[0] ?? ''
    const FS = (header.match(/;/g)?.length ?? 0) >= (header.match(/,/g)?.length ?? 0) ? ';' : ','
    wb = XLSX.read(text, { type: 'string', FS, raw: true })
  } else {
    wb = XLSX.read(readFileSync(path), { type: 'buffer' })
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]!]!, { header: 1, defval: '', blankrows: false })
  const headerIdx = Math.max(0, matrix.slice(0, 10).findIndex(r =>
    r.filter(v => typeof v === 'string' && v.trim() && Number.isNaN(Number(v))).length >= 2))
  const columns = (matrix[headerIdx] ?? [])
    .map((h, index) => ({ name: String(h ?? '').trim(), index }))
    .filter(c => c.name)
  return matrix.slice(headerIdx + 1)
    .filter(r => r.some(v => v !== '' && v != null))
    .map(r => Object.fromEntries(columns.map(({ name, index }) => [name, r[index] ?? ''])))
}

/** `--catalog <arquivo>` ou, por padrão, a planilha de docs/exemplos/produtos que rende mais produtos. */
function loadCatalog (): ProductSummary[] {
  const dir = join(EXAMPLES, 'produtos')
  const catalogIdx = args.indexOf('--catalog')
  const candidates = catalogIdx === -1
    ? readdirSync(dir).filter(f => ['.csv', '.xlsx', '.xls'].includes(extname(f).toLowerCase())).map(f => join(dir, f))
    : [resolve(ROOT, args[catalogIdx + 1] ?? '')]
  if (candidates.length === 0) {
    throw new Error(`Nenhum catálogo .csv/.xlsx em ${dir}`)
  }

  const parsed = candidates
    .map(path => ({ path, ...mapProducts(readSheetRows(path)) }))
    .toSorted((a, b) => b.products.length - a.products.length)
  const { path, columns, products, ignorados } = parsed[0]!
  console.log(`Catálogo: ${path.slice(dir.length + 1) || path} — ${products.length} produtos (${ignorados} linhas sem código)`)
  console.log(`  mapeamento: ${JSON.stringify(columns.mapping)}${columns.unmapped.length > 0 ? ` | extras: ${columns.unmapped.join(', ')}` : ''}`)

  return products.map((p, i) => ({
    id: `prod-${i + 1}`,
    codigo: p.codigo,
    codigo_sap: p.codigo_sap,
    descricao: p.descricao,
    marca: p.marca,
    unidade: p.unidade,
    preco: p.preco,
    custo: p.custo,
    estoque: p.estoque,
    atributos: p.atributos,
  }))
}

class MemoryProducts implements ProductRepository {
  constructor (private all: ProductSummary[]) {}
  async search (input: ProductSearchInput) {
    const found = rankProducts(this.all, input, clampLimit(input.limit))
    if (args.includes('--verbose')) {
      console.log(`     search_products ${JSON.stringify(input)} → ${found.map(p => `${p.codigo} [${p.marca}] (${p.score})`).join(', ') || 'nada'}`)
    }
    return found
  }

  async getByIds (ids: string[]) {
    return this.all.filter(p => ids.includes(p.id))
  }
}

class MemoryClients implements ClientRepository {
  constructor (private all: ClientSummary[]) {}
  async find (input: ClientSearchInput) {
    const terms = [input.email_domain ? domainKeyword(input.email_domain) : null, input.nome]
      .filter((t): t is string => typeof t === 'string' && t !== '')
      .map(t => stripAccents(t).toLowerCase())
    return this.all.filter(c => terms.some(t => stripAccents(c.nome).toLowerCase().includes(t)))
  }
}

function loadClients (): ClientSummary[] {
  const path = join(EXAMPLES, 'clientes.json')
  if (!existsSync(path)) {
    return []
  }
  const rows = JSON.parse(readFileSync(path, 'utf8')) as { id: string, codigo?: string, nome: string }[]
  return rows.map(r => ({ id: r.id, codigo: r.codigo ?? null, nome: r.nome, vendedorId: null, vendedorNome: null }))
}

interface Expected {
  is_quote_request: boolean
  itens: { codigo: string | null, quantidade: number }[]
}

function loadExpected (): Record<string, Expected> {
  const path = join(EXAMPLES, 'emails/expected.json')
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}
}

const fmt = (n: number | null) => (n == null ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))

async function main () {
  loadEnvFile()
  const config = loadConfig(process.env)
  const catalog = loadCatalog()
  const byId = new Map(catalog.map(p => [p.id, p]))
  const catalogCodes = new Set(catalog.map(p => normalizeCode(p.codigo)))
  const products = new MemoryProducts(catalog)
  const clients = new MemoryClients(loadClients())
  const expected = loadExpected()

  if (!dry && !config.anthropic.apiKey) {
    throw new Error('ANTHROPIC_API_KEY não definida (.env). Use --dry para testar só o parse.')
  }

  const extractor = dry
    ? null
    : new QuoteExtractor({
        apiKey: config.anthropic.apiKey,
        model: config.anthropic.model,
        maxTokens: config.anthropic.maxTokens,
        maxToolRounds: config.anthropic.maxToolRounds,
        maxAttachments: config.maxAttachments,
        maxAttachmentBytes: config.maxAttachmentBytes,
      }, products, clients)

  const files = readdirSync(join(EXAMPLES, 'emails'))
    .filter(f => f.toLowerCase().endsWith('.eml'))
    .filter(f => !only || f.toLowerCase().includes(only))
    .toSorted()

  let ok = 0
  let fail = 0

  for (const file of files) {
    const mail = await parseRawEmail(readFileSync(join(EXAMPLES, 'emails', file)), file)
    console.log(`\n━━ ${file}`)
    console.log(`   De: ${mail.fromName ?? ''} <${mail.from}> | Assunto: ${mail.subject}`)
    console.log(`   Message-ID: ${mail.messageId} | anexos: ${mail.attachments.map(a => `${a.filename} (${a.contentType})`).join(', ') || 'nenhum'}`)

    if (dry) {
      const prepared = prepareAttachments(mail.attachments, { maxAttachments: config.maxAttachments, maxBytes: config.maxAttachmentBytes })
      const text = [mail.text, ...prepared.texts.map(t => t.text)].join('\n')
      const codes = [...new Set(text.match(/\b[A-Z]{0,4}\s?\d{2}[\w/.-]*(?:\s[A-Z]{1,4}\d?)*\b/g))].slice(0, 8)
      for (const code of codes) {
        const found = await products.search({ codigo: code, query: code, limit: 3 })
        console.log(`   busca "${code}": ${found.map(p => `${p.codigo} (${p.score})`).join(', ') || 'nada'}`)
      }
      continue
    }

    const started = Date.now()
    const result = await extractor!.extract(mail)
    const client = result.extraction.cliente.id ? result.seenClients.get(result.extraction.cliente.id) ?? null : null
    const draft = buildOpportunity({
      extraction: result.extraction,
      products: byId,
      client,
      emailId: null,
      from: mail.from,
      fromName: mail.fromName,
      subject: mail.subject,
      markupPct: config.priceMarkupPct,
    })

    const secs = ((Date.now() - started) / 1000).toFixed(1)
    console.log(`   pedido de orçamento: ${result.extraction.is_quote_request} — ${result.extraction.motivo}`)
    console.log(`   ${result.rounds} rodadas, ${result.tokenInput}+${result.tokenOutput} tokens, ${secs}s`)
    if (result.extraction.is_quote_request) {
      console.log(`   cliente: ${draft.opportunity.cliente_nome} ${client ? `(id ${client.id})` : '(não vinculado)'} | prazo: ${draft.opportunity.prazo_entrega ?? '—'}`)
      for (const item of draft.items) {
        const p = item.produto ? byId.get(item.produto) : null
        console.log(`   • ${item.quantidade}x "${item.texto_original}" → ${p ? `${p.codigo}` : '—'} [${item.status_match} ${item.confianca}] ${fmt(item.subtotal)}${item.alternativas.length > 0 ? ` alt: ${item.alternativas.map(a => a.codigo).join(', ')}` : ''}`)
      }
      console.log(`   valor estimado: ${fmt(draft.opportunity.valor_estimado)}`)
    }

    const exp = expected[file]
    if (!exp) {
      continue
    }
    const problems: string[] = []
    if (exp.is_quote_request !== result.extraction.is_quote_request) {
      problems.push(`classificação esperada ${exp.is_quote_request}`)
    }
    for (const e of exp.itens) {
      const wanted = e.codigo ? normalizeCode(e.codigo) : null
      // Código fora do catálogo carregado: só confere que o item (quantidade) foi extraído
      const inCatalog = wanted != null && catalogCodes.has(wanted)
      const found = draft.items.some(item => {
        if (item.quantidade !== e.quantidade) {
          return false
        }
        if (!inCatalog) {
          return wanted != null || item.produto == null
        }
        const ids = [item.produto, ...item.alternativas.map(a => a.id)]
        return ids.some(id => id != null && normalizeCode(byId.get(id)?.codigo) === wanted)
      })
      if (!found) {
        problems.push(`faltou ${e.quantidade}x ${e.codigo ?? '(não catalogado)'}`)
      }
    }
    if (draft.items.length !== exp.itens.length) {
      problems.push(`${draft.items.length} itens (esperado ${exp.itens.length})`)
    }

    if (problems.length === 0) {
      ok += 1
      console.log('   ✔ confere com expected.json')
    } else {
      fail += 1
      console.log(`   ✘ ${problems.join('; ')}`)
    }
  }

  if (!dry) {
    console.log(`\nResultado: ${ok} ok, ${fail} com divergência, ${files.length - ok - fail} sem expected`)
    if (fail > 0) {
      process.exitCode = 1
    }
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
