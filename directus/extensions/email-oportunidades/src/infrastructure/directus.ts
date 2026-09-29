import type { Readable } from 'node:stream'

export type PrimaryKey = string | number
export type Row = Record<string, unknown>
export type Query = Record<string, unknown>

export interface ItemsServiceLike {
  createOne: (data: Row) => Promise<PrimaryKey>
  createMany: (data: Row[]) => Promise<PrimaryKey[]>
  readOne: (key: PrimaryKey, query?: Query) => Promise<Row>
  readByQuery: (query: Query) => Promise<Row[]>
  updateOne: (key: PrimaryKey, data: Row) => Promise<PrimaryKey>
  updateBatch: (data: Row[]) => Promise<PrimaryKey[]>
  deleteMany: (keys: PrimaryKey[]) => Promise<PrimaryKey[]>
}

export interface FilesServiceLike {
  uploadOne: (stream: Readable, data: Row) => Promise<PrimaryKey>
}

export interface AssetsServiceLike {
  getAsset: (id: string) => Promise<{ stream: Readable, file: Row }>
}

type ServiceCtor<T> = new (opts: Record<string, unknown>) => T

export interface Logger {
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

export interface DirectusContext {
  services: {
    ItemsService: new (collection: string, opts: Record<string, unknown>) => ItemsServiceLike
    FilesService: ServiceCtor<FilesServiceLike>
    AssetsService: ServiceCtor<AssetsServiceLike>
  }
  getSchema: () => Promise<unknown>
  env: Record<string, unknown>
  logger: Logger
}

export type ItemsFactory = (collection: string) => ItemsServiceLike

export interface DirectusServices {
  items: ItemsFactory
  files: FilesServiceLike
  assets: AssetsServiceLike
}

/** Serviços com escopo de sistema: a autenticação é feita na camada HTTP. */
export async function createServices (ctx: DirectusContext): Promise<DirectusServices> {
  const schema = await ctx.getSchema()
  const opts = { schema, accountability: null }
  return {
    items: collection => new ctx.services.ItemsService(collection, opts),
    files: new ctx.services.FilesService(opts),
    assets: new ctx.services.AssetsService(opts),
  }
}

export function str (value: unknown): string | null {
  if (value == null) {
    return null
  }
  const s = String(value).trim()
  return s || null
}

export function num (value: unknown): number | null {
  if (value == null || value === '') {
    return null
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function errMsg (error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
