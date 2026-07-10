import { readLock, writeLock } from '@/lib/sheets'

const LOCK_TTL_MS = 10_000

function isExpired(locked_at: string): boolean {
  return Date.now() - new Date(locked_at).getTime() > LOCK_TTL_MS
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function acquireLock(maxRetries = 3, retryDelayMs = 300): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const lock = await readLock()
    if (lock.status === 'FREE' || isExpired(lock.locked_at)) {
      await writeLock('LOCKED', new Date().toISOString())
      return
    }
    await sleep(retryDelayMs)
  }
  throw new Error('Could not acquire lock after retries')
}

export async function releaseLock(): Promise<void> {
  await writeLock('FREE', '')
}

export async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  await acquireLock()
  try {
    return await fn()
  } finally {
    await releaseLock()
  }
}
