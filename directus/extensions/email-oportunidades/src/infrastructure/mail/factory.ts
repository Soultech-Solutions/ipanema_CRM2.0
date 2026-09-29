import type { ExtensionConfig } from '../../config'
import type { MailProvider } from './types'
import { GraphProvider } from './graph.provider'
import { ImapProvider } from './imap.provider'

export function createMailProvider (config: ExtensionConfig): MailProvider {
  return config.provider === 'o365'
    ? new GraphProvider(config.o365, config.processedFolder)
    : new ImapProvider(config.imap, config.processedFolder)
}
