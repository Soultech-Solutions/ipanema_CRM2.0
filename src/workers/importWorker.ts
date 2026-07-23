/// <reference lib="webworker" />
import { analyzeCtes } from '@/services/cteAnalytics'
import { parseCteWorkbook } from '@/services/cteParser'

export type ImportWorkerRequest =
  | { id: number, type: 'parse-analyze', buffer: ArrayBuffer, sourceName: string }

export type ImportWorkerResponse =
  | { id: number, ok: true, result: ReturnType<typeof analyzeCtes> }
  | { id: number, ok: false, error: string }

self.onmessage = (event: MessageEvent<ImportWorkerRequest>) => {
  const msg = event.data
  try {
    if (msg.type === 'parse-analyze') {
      const ctes = parseCteWorkbook(msg.buffer)
      if (!ctes.length) {
        const response: ImportWorkerResponse = {
          id: msg.id,
          ok: false,
          error: 'Nenhum CT-e válido encontrado. Verifique o layout LOG FALA.',
        }
        self.postMessage(response)
        return
      }
      const result = analyzeCtes(ctes, msg.sourceName)
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
