import type { ImapConfig } from '../../config'
import type { IncomingMail } from '../../domain/types'
import type { MailProvider } from './types'
import { ImapFlow, type MailboxLockObject } from 'imapflow'
import { parseRawEmail } from './parse-raw'

export class ImapProvider implements MailProvider {
  readonly kind = 'imap' as const
  private client: ImapFlow | null = null
  private lock: MailboxLockObject | null = null

  constructor (
    private config: ImapConfig,
    private processedFolder: string | null,
  ) {}

  async fetchNew (limit: number): Promise<IncomingMail[]> {
    const client = await this.connect()
    const uids = await client.search({ seen: false }, { uid: true })
    if (!uids || uids.length === 0) {
      return []
    }

    const selected = uids.toSorted((a, b) => a - b).slice(0, limit)
    const mails: IncomingMail[] = []
    // `source` traz o RFC 822 completo; sem marcar \Seen até processarmos
    for await (const msg of client.fetch(selected, { uid: true, source: true }, { uid: true })) {
      if (!msg.source) {
        continue
      }
      mails.push(await parseRawEmail(msg.source, String(msg.uid)))
    }
    return mails
  }

  async markProcessed (providerId: string, move: boolean): Promise<void> {
    const client = await this.connect()
    const uid = providerId
    await client.messageFlagsAdd(uid, [String.raw`\Seen`], { uid: true })
    if (move && this.processedFolder) {
      await client.mailboxCreate(this.processedFolder).catch(() => undefined)
      await client.messageMove(uid, this.processedFolder, { uid: true })
    }
  }

  async close (): Promise<void> {
    try {
      this.lock?.release()
      await this.client?.logout()
    } catch {
      this.client?.close()
    } finally {
      this.lock = null
      this.client = null
    }
  }

  private async connect (): Promise<ImapFlow> {
    if (this.client) {
      return this.client
    }
    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: { user: this.config.user, pass: this.config.password },
      logger: false,
    })
    await client.connect()
    this.lock = await client.getMailboxLock(this.config.folder)
    this.client = client
    return client
  }
}
