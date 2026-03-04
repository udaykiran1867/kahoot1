"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, Play, SkipForward, Square, Copy, Check, Timer, Trophy } from "lucide-react"
import type { GameSession, Quiz, Question } from "@/lib/game-utils"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface GameLobbyProps {
  gameId: string
  onEnd: () => void
}

const OPTION_COLORS = [
  "bg-game-red",
  "bg-game-blue",
  "bg-game-yellow",
  "bg-game-green",
]

export function GameLobby({ gameId, onEnd }: GameLobbyProps) {
  const { data, mutate: refreshState } = useSWR(
    `/api/game/state?gameId=${gameId}`,
    fetcher,
    { refreshInterval: 1500 }
  )
  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const game: GameSession | null = data?.game || null
  const quiz: Quiz | null = data?.quiz || null

  const currentQuestion: Question | null =
    game && quiz && game.status === "started" && game.currentQuestion >= 0
      ? quiz.questions[game.currentQuestion] || null
      : null

  useEffect(() => {
    if (currentQuestion && game?.status === "started") {
      setCountdown(currentQuestion.timeLimit)
    }
  }, [currentQuestion, game?.currentQuestion, game?.status])

  useEffect(() => {
    if (countdown === null || countdown <= 0) return
    timerRef.current = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [countdown])

  const handleCopy = useCallback(async () => {
    if (!game) return
    await navigator.clipboard.writeText(game.pin)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [game])

  const handleControl = useCallback(
    async (action: "start" | "next" | "end") => {
      await fetch("/api/game/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, action }),
      })
      refreshState()
    },
    [gameId, refreshState]
  )

  if (!game || !quiz) {
    return (
      <div className="flex justify-center py-12">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  // Finished state
  if (game.status === "finished") {
    const sorted = [...game.players].sort((a, b) => b.score - a.score)
    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Game Over</h2>
          <p className="text-muted-foreground mt-1">Final Results</p>
        </div>

        <div className="flex flex-col gap-3 max-w-md mx-auto w-full">
          {sorted.map((player, i) => (
            <div
              key={player.id}
              className={`flex items-center gap-3 rounded-lg border p-4 ${
                i === 0 ? "bg-game-yellow/10 border-game-yellow" : "bg-card"
              }`}
            >
              <span className="flex items-center justify-center size-8 rounded-full bg-muted font-bold text-sm text-foreground">
                {i === 0 ? <Trophy className="size-4 text-game-yellow" /> : i + 1}
              </span>
              <span className="flex-1 font-medium text-foreground">{player.nickname}</span>
              <span className="font-bold text-foreground">{player.score.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <Button onClick={onEnd}>Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  // Waiting state
  if (game.status === "waiting") {
    return (
      <div className="flex flex-col gap-6 items-center">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl">{quiz.title}</CardTitle>
            <CardDescription>Share this PIN with your students</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-5xl font-bold tracking-[0.3em] font-mono text-foreground">
                {game.pin}
              </span>
              <Button variant="ghost" size="icon" onClick={handleCopy}>
                {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="size-4" />
                Players ({game.players.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {game.players.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Waiting for players to join...
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {game.players.map((p) => (
                  <Badge key={p.id} variant="secondary">
                    {p.nickname}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onEnd}>
            Cancel
          </Button>
          <Button
            onClick={() => handleControl("start")}
            disabled={game.players.length === 0}
            className="gap-2"
          >
            <Play className="size-4" />
            Start Game ({game.players.length} players)
          </Button>
        </div>
      </div>
    )
  }

  // Started state - show current question
  const questionNum = game.currentQuestion + 1
  const totalQuestions = quiz.questions.length
  const timePercent = currentQuestion
    ? ((countdown || 0) / currentQuestion.timeLimit) * 100
    : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {questionNum} / {totalQuestions}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="size-4" />
            {game.players.length} players
          </div>
        </div>
        <div className="flex items-center gap-2">
          {questionNum < totalQuestions ? (
            <Button size="sm" onClick={() => handleControl("next")} className="gap-1">
              <SkipForward className="size-4" />
              Next
            </Button>
          ) : (
            <Button size="sm" onClick={() => handleControl("end")} className="gap-1">
              <Square className="size-4" />
              End Game
            </Button>
          )}
        </div>
      </div>

      {currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-xl">{currentQuestion.text}</CardTitle>
              <div className="flex items-center gap-1 text-lg font-bold text-foreground">
                <Timer className="size-5" />
                {countdown ?? 0}s
              </div>
            </div>
            <Progress value={timePercent} className="h-2" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {currentQuestion.options.map((opt, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg p-4 ${OPTION_COLORS[i]} ${
                    i === currentQuestion.correctAnswer ? "ring-2 ring-foreground" : ""
                  }`}
                >
                    <span className="flex items-center justify-center size-8 rounded-md bg-white/20 font-bold text-sm text-white">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="font-medium text-white">{opt}</span>
                    {i === currentQuestion.correctAnswer && (
                      <Check className="size-5 ml-auto text-white" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {[...game.players]
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 py-1.5">
                  <span className="flex items-center justify-center size-6 rounded-full bg-muted font-bold text-xs text-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-foreground">{p.nickname}</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">{p.score.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
