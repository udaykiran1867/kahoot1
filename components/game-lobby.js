"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import useSWR from "swr"
import { Users, Play, SkipForward, Square, Copy, Check, Timer, Trophy } from "lucide-react"

const fetcher = (url) => fetch(url).then((r) => r.json())

const OPTION_COLORS = [
  "bg-game-red",
  "bg-game-blue",
  "bg-game-yellow",
  "bg-game-green",
]
const buttonBase =
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2"
const buttonDefault = `${buttonBase} bg-primary text-primary-foreground shadow hover:bg-primary/90`
const buttonOutline = `${buttonBase} border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground`
const buttonGhost = `${buttonBase} hover:bg-accent hover:text-accent-foreground shadow-none`
const buttonSm = "h-8 rounded-md px-3 text-xs"

export function GameLobby({ gameId, onEnd }) {
  const { data, mutate: refreshState } = useSWR(
    `/api/game/state?gameId=${gameId}`,
    fetcher,
    { refreshInterval: 1500 }
  )
  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const timerRef = useRef(null)
  const prevQuestionRef = useRef(-1)

  const game = data?.game || null
  const quiz = data?.quiz || null

  const currentQuestion =
    game && quiz && game.status === "started" && game.currentQuestion >= 0
      ? quiz.questions[game.currentQuestion] || null
      : null

  useEffect(() => {
    if (game?.status !== "started" || !currentQuestion) return
    if (game.currentQuestion !== prevQuestionRef.current) {
      prevQuestionRef.current = game.currentQuestion
      setCountdown(currentQuestion.timeLimit)
    }
  }, [game?.status, game?.currentQuestion, currentQuestion?.timeLimit])

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
    async (action) => {
      const resolvedGameId = game?.id || gameId
      if (!resolvedGameId) return

      const response = await fetch("/api/game/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: resolvedGameId, action }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        console.error("Game control failed:", payload?.error || response.statusText)
        return
      }

      refreshState()
    },
    [game?.id, gameId, refreshState]
  )

  if (!game || !quiz) {
    return (
      <div className="flex justify-center py-12">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

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
          <button onClick={onEnd} className={buttonDefault}>Back to Dashboard</button>
        </div>
      </div>
    )
  }

  if (game.status === "waiting") {
    return (
      <div className="flex flex-col gap-6 items-center">
        <div className="w-full max-w-md text-center rounded-xl border bg-card text-card-foreground shadow">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-xl font-semibold leading-none tracking-tight">{quiz.title}</h3>
            <p className="text-sm text-muted-foreground">Share this PIN with your students</p>
          </div>
          <div className="p-6 pt-0 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-5xl font-bold tracking-[0.3em] font-mono text-foreground">
                {game.pin}
              </span>
              <button className={`${buttonGhost} h-9 w-9 p-0`} onClick={handleCopy}>
                {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md rounded-xl border bg-card text-card-foreground shadow">
          <div className="flex flex-col space-y-1.5 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold leading-none tracking-tight flex items-center gap-2">
                <Users className="size-4" />
                Players ({game.players.length})
              </h3>
            </div>
          </div>
          <div className="p-6 pt-0">
            {game.players.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Waiting for players to join...
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {game.players.map((p) => (
                  <span key={p.id} className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                    {p.nickname}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button className={buttonOutline} onClick={onEnd}>
            Cancel
          </button>
          <button
            onClick={() => handleControl("start")}
            disabled={game.players.length === 0}
            className={`${buttonDefault} gap-2`}
          >
            <Play className="size-4" />
            Start Game ({game.players.length} players)
          </button>
        </div>
      </div>
    )
  }

  const questionNum = game.currentQuestion + 1
  const totalQuestions = quiz.questions.length
  const timePercent = currentQuestion
    ? ((countdown || 0) / currentQuestion.timeLimit) * 100
    : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
            {questionNum} / {totalQuestions}
          </span>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="size-4" />
            {game.players.length} players
          </div>
        </div>
        <div className="flex items-center gap-2">
          {questionNum < totalQuestions ? (
            <button className={`${buttonDefault} ${buttonSm} gap-1`} onClick={() => handleControl("next")}>
              <SkipForward className="size-4" />
              Next
            </button>
          ) : (
            <button className={`${buttonDefault} ${buttonSm} gap-1`} onClick={() => handleControl("end")}>
              <Square className="size-4" />
              End Game
            </button>
          )}
        </div>
      </div>

      {currentQuestion && (
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="flex flex-col space-y-1.5 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold leading-none tracking-tight">{currentQuestion.text}</h3>
              <div className="flex items-center gap-1 text-lg font-bold text-foreground">
                <Timer className="size-5" />
                {countdown ?? 0}s
              </div>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-full flex-1 bg-primary transition-all" style={{ transform: `translateX(-${100 - timePercent}%)` }} />
            </div>
          </div>
          <div className="p-6 pt-0">
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
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-base font-semibold leading-none tracking-tight">Live Leaderboard</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="flex flex-col gap-2">
            {[...game.players]
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 py-1.5">
                  <span className="flex items-center justify-center size-6 rounded-full bg-muted font-bold text-xs text-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-foreground">{p.nickname}</span>
                  <span className="text-xs text-muted-foreground tabular-nums min-w-16 text-right">
                    {Number.isFinite(p.lastResponseTimeMs) ? `${(p.lastResponseTimeMs / 1000).toFixed(2)}s` : "--"}
                  </span>
                  <span className="text-sm font-bold text-foreground tabular-nums">{p.score.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
