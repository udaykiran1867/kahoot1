"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, Plus, LogOut, History, Trash2, Play, Download, Upload, Clock } from "lucide-react"
import type { Quiz } from "@/lib/game-utils"
import { QuizCreator } from "@/components/quiz-creator"
import { GameLobby } from "@/components/game-lobby"
import { GameHistory } from "@/components/game-history"

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json())

type DashView = "list" | "create" | "lobby" | "history"

export default function DashboardPage() {
  const router = useRouter()
  const { data: authData, isLoading: authLoading } = useSWR("/api/auth/me", fetcher)
  const { data: quizData, isLoading: quizLoading } = useSWR("/api/quizzes", fetcher)
  const [view, setView] = useState<DashView>("list")
  const [activeGameId, setActiveGameId] = useState<string | null>(null)
  const [importError, setImportError] = useState("")

  useEffect(() => {
    if (!authLoading && !authData?.user) {
      router.push("/auth/login")
    }
  }, [authData, authLoading, router])

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/")
  }, [router])

  const handleDeleteQuiz = useCallback(async (quizId: string) => {
    await fetch(`/api/quizzes/${quizId}`, { method: "DELETE" })
    mutate("/api/quizzes")
  }, [])

  const handleStartGame = useCallback(async (quizId: string) => {
    const res = await fetch("/api/game/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId }),
    })
    const data = await res.json()
    if (res.ok) {
      setActiveGameId(data.game.id)
      setView("lobby")
    }
  }, [])

  const handleExportQuiz = useCallback((quiz: Quiz) => {
    const exportData = {
      title: quiz.title,
      questions: quiz.questions.map((q) => ({
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        timeLimit: q.timeLimit,
      })),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${quiz.title.replace(/\s+/g, "-").toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleImportQuiz = useCallback(() => {
    router.push("/import")
  }, [router])

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  if (!authData?.user) return null

  const quizzes: Quiz[] = quizData?.quizzes || []

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-1.5">
              <Zap className="size-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">QuizBlitz</span>
          </div>
          <nav className="flex items-center gap-2">
            <Button
              variant={view === "list" || view === "create" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Quizzes</span>
            </Button>
            <Button
              variant={view === "history" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("history")}
            >
              <History className="size-4" />
              <span className="hidden sm:inline">History</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {view === "list" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Welcome, {authData.user.name}
                </h2>
                <p className="text-muted-foreground">
                  {quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"} created
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleImportQuiz}>
                  <Upload className="size-4" />
                  <span className="hidden sm:inline">Import</span>
                </Button>
                <Button size="sm" onClick={() => setView("create")}>
                  <Plus className="size-4" />
                  Create Quiz
                </Button>
              </div>
            </div>

            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}

            {quizLoading ? (
              <div className="flex justify-center py-12">
                <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : quizzes.length === 0 ? (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center gap-4 text-center">
                  <div className="rounded-full bg-muted p-4">
                    <Plus className="size-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">No quizzes yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Create your first quiz to get started
                    </p>
                  </div>
                  <Button onClick={() => setView("create")}>Create Quiz</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {quizzes.map((quiz) => (
                  <Card key={quiz.id} className="group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{quiz.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">
                              {quiz.questions.length} {quiz.questions.length === 1 ? "question" : "questions"}
                            </Badge>
                            <span className="flex items-center gap-1 text-xs">
                              <Clock className="size-3" />
                              {new Date(quiz.createdAt).toLocaleDateString()}
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => handleStartGame(quiz.id)}>
                          <Play className="size-4" />
                          Start Game
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleExportQuiz(quiz)}>
                          <Download className="size-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteQuiz(quiz.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "create" && (
          <QuizCreator
            onCreated={() => {
              mutate("/api/quizzes")
              setView("list")
            }}
            onCancel={() => setView("list")}
          />
        )}

        {view === "lobby" && activeGameId && (
          <GameLobby
            gameId={activeGameId}
            onEnd={() => {
              setActiveGameId(null)
              setView("list")
            }}
          />
        )}

        {view === "history" && <GameHistory />}
      </div>
    </main>
  )
}
