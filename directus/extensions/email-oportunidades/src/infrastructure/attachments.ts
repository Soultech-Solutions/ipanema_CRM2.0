import type { MailAttachment } from '../domain/types'
import * as XLSX from 'xlsx'

const MAX_TEXT_CHARS = 30_000

export interface PreparedAttachments {
  pdfs: { filename: string, base64: string }[]
  texts: { filename: string, text: string }[]
  skipped: string[]
}

function extension (filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase()
}

function truncate (text: string): string {
  return text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS)}\n…(truncado)` : text
}

function spreadsheetToText (content: Buffer): string {
  const wb = XLSX.read(content, { type: 'buffer', cellDates: true })
  return wb.SheetNames
    .map(name => {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]!, { FS: ';', blankrows: false })
      return wb.SheetNames.length > 1 ? `[Planilha ${name}]\n${csv}` : csv
    })
    .join('\n\n')
}

/**
 * Separa anexos em PDFs (enviados como documento ao Claude), texto (planilhas/CSV/TXT)
 * e ignorados (imagens, formatos não suportados ou acima do limite).
 */
export function prepareAttachments (
  attachments: MailAttachment[],
  opts: { maxAttachments: number, maxBytes: number },
): PreparedAttachments {
  const result: PreparedAttachments = { pdfs: [], texts: [], skipped: [] }

  for (const att of attachments) {
    const ext = extension(att.filename)
    const type = att.contentType.toLowerCase()
    const used = result.pdfs.length + result.texts.length

    if (used >= opts.maxAttachments || att.size > opts.maxBytes) {
      result.skipped.push(att.filename)
      continue
    }

    try {
      if (type === 'application/pdf' || ext === 'pdf') {
        result.pdfs.push({ filename: att.filename, base64: att.content.toString('base64') })
      } else if (['xlsx', 'xls', 'ods'].includes(ext) || type.includes('spreadsheet') || type.includes('excel')) {
        result.texts.push({ filename: att.filename, text: truncate(spreadsheetToText(att.content)) })
      } else if (['csv', 'txt', 'tsv'].includes(ext) || type.startsWith('text/')) {
        result.texts.push({ filename: att.filename, text: truncate(att.content.toString('utf8')) })
      } else {
        result.skipped.push(att.filename)
      }
    } catch {
      result.skipped.push(att.filename)
    }
  }

  return result
}
