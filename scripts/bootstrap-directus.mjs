/**
 * Bootstraps Directus collections used by the Vue frontend API client.
 * Idempotent: skips collections that already exist.
 *
 * Usage:
 *   npm run directus:bootstrap
 *   DIRECTUS_URL=http://localhost:8055 ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run directus:bootstrap
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile () {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

loadEnvFile()

const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.VITE_DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '')
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

async function request (path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!res.ok) {
    const message = data?.errors?.[0]?.message || data?.message || text || res.statusText
    const error = new Error(`${method} ${path} → ${res.status}: ${message}`)
    error.status = res.status
    error.payload = data
    throw error
  }

  return data
}

async function login () {
  const { data } = await request('/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  return data.access_token
}

async function waitForDirectus (retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      await request('/server/ping')
      return
    } catch {
      await new Promise(r => setTimeout(r, 2000))
    }
  }
  throw new Error(`Directus not reachable at ${DIRECTUS_URL}`)
}

async function getCollections (token) {
  const { data } = await request('/collections', { token })
  return new Set(data.map(c => c.collection))
}

async function createCollection (token, collection, meta = {}, fields = []) {
  await request('/collections', {
    method: 'POST',
    token,
    body: {
      collection,
      schema: {},
      meta: {
        accountability: 'all',
        ...meta,
      },
      fields: [
        {
          field: 'id',
          type: 'uuid',
          meta: { hidden: true, readonly: true, interface: 'input', special: ['uuid'] },
          schema: { is_primary_key: true, length: 36, has_auto_increment: false },
        },
        ...fields,
      ],
    },
  })
}

async function createField (token, collection, field) {
  try {
    await request(`/fields/${collection}`, {
      method: 'POST',
      token,
      body: field,
    })
  } catch (error) {
    if (error.status === 400 && /already exists|duplicate/i.test(error.message)) {
      return
    }
    throw error
  }
}

async function createRelation (token, relation) {
  try {
    await request('/relations', {
      method: 'POST',
      token,
      body: relation,
    })
  } catch (error) {
    if (
      error.status === 400
      && /already exists|duplicate|already has an associated relationship/i.test(error.message)
    ) {
      return
    }
    throw error
  }
}

function stringField (field, options = {}) {
  return {
    field,
    type: 'string',
    meta: {
      interface: 'input',
      width: options.width || 'half',
      required: options.required ?? false,
      options: options.options,
      note: options.note,
    },
    schema: {
      is_nullable: !options.required,
      default_value: options.default ?? null,
      max_length: options.maxLength ?? 255,
      is_unique: options.unique ?? false,
    },
  }
}

function textField (field, options = {}) {
  return {
    field,
    type: 'text',
    meta: {
      interface: 'input-multiline',
      width: options.width || 'full',
      required: options.required ?? false,
    },
    schema: { is_nullable: !options.required },
  }
}

function integerField (field, options = {}) {
  return {
    field,
    type: 'integer',
    meta: {
      interface: 'input',
      width: options.width || 'half',
      required: options.required ?? false,
    },
    schema: {
      is_nullable: !options.required,
      default_value: options.default ?? null,
    },
  }
}

function floatField (field, options = {}) {
  return {
    field,
    type: 'float',
    meta: {
      interface: 'input',
      width: options.width || 'half',
      required: options.required ?? false,
    },
    schema: {
      is_nullable: !options.required,
      default_value: options.default ?? null,
    },
  }
}

function booleanField (field, options = {}) {
  return {
    field,
    type: 'boolean',
    meta: {
      interface: 'boolean',
      width: options.width || 'half',
      required: options.required ?? false,
    },
    schema: {
      is_nullable: !options.required,
      default_value: options.default ?? false,
    },
  }
}

function timestampField (field, options = {}) {
  return {
    field,
    type: 'timestamp',
    meta: {
      interface: 'datetime',
      width: options.width || 'half',
      required: options.required ?? false,
      special: options.special,
    },
    schema: {
      is_nullable: !options.required,
      default_value: options.default ?? null,
    },
  }
}

function selectField (field, choices, options = {}) {
  return {
    field,
    type: 'string',
    meta: {
      interface: 'select-dropdown',
      width: options.width || 'half',
      required: options.required ?? false,
      options: {
        choices: choices.map(c => (typeof c === 'string' ? { text: c, value: c } : c)),
      },
    },
    schema: {
      is_nullable: !options.required,
      default_value: options.default ?? null,
      max_length: 64,
    },
  }
}

function m2oField (field, options = {}) {
  return {
    field,
    type: 'uuid',
    meta: {
      interface: 'select-dropdown-m2o',
      special: ['m2o'],
      width: options.width || 'half',
      required: options.required ?? false,
      options: options.options,
    },
    schema: { is_nullable: !options.required },
  }
}

async function ensurePublicRead (token, collections) {
  const { data: policies } = await request('/policies?limit=-1', { token })
  const publicPolicy = policies.find(p =>
    p.name === 'Public'
    || p.name === '$t:public_label'
    || p.icon === 'public',
  )

  if (!publicPolicy) {
    console.warn('Public policy not found — skip public permissions')
    return
  }

  const { data: existing } = await request(`/permissions?filter[policy][_eq]=${publicPolicy.id}&limit=-1`, { token })
  const existingKeys = new Set(existing.map(p => `${p.collection}:${p.action}`))

  for (const collection of collections) {
    const key = `${collection}:read`
    if (existingKeys.has(key)) continue

    await request('/permissions', {
      method: 'POST',
      token,
      body: {
        collection,
        action: 'read',
        policy: publicPolicy.id,
        fields: ['*'],
        permissions: {},
        validation: {},
      },
    })
  }
}

async function bootstrap () {
  console.log(`Waiting for Directus at ${DIRECTUS_URL}...`)
  await waitForDirectus()

  console.log(`Logging in as ${ADMIN_EMAIL}...`)
  const token = await login()
  const existing = await getCollections(token)

  const definitions = [
    {
      collection: 'vendedores',
      meta: { icon: 'badge', note: 'Equipe comercial' },
      fields: [
        stringField('nome', { required: true }),
        stringField('email', { required: true }),
        integerField('clientesAtivos', { default: 0 }),
        floatField('faturamentoMes', { default: 0 }),
        floatField('metaMes', { default: 0 }),
        integerField('eficiencia', { default: 0 }),
        integerField('visitas', { default: 0 }),
        integerField('propostas', { default: 0 }),
        floatField('conversao', { default: 0 }),
      ],
    },
    {
      collection: 'clientes',
      meta: { icon: 'groups', note: 'Carteira de clientes' },
      fields: [
        stringField('codigo', {
          required: true,
          unique: true,
          note: 'ID de negócio: cli-cliente-83347',
        }),
        stringField('nome', { required: true }),
        stringField('documento'),
        stringField('segmento'),
        stringField('grupoCliente'),
        m2oField('vendedorId'),
        stringField('vendedorNome'),
        integerField('healthScore', { default: 0 }),
        floatField('receitaAnual', { default: 0 }),
        floatField('probabilidadePerda', { default: 0 }),
        floatField('receitaEmRisco', { default: 0 }),
        floatField('receitaPotencial', { default: 0 }),
        floatField('ticketMedio', { default: 0 }),
        integerField('frequenciaEmbarques', { default: 0 }),
        floatField('yieldMedio', { default: 0 }),
        integerField('devolucoes', { default: 0 }),
        integerField('reentregas', { default: 0 }),
        integerField('ctesAbertos', { default: 0 }),
        integerField('diasSemEmbarque', { default: 0 }),
        selectField('status', ['ativo', 'risco', 'inativo'], { default: 'ativo', required: true }),
        integerField('destinatarios', { default: 0 }),
        integerField('embarquesMes', { default: 0 }),
        {
          field: 'produtos',
          type: 'json',
          meta: { interface: 'tags', special: ['cast-json'], width: 'full' },
          schema: { is_nullable: true },
        },
        {
          field: 'rotas',
          type: 'json',
          meta: { interface: 'tags', special: ['cast-json'], width: 'full' },
          schema: { is_nullable: true },
        },
      ],
    },
    {
      collection: 'historico_faturamento',
      meta: { icon: 'show_chart', hidden: true },
      fields: [
        m2oField('clienteId', { required: true }),
        stringField('mes', { required: true }),
        floatField('valor', { required: true, default: 0 }),
        floatField('meta'),
      ],
    },
    {
      collection: 'movimentacoes',
      meta: { icon: 'timeline', hidden: true },
      fields: [
        m2oField('clienteId', { required: true }),
        stringField('data', { required: true }),
        stringField('titulo', { required: true }),
        textField('descricao'),
        selectField('tipo', ['embarque', 'visita', 'proposta', 'alerta', 'negociacao'], { required: true }),
      ],
    },
    {
      collection: 'insights',
      meta: { icon: 'lightbulb' },
      fields: [
        stringField('titulo', { required: true, width: 'full' }),
        textField('descricao', { required: true }),
        selectField('tipo', ['risco', 'oportunidade', 'explicacao', 'alerta'], { required: true }),
        m2oField('clienteId'),
        timestampField('createdAt', { default: 'CURRENT_TIMESTAMP' }),
      ],
    },
    {
      collection: 'recomendacoes',
      meta: { icon: 'task_alt' },
      fields: [
        stringField('titulo', { required: true, width: 'full' }),
        textField('descricao', { required: true }),
        selectField('prioridade', ['alta', 'media', 'baixa'], { required: true, default: 'media' }),
        selectField('status', ['pendente', 'em_andamento', 'concluida'], { required: true, default: 'pendente' }),
        m2oField('clienteId'),
        stringField('clienteNome'),
        stringField('acao'),
        floatField('impactoEstimado'),
        timestampField('createdAt', { default: 'CURRENT_TIMESTAMP' }),
      ],
    },
    {
      collection: 'alertas',
      meta: { icon: 'notifications_active' },
      fields: [
        stringField('titulo', { required: true, width: 'full' }),
        textField('descricao', { required: true }),
        selectField('severidade', ['critical', 'warning', 'info'], { required: true, default: 'info' }),
        m2oField('clienteId'),
        stringField('clienteNome'),
        booleanField('lido', { default: false }),
        timestampField('createdAt', { default: 'CURRENT_TIMESTAMP' }),
      ],
    },
    {
      collection: 'dashboard_kpis',
      meta: { icon: 'analytics', singleton: true, note: 'KPIs executivos do dashboard' },
      fields: [
        floatField('saude_carteira', { default: 0 }),
        floatField('receita_em_risco', { default: 0 }),
        floatField('receita_potencial', { default: 0 }),
        floatField('eficiencia_comercial', { default: 0 }),
        floatField('crescimento_sustentavel', { default: 0 }),
        floatField('cii', { default: 0 }),
      ],
    },
    {
      collection: 'ai_modules',
      meta: { icon: 'smart_toy' },
      fields: [
        stringField('titulo', { required: true }),
        textField('descricao'),
        stringField('icon', { default: 'mdi-robot' }),
        selectField('status', ['ok', 'atencao', 'critico'], { required: true, default: 'ok' }),
      ],
    },
    {
      collection: 'chat_conversations',
      meta: { icon: 'forum', note: 'Conversas do Analista Comercial' },
      fields: [
        stringField('title', { width: 'full' }),
        selectField('status', ['active', 'archived'], { default: 'active', required: true }),
      ],
    },
    {
      collection: 'chat_messages',
      meta: { icon: 'chat', note: 'Mensagens do Analista Comercial', hidden: true },
      fields: [
        m2oField('conversation', { required: true }),
        selectField('role', ['user', 'assistant', 'system'], { required: true }),
        textField('content', { required: true }),
        {
          field: 'sources',
          type: 'json',
          meta: { interface: 'input-code', special: ['cast-json'], width: 'full' },
          schema: { is_nullable: true },
        },
        {
          field: 'suggested_actions',
          type: 'json',
          meta: { interface: 'input-code', special: ['cast-json'], width: 'full' },
          schema: { is_nullable: true },
        },
        stringField('model'),
        integerField('latency_ms'),
        integerField('token_input'),
        integerField('token_output'),
      ],
    },
    {
      collection: 'ctes',
      meta: { icon: 'local_shipping', note: 'Base de CT-es (grain: 1 linha = 1 CT-e)' },
      fields: [
        stringField('chave', {
          required: true,
          unique: true,
          maxLength: 128,
          note: 'filial|serie|codigo',
        }),
        stringField('tipoDocumento'),
        stringField('filial'),
        stringField('serie'),
        stringField('codigo', { required: true }),
        stringField('tipoCte'),
        stringField('dtCadastro'),
        stringField('filFatura'),
        stringField('numFatura'),
        stringField('dtVencimento'),
        stringField('codUnn'),
        stringField('codCus'),
        stringField('clienteCodigo', { required: true }),
        stringField('grupoCliente'),
        stringField('codItinerario'),
        floatField('valor', { default: 0 }),
        floatField('impostos', { default: 0 }),
        stringField('munOrigem'),
        stringField('ufOrigem', { maxLength: 2 }),
        stringField('munDestino'),
        stringField('ufDestino', { maxLength: 2 }),
        stringField('codRegiao'),
        stringField('regiao'),
        stringField('unidadeNegocio'),
        stringField('centroCusto'),
        stringField('centroGasto'),
        stringField('classificacao'),
        stringField('tipoTabela'),
        stringField('tabelaFrete'),
        stringField('remetente'),
        stringField('destinatario'),
        floatField('pesoKg', { default: 0 }),
        floatField('pesoCalc'),
        floatField('valorPedagio'),
        floatField('valorMercadoria', { default: 0 }),
        stringField('dtEntrega'),
        floatField('fretePeso'),
        textField('observacoes'),
      ],
    },
    {
      collection: 'importacoes',
      meta: { icon: 'cloud_upload', note: 'Log de uploads LOG FALA' },
      fields: [
        stringField('source_name', { required: true, width: 'full' }),
        timestampField('imported_at', { required: true }),
        integerField('total_ctes', { default: 0 }),
        integerField('total_clientes', { default: 0 }),
        floatField('total_valor', { default: 0 }),
        selectField('status', ['ok', 'erro'], { required: true, default: 'ok' }),
        textField('error_message'),
      ],
    },
  ]

  for (const def of definitions) {
    if (existing.has(def.collection)) {
      console.log(`• skip ${def.collection} (exists)`)
      continue
    }
    console.log(`• create ${def.collection}`)
    await createCollection(token, def.collection, def.meta, def.fields)
  }

  // Fields added after initial bootstrap (idempotent)
  console.log('• ensure clientes.codigo / ctes.chave')
  await createField(token, 'clientes', stringField('codigo', {
    required: true,
    unique: true,
    note: 'ID de negócio: cli-cliente-83347',
  }))
  await createField(token, 'ctes', stringField('chave', {
    required: true,
    unique: true,
    maxLength: 128,
    note: 'filial|serie|codigo',
  }))

  // Alias O2M fields on clientes expected by the API client
  console.log('• ensure relation fields on clientes')
  await createField(token, 'clientes', {
    field: 'historico_faturamento',
    type: 'alias',
    meta: {
      interface: 'list-o2m',
      special: ['o2m'],
      options: { template: '{{mes}}: {{valor}}' },
    },
  })
  await createField(token, 'clientes', {
    field: 'movimentacoes',
    type: 'alias',
    meta: {
      interface: 'list-o2m',
      special: ['o2m'],
      options: { template: '{{titulo}}' },
    },
  })
  await createField(token, 'clientes', {
    field: 'insights',
    type: 'alias',
    meta: {
      interface: 'list-o2m',
      special: ['o2m'],
    },
  })
  await createField(token, 'clientes', {
    field: 'recomendacoes',
    type: 'alias',
    meta: {
      interface: 'list-o2m',
      special: ['o2m'],
    },
  })

  console.log('• ensure relations')
  await createRelation(token, {
    collection: 'clientes',
    field: 'vendedorId',
    related_collection: 'vendedores',
    meta: { sort_field: null },
    schema: { on_delete: 'SET NULL' },
  })
  await createRelation(token, {
    collection: 'historico_faturamento',
    field: 'clienteId',
    related_collection: 'clientes',
    meta: { one_field: 'historico_faturamento', sort_field: null },
    schema: { on_delete: 'CASCADE' },
  })
  await createRelation(token, {
    collection: 'movimentacoes',
    field: 'clienteId',
    related_collection: 'clientes',
    meta: { one_field: 'movimentacoes', sort_field: null },
    schema: { on_delete: 'CASCADE' },
  })
  await createRelation(token, {
    collection: 'insights',
    field: 'clienteId',
    related_collection: 'clientes',
    meta: { one_field: 'insights', sort_field: null },
    schema: { on_delete: 'SET NULL' },
  })
  await createRelation(token, {
    collection: 'recomendacoes',
    field: 'clienteId',
    related_collection: 'clientes',
    meta: { one_field: 'recomendacoes', sort_field: null },
    schema: { on_delete: 'SET NULL' },
  })
  await createRelation(token, {
    collection: 'alertas',
    field: 'clienteId',
    related_collection: 'clientes',
    meta: { sort_field: null },
    schema: { on_delete: 'SET NULL' },
  })
  await createRelation(token, {
    collection: 'chat_messages',
    field: 'conversation',
    related_collection: 'chat_conversations',
    meta: { one_field: 'messages', sort_field: null },
    schema: { on_delete: 'CASCADE' },
  })

  // Chat is private — do not expose to Public role
  const publicCollections = definitions
    .map(d => d.collection)
    .filter(c => !c.startsWith('chat_'))
  console.log('• grant Public read on collections')
  await ensurePublicRead(token, publicCollections)

  // O2M alias for conversation → messages
  console.log('• ensure chat relation fields')
  await createField(token, 'chat_conversations', {
    field: 'messages',
    type: 'alias',
    meta: {
      interface: 'list-o2m',
      special: ['o2m'],
      options: { template: '{{role}}: {{content}}' },
    },
  })

  console.log('\nBootstrap complete.')
  console.log(`Admin UI: ${DIRECTUS_URL}`)
  console.log(`Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
}

bootstrap().catch(error => {
  console.error('\nBootstrap failed:', error.message)
  process.exit(1)
})
