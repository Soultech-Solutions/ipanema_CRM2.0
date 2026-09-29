/** Directus converte "true"/"123" do env em boolean/number — aceitamos qualquer valor. */
export type Env = Record<string, unknown>

export type MailProviderKind = 'imap' | 'o365'

export interface ImapConfig {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  folder: string
}

export interface O365Config {
  tenantId: string
  clientId: string
  clientSecret: string
  mailbox: string
  folder: string
}

export interface ExtensionConfig {
  enabled: boolean
  provider: MailProviderKind
  pollCron: string
  batchSize: number
  processedFolder: string | null
  imap: ImapConfig
  o365: O365Config
  anthropic: {
    apiKey: string
    model: string
    maxTokens: number
    maxToolRounds: number
  }
  maxAttachments: number
  maxAttachmentBytes: number
  redisUrl: string | null
  storage: string
}

function int (value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

export function loadConfig (rawEnv: Env): ExtensionConfig {
  const env = new Proxy({} as Record<string, string | undefined>, {
    get: (_target, key: string) => {
      const value = rawEnv[key]
      return value == null || value === '' ? undefined : String(value)
    },
  })
  const provider = (env.MAIL_PROVIDER || 'imap').toLowerCase() === 'o365' ? 'o365' : 'imap'

  return {
    enabled: env.EMAIL_INGEST_ENABLED === 'true',
    provider,
    pollCron: env.MAIL_POLL_CRON || '*/2 * * * *',
    batchSize: int(env.MAIL_BATCH_SIZE, 20),
    processedFolder: env.MAIL_PROCESSED_FOLDER?.trim() || null,
    imap: {
      host: env.IMAP_HOST || '',
      port: int(env.IMAP_PORT, 993),
      secure: env.IMAP_SECURE !== 'false',
      user: env.IMAP_USER || '',
      password: env.IMAP_PASSWORD || '',
      folder: env.IMAP_FOLDER || 'INBOX',
    },
    o365: {
      tenantId: env.O365_TENANT_ID || '',
      clientId: env.O365_CLIENT_ID || '',
      clientSecret: env.O365_CLIENT_SECRET || '',
      mailbox: env.O365_MAILBOX || '',
      folder: env.O365_FOLDER || 'inbox',
    },
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY || '',
      model: env.EMAIL_EXTRACTOR_MODEL || env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
      maxTokens: int(env.EMAIL_EXTRACTOR_MAX_TOKENS, 4096),
      maxToolRounds: int(env.EMAIL_EXTRACTOR_MAX_TOOL_ROUNDS, 10),
    },
    maxAttachments: int(env.EMAIL_MAX_ATTACHMENTS, 5),
    maxAttachmentBytes: int(env.EMAIL_MAX_ATTACHMENT_MB, 10) * 1024 * 1024,
    redisUrl: env.REDIS || null,
    storage: (env.STORAGE_LOCATIONS || 'local').split(',', 1)[0]!.trim() || 'local',
  }
}

/** Lista o que falta para o provedor configurado funcionar. */
export function missingMailConfig (config: ExtensionConfig): string[] {
  const missing: string[] = []
  if (config.provider === 'imap') {
    if (!config.imap.host) {
      missing.push('IMAP_HOST')
    }
    if (!config.imap.user) {
      missing.push('IMAP_USER')
    }
    if (!config.imap.password) {
      missing.push('IMAP_PASSWORD')
    }
  } else {
    if (!config.o365.tenantId) {
      missing.push('O365_TENANT_ID')
    }
    if (!config.o365.clientId) {
      missing.push('O365_CLIENT_ID')
    }
    if (!config.o365.clientSecret) {
      missing.push('O365_CLIENT_SECRET')
    }
    if (!config.o365.mailbox) {
      missing.push('O365_MAILBOX')
    }
  }
  if (!config.anthropic.apiKey) {
    missing.push('ANTHROPIC_API_KEY')
  }
  return missing
}
