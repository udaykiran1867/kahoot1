import { redis } from "@/lib/redis"
import { randomUUID } from "node:crypto"

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function acquireLock(lockKey, token, leaseSeconds) {
  try {
    const result = await redis.set(lockKey, token, { nx: true, ex: leaseSeconds })
    return result === "OK"
  } catch {
    return false
  }
}

async function releaseLock(lockKey, token) {
  try {
    const lockOwner = await redis.get(lockKey)
    if (lockOwner === token) {
      await redis.del(lockKey)
    }
  } catch {
    // Best-effort cleanup only.
  }
}

export async function withGameLock(gameId, work, options = {}) {
  const waitMs = Number.isFinite(options.waitMs) ? options.waitMs : 3000
  const leaseSeconds = Number.isFinite(options.leaseSeconds) ? options.leaseSeconds : 5
  const retryEveryMs = Number.isFinite(options.retryEveryMs) ? options.retryEveryMs : 25
  const lockKey = `lock:game:${gameId}`
  const token = randomUUID()
  const start = Date.now()

  while (Date.now() - start < waitMs) {
    const acquired = await acquireLock(lockKey, token, leaseSeconds)
    if (acquired) {
      try {
        return await work()
      } finally {
        await releaseLock(lockKey, token)
      }
    }
    await sleep(retryEveryMs)
  }

  throw new Error("Game is busy, please retry")
}
