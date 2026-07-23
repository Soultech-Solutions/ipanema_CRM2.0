import type { AnalyticsResult } from '@/services/cteAnalytics'
import type { ImportWorkerRequest, ImportWorkerResponse } from '@/workers/importWorker'

let worker: Worker | null = null
let seq = 0

function getWorker (): Worker {
  if (!worker) {
    worker = new Worker(new URL('@/workers/importWorker.ts', import.meta.url), {
      type: 'module',
    })
  }
  return worker
}

export function parseAndAnalyzeInWorker (
  buffer: ArrayBuffer,
  sourceName: string,
): Promise<AnalyticsResult> {
  const id = ++seq
  const w = getWorker()

  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<ImportWorkerResponse>) => {
      if (event.data.id !== id) return
      w.removeEventListener('message', onMessage)
      w.removeEventListener('error', onError)
      if (event.data.ok) resolve(event.data.result)
      else reject(new Error(event.data.error))
    }

    const onError = (error: ErrorEvent) => {
      w.removeEventListener('message', onMessage)
      w.removeEventListener('error', onError)
      reject(new Error(error.message || 'Worker falhou'))
    }

    w.addEventListener('message', onMessage)
    w.addEventListener('error', onError)

    const request: ImportWorkerRequest = {
      id,
      type: 'parse-analyze',
      buffer,
      sourceName,
    }
    w.postMessage(request, [buffer])
  })
}
