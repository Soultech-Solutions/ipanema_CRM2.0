import type { IncomingMail } from '../../domain/types'

export interface MailProvider {
  readonly kind: 'imap' | 'o365'
  /** Não lidos da pasta configurada, do mais antigo para o mais novo. */
  fetchNew: (limit: number) => Promise<IncomingMail[]>
  /** Marca como lido; com `move=true` também move para a pasta de processados (se configurada). */
  markProcessed: (providerId: string, move: boolean) => Promise<void>
  close: () => Promise<void>
}
