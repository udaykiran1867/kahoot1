import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    service: "kahoot1-backend",
    status: "ok",
    timestamp: new Date().toISOString(),
    redis: Boolean(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
    mongo: Boolean(process.env.MONGODB_URI),
    socketPort: process.env.SOCKET_PORT || "4001",
  })
}