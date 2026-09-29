import type { MailAttachment, StoredAttachment } from '../domain/types'
import type { AssetsServiceLike, FilesServiceLike, Logger } from './directus'
import { Readable } from 'node:stream'
import { errMsg } from './directus'

async function streamToBuffer (stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

/** Guarda anexos em `directus_files` para exibição no front e reprocessamento. */
export class AttachmentStorage {
  constructor (
    private files: FilesServiceLike,
    private assets: AssetsServiceLike,
    private storage: string,
    private logger: Logger,
  ) {}

  async save (attachments: MailAttachment[], title: string): Promise<StoredAttachment[]> {
    const stored: StoredAttachment[] = []
    for (const att of attachments) {
      let arquivo: string | null = null
      try {
        arquivo = String(await this.files.uploadOne(Readable.from(att.content), {
          storage: this.storage,
          filename_download: att.filename,
          type: att.contentType,
          title: `${title} — ${att.filename}`.slice(0, 250),
        }))
      } catch (error_) {
        this.logger.warn(`[email-oportunidades] falha ao salvar anexo ${att.filename}: ${errMsg(error_)}`)
      }
      stored.push({ nome: att.filename, tipo: att.contentType, tamanho: att.size, arquivo })
    }
    return stored
  }

  async load (stored: StoredAttachment[] | null): Promise<MailAttachment[]> {
    const result: MailAttachment[] = []
    for (const att of stored ?? []) {
      if (!att.arquivo) {
        continue
      }
      try {
        const { stream } = await this.assets.getAsset(att.arquivo)
        const content = await streamToBuffer(stream)
        result.push({ filename: att.nome, contentType: att.tipo, size: content.length, content })
      } catch (error_) {
        this.logger.warn(`[email-oportunidades] falha ao ler anexo ${att.nome}: ${errMsg(error_)}`)
      }
    }
    return result
  }
}
