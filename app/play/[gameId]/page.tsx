"use client"

import { use, useEffect, useState, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Timer, Trophy, CheckCircle2, XCircle, Loader2, Zap } from "lucide-react"
import type { GameSession, Quiz, Question } from "@/lib/game-utils"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const OPTION_COLORS = [
  { bg: "bg-game-red hover:bg-game-red/90", text: "text-foreground" },
  { bg: "bg-game-blue hover:bg-game-blue/90", text: "text-primary-foreground" },
  { bg: "bg-game-yellow hover:bg-game-yellow/90", text: "text-foreground" },
  { bg: "bg-game-green hover:bg-game-green/90", text: "text-primary-foreground" },
]

export default function PlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params)
  const searchParams = useSearchParams()
  const playerId = searchParams.get("playerId") || ""
  const nickname = searchParams.get("nickname") || "Player"

  const { data } = useSWR(
    `/api/game/state?gameId=${gameId}`,
    fetcher,
    { refreshInterval: 1500 }
  )

  const game: GameSession | null = data?.game || null
  const quiz: Quiz | null = data?.quiz || null

  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set())
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean
    score: number
    correctAnswer: number
    totalScore: number
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const prevQuestionRef = useRef<number>(-1)

  const currentQuestion: Question | null =
    game && quiz && game.status === "started" && game.currentQuestion >= 0
      ? quiz.questions[game.currentQuestion] || null
      : null

  // Reset state when question changes
  useEffect(() => {
    if (game && game.currentQuestion !== prevQuestionRef.current) {
      prevQuestionRef.current = game.currentQuestion
      setLastResult(null)
      if (currentQuestion) {
        setCountdown(currentQuestion.timeLimit)
      }
    }
  }, [game, game?.currentQuestion, currentQuestion])

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleAnswer = useCallback(
    async (answerIndex: number) => {
      if (!game || answeredQuestions.has(game.currentQuestion) || submitting) return

      setSubmitting(true)
      try {
        const res = await fetch("/api/game/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId,
            playerId,
            questionIndex: game.currentQuestion,
            answerIndex,
          }),
        })
        const result = await res.json()
        if (res.ok) {
          setAnsweredQuestions((prev) => new Set(prev).add(game.currentQuestion))
          setLastResult(result)
        }
      } catch {
        // silently fail
      } finally {
        setSubmitting(false)
      }
    },
    [game, gameId, playerId, answeredQuestions, submitting]
  )

  // Loading state
  if (!game || !quiz) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Connecting to game...</p>
        </div>
      </main>
    )
  }

  // Waiting for game to start
  if (game.status === "waiting") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Zap className="size-8 text-primary animate-pulse" />
              </div>
            </div>
            <CardTitle className="text-xl">
              You&#39;re in, {nickname}!
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <p className="text-muted-foreground">Waiting for the game to start...</p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {game.players.map((p) => (
                <Badge
                  key={p.id}
                  variant={p.id === playerId ? "default" : "secondary"}
                >
                  {p.nickname}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  // Game finished
  if (game.status === "finished") {
    const sorted = [...game.players].sort((a, b) => b.score - a.score)
    const myRank = sorted.findIndex((p) => p.id === playerId) + 1
    const myPlayer = sorted.find((p) => p.id === playerId)

    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="flex flex-col gap-6 w-full max-w-sm">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground">Game Over!</h2>
            <p className="text-muted-foreground mt-1">
              You finished #{myRank} out of {sorted.length}
            </p>
          </div>

          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-4xl font-bold text-primary tabular-nums">
                {myPlayer?.score.toLocaleString() || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Total Points</p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {sorted.slice(0, 5).map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  p.id === playerId
                    ? "bg-primary/10 border-primary"
                    : i === 0
                    ? "bg-game-yellow/10 border-game-yellow"
                    : "bg-card"
                }`}
              >
                <span className="flex items-center justify-center size-7 rounded-full bg-muted font-bold text-xs text-foreground">
                  {i === 0 ? (
                    <Trophy className="size-4 text-game-yellow" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {p.nickname}
                  {p.id === playerId && " (You)"}
                </span>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {p.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  // Active question
  const hasAnswered = answeredQuestions.has(game.currentQuestion)
  const timePercent = currentQuestion
    ? ((countdown || 0) / currentQuestion.timeLimit) * 100
    : 0

  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="border-b bg-card px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <Badge variant="secondary">
            Q{game.currentQuestion + 1}/{quiz.questions.length}
          </Badge>
          <div className="flex items-center gap-1 font-bold text-foreground">
            <Timer className="size-4" />
            <span className="tabular-nums">{countdown ?? 0}s</span>
          </div>
          <span className="text-sm text-muted-foreground">{nickname}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 mx-auto w-full max-w-lg">
        {/* Timer progress */}
        <Progress value={timePercent} className="h-1.5 mb-4" />

        {/* Question */}
        {currentQuestion && (
          <div className="flex flex-col gap-4 flex-1">
            <h2 className="text-xl font-bold text-center text-foreground text-balance py-4">
              {currentQuestion.text}
            </h2>

            {hasAnswered && lastResult ? (
              // Show result
              <div className="flex flex-col items-center gap-4 flex-1 justify-center">
                {lastResult.isCorrect ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="size-16 text-game-green" />
                    <h3 className="text-2xl font-bold text-foreground">Correct!</h3>
                    <p className="text-lg text-primary font-bold">+{lastResult.score} points</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <XCircle className="size-16 text-game-red" />
                    <h3 className="text-2xl font-bold text-foreground">Wrong</h3>
                    <p className="text-sm text-muted-foreground">
                      Correct: Option {String.fromCharCode(65 + lastResult.correctAnswer)}
                    </p>
                  </div>
                )}
                <p className="text-muted-foreground">
                  Total: {lastResult.totalScore.toLocaleString()} pts
                </p>
              </div>
            ) : submitting ? (
              <div className="flex flex-col items-center gap-3 flex-1 justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Submitting...</p>
              </div>
            ) : (
              // Show answer options
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {currentQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={countdown === 0}
                    className={`flex items-center gap-3 rounded-xl p-5 transition-all active:scale-95 ${OPTION_COLORS[i].bg} ${OPTION_COLORS[i].text} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span className="flex items-center justify-center size-8 rounded-lg bg-background/20 font-bold text-sm">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="font-medium text-left flex-1">{opt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
