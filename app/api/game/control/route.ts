import { NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import type { GameSession, Quiz } from "@/lib/game-utils"

export async function POST(req: NextRequest) {
  try {
    const { gameId, action } = await req.json()

    const gameData = await redis.get<string>(`game:${gameId}`)
    if (!gameData) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const game: GameSession = typeof gameData === "string" ? JSON.parse(gameData) : gameData

    const quizData = await redis.get<string>(`quiz:${game.quizId}`)
    if (!quizData) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    const quiz: Quiz = typeof quizData === "string" ? JSON.parse(quizData) : quizData

    if (action === "start") {
      game.status = "started"
      game.currentQuestion = 0
      const questionStartTime = Date.now()
      await redis.set(`game:${gameId}:questionStart`, questionStartTime.toString(), { ex: 86400 })
    } else if (action === "next") {
      const nextQ = game.currentQuestion + 1
      if (nextQ >= quiz.questions.length) {
        game.status = "finished"
      } else {
        game.currentQuestion = nextQ
        const questionStartTime = Date.now()
        await redis.set(`game:${gameId}:questionStart`, questionStartTime.toString(), { ex: 86400 })
      }
    } else if (action === "end") {
      game.status = "finished"
    }

    await redis.set(`game:${gameId}`, JSON.stringify(game), { ex: 86400 })

    return NextResponse.json({ success: true, game, quiz })
  } catch (error) {
    console.error("Game control error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
