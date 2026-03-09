"use client"

import useSWR from "swr"
import { Users, Trophy, Clock } from "lucide-react"

const fetcher = (url) => fetch(url).then((r) => r.json())

export function GameHistory() {
  const { data, isLoading } = useSWR("/api/game/history", fetcher)

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const history = data?.history || []

  if (history.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-foreground">Game History</h2>
        <div className="rounded-xl border bg-card text-card-foreground shadow py-12">
          <div className="p-6 pt-0 flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-muted p-4">
              <Clock className="size-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">No game history</h3>
              <p className="text-sm text-muted-foreground">
                Completed games will appear here
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-foreground">Game History</h2>
      <div className="flex flex-col gap-4">
        {history.map((entry) => (
          <div key={entry.game.id} className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="flex flex-col space-y-1.5 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold leading-none tracking-tight">
                    {entry.quiz?.title || "Unknown Quiz"}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {entry.playerCount} players
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(entry.game.createdAt).toLocaleDateString()}
                    </span>
                  </p>
                </div>
                <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                  PIN: {entry.game.pin}
                </span>
              </div>
            </div>
            {entry.topPlayer && (
              <div className="p-6 pt-0">
                <div className="flex items-center gap-2 text-sm">
                  <Trophy className="size-4 text-game-yellow" />
                  <span className="text-muted-foreground">Winner:</span>
                  <span className="font-medium text-foreground">{entry.topPlayer}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
