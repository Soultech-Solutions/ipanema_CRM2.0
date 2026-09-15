/// <reference lib="webworker" />
import { analyzeBaseComercial } from '@/services/baseComercialAnalytics'
import { parseBaseComercialWorkbook } from '@/services/baseComercialParser'

export type ImportWorkerRequest =
  | { id: number, type: 'parse-analyze', buffer: ArrayBuffer, sourceName: string }

export type ImportWorkerResponse =
  | { id: number, ok: true, result: ReturnType<typeof analyzeBaseComercial> }
  | { id: number, ok: false, error: string }

self.onmessage = (event: MessageEvent<ImportWorkerRequest>) => {
  const msg = event.data
  try {
    if (msg.type === 'parse-analyze') {
      const rows = parseBaseComercialWorkbook(msg.buffer)
      if (!rows.length) {
        const response: ImportWorkerResponse = {
          id: msg.id,
          ok: false,
          error: 'Nenhum cliente válido encontrado. Verifique o layout da planilha.',
        }
        self.postMessage(response)
        return
      }
      const result = analyzeBaseComercial(rows, msg.sourceName)
      const response: ImportWorkerResponse = { id: msg.id, ok: true, result }
      self.postMessage(response)
      return
    }
  } catch (error_) {
    const response: ImportWorkerResponse = {
      id: msg.id,
      ok: false,
      error: error_ instanceof Error ? error_.message : 'Falha no processamento',
    }
    self.postMessage(response)
  }
}