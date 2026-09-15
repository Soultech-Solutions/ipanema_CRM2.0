import type { AnalystAskRequest, AnalystAskResponse } from '@/types/analyst'
import { directus } from '@/api/directus'
import { useCommercialStore } from '@/stores/commercial'
import { formatCurrency } from '@/utils/format'

/**
 * Endpoint custom Directus (futuro):
 * POST {DIRECTUS_URL}/analista-comercial/ask
 *
 * Enquanto VITE_USE_MOCK !== 'false' (ou o endpoint falhar),
 * usa resposta local baseada na base carregada.
 */
const ANALYST_PATH = '/analista-comercial/ask'
const useDirectus = import.meta.env.VITE_USE_MOCK === 'false'

export async function askAnalyst (payload: AnalystAskRequest): Promise<AnalystAskResponse> {
  if (useDirectus) {
    try {
      const { data } = await directus.post<AnalystAskResponse>(ANALYST_PATH, payload)
      return data
    } catch (error_) {
      // Fallback local se o endpoint ainda não existir
      console.warn('[analista] endpoint indisponível, usando fallback local', error_)
    }
  }

  return localAnalystFallback(payload)
}

async function localAnalystFallback (payload: AnalystAskRequest): Promise<AnalystAskResponse> {
  const store = useCommercialStore()
  await store.ensureLoaded()

  // Simula latência de rede / LLM
  await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 500))

  const q = payload.question.toLowerCase()
  const kpis = store.dashboard?.kpis
  const clients = store.clients
  const conversationId = payload.conversationId || `local-${Date.now()}`

  if (!kpis || !clients.length) {
    return {
      conversationId,
      answer: 'Ainda não há base carregada. Importe a planilha de clientes em Base de Dados para eu consultar os indicadores.',
      suggestedActions: [{ label: 'Ir para Base de Dados', route: '/base-dados' }],
    }
  }

  const risco = [...clients].sort((a, b) => b.receitaEmRisco - a.receitaEmRisco).slice(0, 5)
  const potencial = [...clients].sort((a, b) => b.receitaPotencial - a.receitaPotencial).slice(0, 5)
  const queda = [...clients].filter(c => c.status === 'risco' || c.diasSemCompra >= 20)
    .sort((a, b) => b.diasSemCompra - a.diasSemCompra)
    .slice(0, 5)

  if (/risco|perda|churn|perder/.test(q)) {
    const lines = risco.map((c, i) =>
      `${i + 1}. **${c.nome}**${c.regiao ? ` (${c.regiao})` : ''} — risco ${formatCurrency(c.receitaEmRisco, true)}, Health ${c.healthScore}, ${(c.probabilidadePerda * 100).toFixed(0)}% chance de perda.`,
    )
    return {
      conversationId,
      model: 'local-fallback',
      answer: [
        `Com base na carteira atual (CII ${kpis.cii}/100), estes clientes concentram maior **receita em risco**:`,
        '',
        ...lines,
        '',
        `Total em risco na carteira: **${formatCurrency(kpis.receitaEmRisco, true)}**.`,
        '',
        '_Resposta local — quando o endpoint Directus estiver ativo, a análise virá do Claude/GPT com consulta ao banco._',
      ].join('\n'),
      sources: risco.map(c => ({ type: 'cliente' as const, id: c.id, label: c.nome })),
      suggestedActions: risco.slice(0, 2).map(c => ({
        label: `Ver ${c.nome}`,
        route: `/clientes/${c.id}`,
        prioridade: 'alta' as const,
      })),
    }
  }

  if (/potencial|crescimento|oportun|expans/.test(q)) {
    const lines = potencial.map((c, i) =>
      `${i + 1}. **${c.nome}**${c.regiao ? ` (${c.regiao})` : ''} — potencial ${formatCurrency(c.receitaPotencial, true)}, ticket médio ${formatCurrency(c.ticketMedio, true)}.`,
    )
    return {
      conversationId,
      model: 'local-fallback',
      answer: [
        `Oportunidades de expansão pelo gap cotado x realizado (Receita potencial da carteira: **${formatCurrency(kpis.receitaPotencial, true)}**):`,
        '',
        ...lines,
        '',
        '_Resposta local — endpoint Directus + LLM fará o grounding completo na base._',
      ].join('\n'),
      sources: potencial.map(c => ({ type: 'cliente' as const, id: c.id, label: c.nome })),
      suggestedActions: [
        { label: 'Ver recomendações', route: '/recomendacoes' },
        ...potencial.slice(0, 1).map(c => ({ label: `Abrir ${c.nome}`, route: `/clientes/${c.id}` })),
      ],
    }
  }

  if (/faturamento|caindo|queda|diminu|sem compra|parado/.test(q)) {
    const lines = queda.map((c, i) =>
      `${i + 1}. **${c.nome}**${c.regiao ? ` (${c.regiao})` : ''} — ${c.diasSemCompra} dias sem compra, Health ${c.healthScore}, status ${c.status}.`,
    )
    return {
      conversationId,
      model: 'local-fallback',
      answer: [
        'Clientes com sinal de redução de compra / risco de churn:',
        '',
        ...lines,
        '',
        'Sugestão: priorizar visitas e recuperação nesta semana.',
      ].join('\n'),
      sources: queda.map(c => ({ type: 'cliente' as const, id: c.id, label: c.nome })),
      suggestedActions: [
        { label: 'Ver alertas', route: '/alertas' },
        { label: 'Ver recomendações', route: '/recomendacoes' },
      ],
    }
  }

  if (/prioridade|prioriz|hoje|agora|fazer/.test(q)) {
    const top = store.dashboard?.recomendacoes?.slice(0, 3) ?? []
    const lines = top.map((r, i: number) =>
      `${i + 1}. **${r.titulo}** (${r.prioridade})${r.regiao ? ` · ${r.regiao}` : ''} — ${r.clienteNome || 'carteira'}`,
    )
    return {
      conversationId,
      model: 'local-fallback',
      answer: [
        'Priorização sugerida para hoje com base nas recomendações da IA:',
        '',
        ...(lines.length ? lines : ['Nenhuma recomendação pendente no momento.']),
        '',
        `Saúde da carteira: **${kpis.saudeCarteira}** · CII: **${kpis.cii}/100**.`,
      ].join('\n'),
      sources: top.map(r => ({ type: 'recomendacao' as const, id: r.id, label: r.titulo })),
      suggestedActions: [{ label: 'Abrir recomendações', route: '/recomendacoes' }],
    }
  }

  if (/vendedor|performance|quem vende/.test(q)) {
    const porVendedor = new Map<string, { nome: string, total: number, clientes: number }>()
    for (const c of clients) {
      const entry = porVendedor.get(c.vendedorId) ?? { nome: c.vendedorNome, total: 0, clientes: 0 }
      entry.total += c.receitaAnual
      entry.clientes += 1
      porVendedor.set(c.vendedorId, entry)
    }
    const ranking = [...porVendedor.values()].sort((a, b) => b.total - a.total).slice(0, 5)
    const lines = ranking.map((v, i) =>
      `${i + 1}. **${v.nome}** — ${formatCurrency(v.total, true)} em ${v.clientes} clientes.`,
    )
    return {
      conversationId,
      model: 'local-fallback',
      answer: [
        'Ranking de vendedores por receita realizada:',
        '',
        ...lines,
      ].join('\n'),
      suggestedActions: [{ label: 'Ver Base de Dados', route: '/base-dados' }],
    }
  }

  if (/cii|índice|indice|saúde|saude|kpi|painel/.test(q)) {
    return {
      conversationId,
      model: 'local-fallback',
      answer: [
        '**Painel executivo atual:**',
        '',
        `• CII: **${kpis.cii}/100**`,
        `• Saúde da carteira: **${kpis.saudeCarteira}**`,
        `• Receita em risco: **${formatCurrency(kpis.receitaEmRisco, true)}**`,
        `• Receita potencial: **${formatCurrency(kpis.receitaPotencial, true)}**`,
        `• Eficiência comercial: **${kpis.eficienciaComercial}**`,
        `• Crescimento sustentável: **${kpis.crescimentoSustentavel}**`,
        '',
        `Base: **${store.stats?.totalClientes.toLocaleString('pt-BR')}** clientes (**${store.stats?.clientesAtivos}** ativos).`,
      ].join('\n'),
      sources: [{ type: 'kpi', label: 'Dashboard KPIs' }],
      suggestedActions: [{ label: 'Abrir dashboard', route: '/' }],
    }
  }

  return {
    conversationId,
    model: 'local-fallback',
    answer: [
      'Posso ajudar com perguntas como:',
      '',
      '• Quais clientes têm maior risco de perda?',
      '• Onde existe maior potencial de crescimento?',
      '• Quais clientes estão diminuindo o faturamento?',
      '• O que deve ser priorizado hoje?',
      '• Como está o CII / saúde da carteira?',
      '• Quem são os melhores vendedores?',
      '',
      `Sua pergunta: _"${payload.question}"_`,
      '',
      '_Quando o endpoint `/analista-comercial/ask` estiver no Directus, a resposta virá do Claude/GPT com busca no banco._',
    ].join('\n'),
    suggestedActions: [
      { label: 'Clientes em risco', route: '/clientes' },
      { label: 'Recomendações', route: '/recomendacoes' },
    ],
  }
}