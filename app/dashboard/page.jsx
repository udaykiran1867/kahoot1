"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { Zap, Plus, LogOut, History, Trash2, Play, Download, Upload, Clock } from "lucide-react";
import { QuizCreator } from "@/components/quiz-creator";
import { GameLobby } from "@/components/game-lobby";
import { GameHistory } from "@/components/game-history";
const buttonBase = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2";
const buttonDefault = `${buttonBase} bg-primary text-primary-foreground shadow hover:bg-primary/90`;
const buttonOutline = `${buttonBase} border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground`;
const buttonGhost = `${buttonBase} hover:bg-accent hover:text-accent-foreground shadow-none`;
const buttonSm = "h-8 rounded-md px-3 text-xs";
const fetcher = (url) => fetch(url, { cache: "no-store" }).then((r) => r.json());

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function DashboardPage() {
    const router = useRouter();
    const { data: authData, isLoading: authLoading } = useSWR("/api/auth/me", fetcher);
    const { data: quizData, isLoading: quizLoading } = useSWR("/api/quizzes", fetcher);
    const [view, setView] = useState("list");
    const [activeGameId, setActiveGameId] = useState(null);
    const [importError, setImportError] = useState("");
    useEffect(() => {
        if (!authLoading && !authData?.user) {
            router.push("/auth/login");
        }
    }, [authData, authLoading, router]);
    const handleLogout = useCallback(async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
    }, [router]);
    const handleDeleteQuiz = useCallback(async (quizId) => {
        await fetch(`/api/quizzes/${quizId}`, { method: "DELETE" });
        mutate("/api/quizzes");
    }, []);
    const handleStartGame = useCallback(async (quizId) => {
        const res = await fetch("/api/game/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quizId }),
        });
        const data = await res.json();
        if (res.ok) {
            setActiveGameId(data.game.id);
            setView("lobby");
        }
    }, []);
    const handleExportQuiz = useCallback((quiz) => {
        const questionBlocks = quiz.questions
            .map((q, qIndex) => {
            const questionImage = q.questionImage
                ? `<div style=\"margin:10px 0;\"><img src=\"${q.questionImage}\" style=\"max-width:560px;max-height:280px;border:1px solid #ddd;border-radius:8px;object-fit:contain;\" /></div>`
                : "";
            const optionRows = (q.options || [])
                .map((opt, oIndex) => {
                const optionImage = q.optionImages?.[oIndex]
                    ? `<img src=\"${q.optionImages[oIndex]}\" style=\"max-width:180px;max-height:120px;border:1px solid #ddd;border-radius:6px;object-fit:contain;vertical-align:middle;margin-left:8px;\" />`
                    : "";
                const isCorrect = q.correctAnswer === oIndex;
                return `<li style=\"margin:8px 0;${isCorrect ? "font-weight:700;" : ""}\">${escapeHtml(opt)} ${optionImage} ${isCorrect ? "(Correct)" : ""}</li>`;
            })
                .join("");
            return `
          <div style="margin:20px 0;padding:14px;border:1px solid #e2e2e2;border-radius:10px;">
            <h3 style="margin:0 0 8px 0;font-size:18px;">Q${qIndex + 1}. ${escapeHtml(q.text)}</h3>
            <p style="margin:0 0 8px 0;color:#444;">Time Limit: ${q.timeLimit || 30}s</p>
            ${questionImage}
            <ol type="A" style="padding-left:22px;margin:10px 0 0 0;">
              ${optionRows}
            </ol>
          </div>
        `;
        })
            .join("");
        const htmlDoc = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(quiz.title)}</title>
        </head>
        <body style="font-family:Calibri,Arial,sans-serif;padding:20px;color:#111;">
          <h1 style="margin-bottom:4px;">${escapeHtml(quiz.title)}</h1>
          <p style="margin-top:0;color:#666;">Exported on ${new Date().toLocaleString()}</p>
          ${questionBlocks}
        </body>
      </html>
    `;
        const blob = new Blob([htmlDoc], { type: "application/msword;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${quiz.title.replace(/\s+/g, "-").toLowerCase()}.doc`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);
    const handleImportQuiz = useCallback(() => {
        router.push("/import");
    }, [router]);
    if (authLoading) {
        return (<main className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin"/>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>);
    }
    if (!authData?.user)
        return null;
    const quizzes = quizData?.quizzes || [];
    return (<main className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-1.5">
              <Zap className="size-4 text-primary-foreground"/>
            </div>
            <span className="font-bold text-foreground">QuizBlitz</span>
          </div>
          <nav className="flex items-center gap-2">
            <button className={`${view === "list" || view === "create" ? buttonDefault : buttonGhost} ${buttonSm}`} onClick={() => setView("list")}>
              <Plus className="size-4"/>
              <span className="hidden sm:inline">Quizzes</span>
            </button>
            <button className={`${view === "history" ? buttonDefault : buttonGhost} ${buttonSm}`} onClick={() => setView("history")}>
              <History className="size-4"/>
              <span className="hidden sm:inline">History</span>
            </button>
            <button className={`${buttonGhost} ${buttonSm}`} onClick={handleLogout}>
              <LogOut className="size-4"/>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {view === "list" && (<div className="flex flex-col gap-6">
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
                <button className={`${buttonOutline} ${buttonSm}`} onClick={handleImportQuiz}>
                  <Upload className="size-4"/>
                  <span className="hidden sm:inline">Import</span>
                </button>
                <button className={`${buttonDefault} ${buttonSm}`} onClick={() => setView("create")}>
                  <Plus className="size-4"/>
                  Create Quiz
                </button>
              </div>
            </div>

            {importError && (<p className="text-sm text-destructive">{importError}</p>)}

            {quizLoading ? (<div className="flex justify-center py-12">
                <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin"/>
              </div>) : quizzes.length === 0 ? (<div className="rounded-xl border bg-card text-card-foreground shadow py-12">
                <div className="p-6 pt-0 flex flex-col items-center gap-4 text-center">
                  <div className="rounded-full bg-muted p-4">
                    <Plus className="size-8 text-muted-foreground"/>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">No quizzes yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Create your first quiz to get started
                    </p>
                  </div>
                  <button className={buttonDefault} onClick={() => setView("create")}>Create Quiz</button>
                </div>
              </div>) : (<div className="grid gap-4 md:grid-cols-2">
                {quizzes.map((quiz) => (<div key={quiz.id} className="group rounded-xl border bg-card text-card-foreground shadow">
                    <div className="flex flex-col space-y-1.5 p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold leading-none tracking-tight">{quiz.title}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                              {quiz.questions.length} {quiz.questions.length === 1 ? "question" : "questions"}
                            </span>
                            <span className="flex items-center gap-1 text-xs">
                              <Clock className="size-3"/>
                              {new Date(quiz.createdAt).toLocaleDateString()}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 pt-0">
                      <div className="flex gap-2">
                        <button className={`${buttonDefault} ${buttonSm} flex-1`} onClick={() => handleStartGame(quiz.id)}>
                          <Play className="size-4"/>
                          Start Game
                        </button>
                        <button className={`${buttonOutline} ${buttonSm}`} onClick={() => handleExportQuiz(quiz)}>
                          <Download className="size-4"/>
                        </button>
                        <button className={`${buttonOutline} ${buttonSm}`} onClick={() => handleDeleteQuiz(quiz.id)}>
                          <Trash2 className="size-4"/>
                        </button>
                      </div>
                    </div>
                  </div>))}
              </div>)}
          </div>)}

        {view === "create" && (<QuizCreator onCreated={() => {
                mutate("/api/quizzes");
                setView("list");
            }} onCancel={() => setView("list")}/>)}

        {view === "lobby" && activeGameId && (<GameLobby gameId={activeGameId} onEnd={() => {
                setActiveGameId(null);
                setView("list");
            }}/>)}

        {view === "history" && <GameHistory />}
      </div>
    </main>);
}
