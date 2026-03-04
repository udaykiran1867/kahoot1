"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Trash2, Check } from "lucide-react"

interface QuestionDraft {
  text: string
  options: [string, string, string, string]
  correctAnswer: number
  timeLimit: number
}

interface QuizCreatorProps {
  onCreated: () => void
  onCancel: () => void
}

const OPTION_COLORS = [
  "bg-game-red text-foreground",
  "bg-game-blue text-primary-foreground",
  "bg-game-yellow text-foreground",
  "bg-game-green text-primary-foreground",
]

const OPTION_LABELS = ["A", "B", "C", "D"]

export function QuizCreator({ onCreated, onCancel }: QuizCreatorProps) {
  const [title, setTitle] = useState("")
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { text: "", options: ["", "", "", ""], correctAnswer: 0, timeLimit: 30 },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function addQuestion() {
    setQuestions([
      ...questions,
      { text: "", options: ["", "", "", ""], correctAnswer: 0, timeLimit: 30 },
    ])
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) return
    setQuestions(questions.filter((_, i) => i !== index))
  }

  function updateQuestion(index: number, field: string, value: unknown) {
    const updated = [...questions]
    if (field === "text") {
      updated[index].text = value as string
    } else if (field === "correctAnswer") {
      updated[index].correctAnswer = value as number
    } else if (field === "timeLimit") {
      updated[index].timeLimit = value as number
    }
    setQuestions(updated)
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    const updated = [...questions]
    updated[qIndex].options[oIndex] = value
    setQuestions(updated)
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Please enter a quiz title")
      return
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) {
        setError(`Question ${i + 1} needs a question text`)
        return
      }
      if (q.options.some((o) => !o.trim())) {
        setError(`Question ${i + 1} needs all four options filled`)
        return
      }
    }

    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, questions }),
      })
      if (res.ok) {
        onCreated()
      } else {
        const data = await res.json()
        setError(data.error || "Failed to create quiz")
      }
    } catch {
      setError("Failed to create quiz")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="size-5" />
        </Button>
        <h2 className="text-2xl font-bold text-foreground">Create Quiz</h2>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="quiz-title">Quiz Title</Label>
        <Input
          id="quiz-title"
          placeholder="e.g. Biology Chapter 5 Review"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg h-12"
        />
      </div>

      <div className="flex flex-col gap-4">
        {questions.map((q, qIndex) => (
          <Card key={qIndex}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Question {qIndex + 1}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor={`time-${qIndex}`} className="text-xs text-muted-foreground">
                      Time (s):
                    </Label>
                    <Input
                      id={`time-${qIndex}`}
                      type="number"
                      min={5}
                      max={120}
                      value={q.timeLimit}
                      onChange={(e) =>
                        updateQuestion(qIndex, "timeLimit", parseInt(e.target.value) || 30)
                      }
                      className="w-16 h-8 text-xs"
                    />
                  </div>
                  {questions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(qIndex)}
                      className="size-8"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                placeholder="Enter your question..."
                value={q.text}
                onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuestion(qIndex, "correctAnswer", oIndex)}
                      className={`shrink-0 flex items-center justify-center size-8 rounded-md text-xs font-bold transition-all ${
                        q.correctAnswer === oIndex
                          ? `${OPTION_COLORS[oIndex]} ring-2 ring-offset-2 ring-foreground`
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {q.correctAnswer === oIndex ? (
                        <Check className="size-4" />
                      ) : (
                        OPTION_LABELS[oIndex]
                      )}
                    </button>
                    <Input
                      placeholder={`Option ${OPTION_LABELS[oIndex]}`}
                      value={opt}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click a letter to mark it as the correct answer
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" className="self-center gap-2" onClick={addQuestion}>
        <Plus className="size-4" />
        Add Question
      </Button>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : `Save Quiz (${questions.length} questions)`}
        </Button>
      </div>
    </div>
  )
}
