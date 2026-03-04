import { NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { getSession } from "@/lib/auth"
import type { Quiz } from "@/lib/game-utils"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const quizIds = await redis.smembers(`professor:${session.userId}:quizzes`)
    const quizzes: Quiz[] = []

    for (const id of quizIds) {
      const quiz = await redis.get<string>(`quiz:${id}`)
      if (quiz) {
        const parsed = typeof quiz === "string" ? JSON.parse(quiz) : quiz
        quizzes.push(parsed)
      }
    }

    quizzes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ quizzes })
  } catch (error) {
    console.error("Get quizzes error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, questions } = await req.json()

    if (!title || !questions || questions.length === 0) {
      return NextResponse.json({ error: "Title and questions are required" }, { status: 400 })
    }

    const quizId = crypto.randomUUID()
    const quiz: Quiz = {
      id: quizId,
      title,
      professorId: session.userId,
      questions: questions.map((q: Record<string, unknown>, i: number) => ({
        id: `q-${i}`,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        timeLimit: q.timeLimit || 30,
      })),
      createdAt: new Date().toISOString(),
    }

    await redis.set(`quiz:${quizId}`, JSON.stringify(quiz))
    await redis.sadd(`professor:${session.userId}:quizzes`, quizId)

    return NextResponse.json({ success: true, quiz })
  } catch (error) {
    console.error("Create quiz error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
