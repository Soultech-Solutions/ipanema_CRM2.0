export interface RunSummary {
  trigger: 'cron' | 'manual'
  startedAt: string
  finishedAt: string | null
  lidos: number
  processados: number
  ignorados: number
  duplicados: number
  erros: number
  skipped?: 'locked' | 'not_configured'
  error?: string
}

/** Estado em memória compartilhado entre o hook e o endpoint (mesmo bundle). */
export const runState: { lastRun: RunSummary | null, running: boolean } = {
  lastRun: null,
  running: false,
}
