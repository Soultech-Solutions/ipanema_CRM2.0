import type { StoredAttachment } from '../domain/types'
import type { ItemsFactory, PrimaryKey, Row } from './directus'

export type EmailStatus = 'novo' | 'processando' | 'processado' | 'ignorado' | 'erro'

export interface EmailRow {
  id: string
  message_id: string
  provider: string
  remetente: string
  remetente_nome: string | null
  assunto: string | null
  corpo_texto: string | null
  recebido_em: string | null
  anexos: StoredAttachment[] | null
  status: EmailStatus
  oportunidade: string | null
}

export class EmailRepository {
  constructor (private items: ItemsFactory) {}

  private get service () {
    return this.items('emails_recebidos')
  }

  async findByMessageId (messageId: string): Promise<EmailRow | null> {
    const rows = await this.service.readByQuery({
      filter: { message_id: { _eq: messageId } },
      limit: 1,
      fields: ['*'],
    })
    return (rows[0] as unknown as EmailRow) ?? null
  }

  async get (id: PrimaryKey): Promise<EmailRow> {
    return await this.service.readOne(id, { fields: ['*'] }) as unknown as EmailRow
  }

  async create (data: Row): Promise<string> {
    return String(await this.service.createOne(data))
  }

  async update (id: PrimaryKey, data: Row): Promise<void> {
    await this.service.updateOne(id, data)
  }
}
