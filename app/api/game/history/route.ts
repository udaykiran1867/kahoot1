import { NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { getSession } from "@/lib/auth"
import type { GameSession, Quiz, PlayerAnswer } from "@/lib/game-utils"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    const gameIds = await redis.smembers(`professor:${session.userId}:games`)
    const games: Array<{
      game: GameSession
      quiz: Quiz | null
      playerCount: number
      topPlayer: string | null
    }> = []

    for (const gid of gameIds) {
      const gameData = await redis.get<string>(`game:${gid}`)
      if (gameData) {
        const game: GameSession =
          typeof gameData === "string" ? JSON.parse(gameData) : gameData
        if (game.status === "finished") {
          const quizData = await redis.get<string>(`quiz:${game.quizId}`)
          const quiz: Quiz | null = quizData
            ? typeof quizData === "string"
              ? JSON.parse(quizData)
              : quizData
            : null

          const sorted = [...game.players].sort((a, b) => b.score - a.score)

          games.push({
            game,
            quiz,
            playerCount: game.players.length,
            topPlayer: sorted[0]?.nickname || null,
          })
        }
      }
    }

    games.sort(
      (a, b) =>
        new Date(b.game.createdAt).getTime() -
        new Date(a.game.createdAt).getTime()
    )

    const start = (page - 1) * limit
    const paged = games.slice(start, start + limit)

    return NextResponse.json({
      history: paged,
      total: games.length,
      page,
      totalPages: Math.ceil(games.length / limit),
    })
  } catch (error) {
    console.error("History error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
