import { Redis } from "@upstash/redis"

class InMemoryRedis {
  constructor() {
    this.store = new Map()
    this.sets = new Map()
  }

  async get(key) {
    return this.store.has(key) ? this.store.get(key) : null
  }

  async set(key, value) {
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

const upstashUrl = process.env.KV_REST_API_URL
const upstashToken = process.env.KV_REST_API_TOKEN
const globalForRedis = globalThis

if (!globalForRedis.__quizblitzInMemoryRedis) {
  globalForRedis.__quizblitzInMemoryRedis = new InMemoryRedis()
}

if (upstashUrl && upstashToken && !globalForRedis.__quizblitzRedisClient) {
  globalForRedis.__quizblitzRedisClient = new Redis({ url: upstashUrl, token: upstashToken })
}

export const redis = upstashUrl && upstashToken
  ? globalForRedis.__quizblitzRedisClient
  : globalForRedis.__quizblitzInMemoryRedis

if (!upstashUrl || !upstashToken) {
  console.warn("[Redis] KV_REST_API_URL or KV_REST_API_TOKEN missing. Using in-memory fallback.")
}
