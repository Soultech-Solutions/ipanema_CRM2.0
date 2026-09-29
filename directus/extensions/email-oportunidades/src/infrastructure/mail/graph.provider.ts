import type { O365Config } from '../../config'
import type { IncomingMail, MailAttachment } from '../../domain/types'
import type { MailProvider } from './types'
import { htmlToText } from './parse-raw'

const GRAPH = 'https://graph.microsoft.com/v1.0'

interface GraphMessage {
  id: string
  internetMessageId?: string
  subject?: string
  receivedDateTime?: string
  hasAttachments?: boolean
  from?: { emailAddress?: { address?: string, name?: string } }
  toRecipients?: { emailAddress?: { address?: string } }[]
  body?: { contentType?: 'text' | 'html', content?: string }
}

interface GraphAttachment {
  '@odata.type': string
  'name'?: string
  'contentType'?: string
  'size'?: number
  'isInline'?: boolean
  'contentBytes'?: string
}

/**
 * Microsoft 365 via Microsoft Graph com client credentials
 * (app registration com permissão de aplicação Mail.ReadWrite + admin consent).
 */
export class GraphProvider implements MailProvider {
  readonly kind = 'o365' as const
  private token: { value: string, expiresAt: number } | null = null
  private folderIds = new Map<string, string>()

  constructor (
    private config: O365Config,
    private processedFolder: string | null,
  ) {}

  private get mailbox (): string {
    return `/users/${encodeURIComponent(this.config.mailbox)}`
  }

  async fetchNew (limit: number): Promise<IncomingMail[]> {
    const params = new URLSearchParams({
      $filter: 'isRead eq false',
      $orderby: 'receivedDateTime asc',
      $top: String(limit),
      $select: 'id,internetMessageId,subject,receivedDateTime,hasAttachments,from,toRecipients,body',
    })
    const folder = encodeURIComponent(this.config.folder)
    const { value } = await this.graph<{ value: GraphMessage[] }>(
      `${this.mailbox}/mailFolders/${folder}/messages?${params}`,
      { headers: { Prefer: 'outlook.body-content-type="text"' } },
    )

    const mails: IncomingMail[] = []
    for (const msg of value) {
      const attachments = msg.hasAttachments ? await this.fetchAttachments(msg.id) : []
      const content = msg.body?.content || ''
      mails.push({
        providerId: msg.id,
        messageId: msg.internetMessageId || `graph-${msg.id}`,
        from: (msg.from?.emailAddress?.address || '').toLowerCase(),
        fromName: msg.from?.emailAddress?.name || null,
        to: (msg.toRecipients || []).map(r => r.emailAddress?.address || '').filter(Boolean),
        subject: msg.subject || '',
        text: msg.body?.contentType === 'html' ? htmlToText(content) : content.trim(),
        receivedAt: msg.receivedDateTime ? new Date(msg.receivedDateTime) : null,
        attachments,
      })
    }
    return mails
  }

  async markProcessed (providerId: string, move: boolean): Promise<void> {
    const path = `${this.mailbox}/messages/${encodeURIComponent(providerId)}`
    await this.graph(path, { method: 'PATCH', body: JSON.stringify({ isRead: true }) })
    if (move && this.processedFolder) {
      const destinationId = await this.resolveFolderId(this.processedFolder)
      await this.graph(`${path}/move`, { method: 'POST', body: JSON.stringify({ destinationId }) })
    }
  }

  async close (): Promise<void> {
    // HTTP sem estado — nada a fechar
  }

  private async accessToken (): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token.value
    }

    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    })
    const res = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(this.config.tenantId)}/oauth2/v2.0/token`,
      { method: 'POST', body },
    )
    const data = await res.json() as { access_token?: string, expires_in?: number, error_description?: string }
    if (!res.ok || !data.access_token) {
      throw new Error(`Falha ao autenticar no Microsoft 365: ${data.error_description || res.statusText}`)
    }
    this.token = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 }
    return this.token.value
  }

  private async graph<T> (path: string, init: RequestInit & { headers?: Record<string, string> } = {}): Promise<T> {
    const token = await this.accessToken()
    const res = await fetch(path.startsWith('http') ? path : `${GRAPH}${path}`, {
      ...init,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Graph ${init.method || 'GET'} ${path} → ${res.status}: ${text.slice(0, 300)}`)
    }
    if (res.status === 204) {
      return undefined as T
    }
    return await res.json() as T
  }

  private async fetchAttachments (messageId: string): Promise<MailAttachment[]> {
    const { value } = await this.graph<{ value: GraphAttachment[] }>(
      `${this.mailbox}/messages/${encodeURIComponent(messageId)}/attachments`,
    )
    return value
      .filter(a => a['@odata.type'] === '#microsoft.graph.fileAttachment' && a.contentBytes)
      .filter(a => !(a.isInline && a.contentType?.startsWith('image/')))
      .map(a => {
        const content = Buffer.from(a.contentBytes!, 'base64')
        return {
          filename: a.name || 'anexo',
          contentType: a.contentType || 'application/octet-stream',
          size: a.size ?? content.length,
          content,
        }
      })
  }

  private async resolveFolderId (name: string): Promise<string> {
    const cached = this.folderIds.get(name)
    if (cached) {
      return cached
    }

    const filter = encodeURIComponent(`displayName eq '${name.replace(/'/g, '\'\'')}'`)
    const { value } = await this.graph<{ value: { id: string }[] }>(
      `${this.mailbox}/mailFolders?$filter=${filter}`,
    )
    let id = value[0]?.id
    if (!id) {
      const created = await this.graph<{ id: string }>(`${this.mailbox}/mailFolders`, {
        method: 'POST',
        body: JSON.stringify({ displayName: name }),
      })
      id = created.id
    }
    this.folderIds.set(name, id)
    return id
  }
}
