"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { GraduationCap, Users, ArrowRight, Zap } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [showJoin, setShowJoin] = useState(false)
  const [pin, setPin] = useState("")
  const [nickname, setNickname] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleJoin() {
    if (!pin || !nickname) {
      setError("Please enter both PIN and nickname")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, nickname }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        return
      }
      router.push(`/play/${data.gameId}?playerId=${data.playerId}&nickname=${encodeURIComponent(nickname)}`)
    } catch {
      setError("Failed to join game")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-3 mb-10">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary p-3">
            <Zap className="size-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl text-balance">
            QuizBlitz
          </h1>
        </div>
        <p className="text-muted-foreground text-lg text-center max-w-md text-pretty">
          Create and play real-time quizzes with your class. Fast, fun, and engaging.
        </p>
      </div>

      {!showJoin ? (
        <div className="flex flex-col gap-4 w-full max-w-sm md:flex-row md:max-w-2xl">
          <Card
            className="flex-1 cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1"
            onClick={() => setShowJoin(true)}
          >
            <CardHeader className="items-center text-center">
              <div className="rounded-full bg-accent/20 p-4 mb-2">
                <Users className="size-8 text-accent" />
              </div>
              <CardTitle className="text-xl">I&#39;m a Student</CardTitle>
              <CardDescription>Join a quiz using a game PIN</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button variant="outline" className="gap-2">
                Join Game <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>

          <Card
            className="flex-1 cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1"
            onClick={() => router.push("/auth/login")}
          >
            <CardHeader className="items-center text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-2">
                <GraduationCap className="size-8 text-primary" />
              </div>
              <CardTitle className="text-xl">I&#39;m a Professor</CardTitle>
              <CardDescription>Create quizzes and host games</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button className="gap-2">
                Get Started <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Join a Game</CardTitle>
            <CardDescription>Enter the PIN shown on screen</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input
              placeholder="Game PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={6}
              className="text-center text-2xl tracking-widest h-14 font-mono"
              inputMode="numeric"
            />
            <Input
              placeholder="Your Nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              className="text-center h-12"
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowJoin(false)
                  setError("")
                }}
              >
                Back
              </Button>
              <Button className="flex-1" onClick={handleJoin} disabled={loading}>
                {loading ? "Joining..." : "Join"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
