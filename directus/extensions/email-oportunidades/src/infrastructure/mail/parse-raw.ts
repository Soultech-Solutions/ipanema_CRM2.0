import type { IncomingMail } from '../../domain/types'
import { createHash } from 'node:crypto'
import { simpleParser } from 'mailparser'

export function htmlToText (html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim()
}

/** Converte um email RFC 822 (.eml / fonte IMAP) no formato interno. */
export async function parseRawEmail (raw: Buffer, providerId: string): Promise<IncomingMail> {
  const parsed = await simpleParser(raw)
  const from = parsed.from?.value?.[0]
  const toList = Array.isArray(parsed.to) ? parsed.to : (parsed.to ? [parsed.to] : [])

  const text = parsed.text?.trim()
    || (typeof parsed.html === 'string' ? htmlToText(parsed.html) : '')

  return {
    providerId,
    messageId: parsed.messageId
      || `sem-message-id-${createHash('sha1').update(raw).digest('hex')}`,
    from: (from?.address || '').toLowerCase(),
    fromName: from?.name || null,
    to: toList.flatMap(t => t.value.map(v => v.address || '')).filter(Boolean),
    subject: parsed.subject || '',
    text,
    receivedAt: parsed.date ?? null,
    attachments: parsed.attachments
      .filter(a => a.contentDisposition !== 'inline' || !a.contentType.startsWith('image/'))
      .map(a => ({
        filename: a.filename || 'anexo',
        contentType: a.contentType || 'application/octet-stream',
        size: a.size,
        content: a.content,
      })),
  }
}
