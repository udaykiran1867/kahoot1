"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, Clock } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

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
        <Card className="py-12">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-muted p-4">
              <Clock className="size-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">No game history</h3>
              <p className="text-sm text-muted-foreground">
                Completed games will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-foreground">Game History</h2>
      <div className="flex flex-col gap-4">
        {history.map(
          (
            entry: {
              game: { id: string; pin: string; createdAt: string; players: { score: number }[] }
              quiz: { title: string; questions: unknown[] } | null
              playerCount: number
              topPlayer: string | null
            }
          ) => (
            <Card key={entry.game.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {entry.quiz?.title || "Unknown Quiz"}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {entry.playerCount} players
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(entry.game.createdAt).toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">PIN: {entry.game.pin}</Badge>
                </div>
              </CardHeader>
              {entry.topPlayer && (
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="size-4 text-game-yellow" />
                    <span className="text-muted-foreground">Winner:</span>
                    <span className="font-medium text-foreground">{entry.topPlayer}</span>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        )}
      </div>
    </div>
  )
}
