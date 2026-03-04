import { NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import type { GameSession, PlayerInfo } from "@/lib/game-utils"

export async function POST(req: NextRequest) {
  try {
    const { pin, nickname } = await req.json()

    if (!pin || !nickname) {
      return NextResponse.json({ error: "PIN and nickname are required" }, { status: 400 })
    }

    const gameId = await redis.get<string>(`game:pin:${pin}`)
    if (!gameId) {
      return NextResponse.json({ error: "Invalid game PIN" }, { status: 404 })
    }

    const gameData = await redis.get<string>(`game:${gameId}`)
    if (!gameData) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const game: GameSession = typeof gameData === "string" ? JSON.parse(gameData) : gameData

    if (game.status !== "waiting") {
      return NextResponse.json({ error: "Game has already started" }, { status: 400 })
    }

    const hasDuplicate = game.players.some(
      (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
    )
    if (hasDuplicate) {
      return NextResponse.json({ error: "Nickname already taken" }, { status: 409 })
    }

    const playerId = crypto.randomUUID()
    const player: PlayerInfo = {
      id: playerId,
      nickname,
      score: 0,
      joinedAt: new Date().toISOString(),
    }

    game.players.push(player)
    await redis.set(`game:${gameId}`, JSON.stringify(game), { ex: 86400 })

    return NextResponse.json({ success: true, playerId, gameId })
  } catch (error) {
    console.error("Join game error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
