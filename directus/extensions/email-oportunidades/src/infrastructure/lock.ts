import { randomUUID } from 'node:crypto'
import { Redis } from 'ioredis'

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0`

let redis: Redis | null = null
const localLocks = new Set<string>()

function getRedis (url: string): Redis {
  redis ??= new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 2, enableOfflineQueue: true })
  return redis
}

export type ReleaseFn = () => Promise<void>

/**
 * Lock distribuído (Redis `SET NX EX`) para evitar duas leituras simultâneas da caixa.
 * Sem Redis, cai para um lock em memória do processo.
 */
export async function acquireLock (redisUrl: string | null, key: string, ttlSeconds: number): Promise<ReleaseFn | null> {
  if (!redisUrl) {
    if (localLocks.has(key)) {
      return null
    }
    localLocks.add(key)
    return async () => {
      localLocks.delete(key)
    }
  }

  const client = getRedis(redisUrl)
  const token = randomUUID()
  const ok = await client.set(key, token, 'EX', ttlSeconds, 'NX')
  if (ok !== 'OK') {
    return null
  }

  return async () => {
    await client.eval(RELEASE_SCRIPT, 1, key, token).catch(() => undefined)
  }
}
