import { Redis } from "@upstash/redis"
import fs from "node:fs"
import path from "node:path"

class InMemoryRedis {
  constructor() {
    this.store = new Map()
    this.sets = new Map()
  }

  async get(key) {
    return this.store.has(key) ? this.store.get(key) : null
  }

  async set(key, value, options = {}) {
    const hasKey = this.store.has(key)

    if (options?.nx && hasKey) {
      return null
    }

    if (options?.xx && !hasKey) {
      return null
    }

    this.store.set(key, value)
    return "OK"
  }

  async del(key) {
    const hadValue = this.store.delete(key)
    const hadSet = this.sets.delete(key)
    return hadValue || hadSet ? 1 : 0
  }

  async sadd(key, ...members) {
    const current = this.sets.get(key) || new Set()
    let added = 0
    for (const member of members.flat()) {
      if (!current.has(member)) {
        current.add(member)
        added += 1
      }
    }
    this.sets.set(key, current)
    return added
  }

  async smembers(key) {
    const current = this.sets.get(key)
    if (!current) return []
    return Array.from(current)
  }

  async srem(key, ...members) {
    const current = this.sets.get(key)
    if (!current) return 0
    let removed = 0
    for (const member of members.flat()) {
      if (current.delete(member)) {
        removed += 1
      }
    }
    if (current.size === 0) {
      this.sets.delete(key)
    }
    return removed
  }
}

class FileBackedRedis extends InMemoryRedis {
  constructor(filePath) {
    super()
    this.filePath = filePath
    this.#load()
  }

  #load() {
    try {
      if (!fs.existsSync(this.filePath)) return
      const raw = fs.readFileSync(this.filePath, "utf8")
      if (!raw.trim()) return
      const data = JSON.parse(raw)
      this.store = new Map(Object.entries(data.store || {}))
      this.sets = new Map(
        Object.entries(data.sets || {}).map(([key, members]) => [key, new Set(members)])
      )
    } catch (error) {
      console.warn("[Redis] Failed to load local fallback data:", error)
    }
  }

  #persist() {
    try {
      const dir = path.dirname(this.filePath)
      fs.mkdirSync(dir, { recursive: true })
      const data = {
        store: Object.fromEntries(this.store),
        sets: Object.fromEntries(Array.from(this.sets.entries()).map(([k, v]) => [k, Array.from(v)])),
      }
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8")
    } catch (error) {
      console.warn("[Redis] Failed to persist local fallback data:", error)
    }
  }

  async set(key, value, options = {}) {
    const result = await super.set(key, value, options)
    if (result === "OK") {
      this.#persist()
    }
    return result
  }

  async del(key) {
    const result = await super.del(key)
    this.#persist()
    return result
  }

  async sadd(key, ...members) {
    const result = await super.sadd(key, ...members)
    this.#persist()
    return result
  }

  async srem(key, ...members) {
    const result = await super.srem(key, ...members)
    this.#persist()
    return result
  }
}

const upstashUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
const globalForRedis = globalThis
const localDataPath = path.join(process.cwd(), ".local-data", "redis-fallback.json")

if (!globalForRedis.__quizblitzLocalRedis) {
  globalForRedis.__quizblitzLocalRedis = new FileBackedRedis(localDataPath)
}

if (upstashUrl && upstashToken && !globalForRedis.__quizblitzRedisClient) {
  globalForRedis.__quizblitzRedisClient = new Redis({ url: upstashUrl, token: upstashToken })
}

function isNetworkRedisError(error) {
  const code = error?.cause?.code || error?.code
  if (["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET"].includes(code)) {
    return true
  }

  const message = String(error?.message || "").toLowerCase()
  return message.includes("fetch failed") || message.includes("network")
}

class ResilientRedis {
  constructor(primaryClient, fallbackClient) {
    this.primary = primaryClient
    this.fallback = fallbackClient
    this.warned = false
    this.primaryUnavailable = false
  }

  async #run(method, args) {
    if (this.primaryUnavailable || !this.primary || typeof this.primary[method] !== "function") {
      return this.fallback[method](...args)
    }

    try {
      return await this.primary[method](...args)
    } catch (error) {
      if (!isNetworkRedisError(error)) {
        throw error
      }

      if (!this.warned) {
        console.warn(
          `[Redis] Upstash unavailable. Falling back to local persistent storage at ${localDataPath}`
        )
        this.warned = true
      }

      // Circuit-breaker: avoid paying network timeout on every call.
      this.primaryUnavailable = true

      return this.fallback[method](...args)
    }
  }

  async get(key) {
    return this.#run("get", [key])
  }

  async set(key, value, options = {}) {
    return this.#run("set", [key, value, options])
  }

  async del(key) {
    return this.#run("del", [key])
  }

  async sadd(key, ...members) {
    return this.#run("sadd", [key, ...members])
  }

  async smembers(key) {
    return this.#run("smembers", [key])
  }

  async srem(key, ...members) {
    return this.#run("srem", [key, ...members])
  }
}

if (!globalForRedis.__quizblitzRedis) {
  globalForRedis.__quizblitzRedis = new ResilientRedis(
    upstashUrl && upstashToken ? globalForRedis.__quizblitzRedisClient : null,
    globalForRedis.__quizblitzLocalRedis
  )
}

export const redis = globalForRedis.__quizblitzRedis

if (!upstashUrl || !upstashToken) {
  console.warn("[Redis] Upstash credentials missing. Using local persistent fallback at .local-data/redis-fallback.json")
}
