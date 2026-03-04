export function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function calculateScore(
  isCorrect: boolean,
  responseTimeMs: number,
  timeLimitMs: number
): number {
  if (!isCorrect) return 0
  const BASE_SCORE = 1000
  const ratio = Math.max(0, 1 - responseTimeMs / timeLimitMs)
  const speedBonus = Math.round(ratio * 500)
  return BASE_SCORE + speedBonus
}

export interface Question {
  id: string
  text: string
  options: [string, string, string, string]
  correctAnswer: number
  timeLimit: number
}

export interface Quiz {
  id: string
  title: string
  professorId: string
  questions: Question[]
  createdAt: string
}

export interface GameSession {
  id: string
  quizId: string
  pin: string
  professorId: string
  status: "waiting" | "started" | "finished"
  currentQuestion: number
  players: PlayerInfo[]
  createdAt: string
}

export interface PlayerInfo {
  id: string
  nickname: string
  score: number
  joinedAt: string
}

export interface PlayerAnswer {
  playerId: string
  questionIndex: number
  answerIndex: number
  responseTimeMs: number
  score: number
  isCorrect: boolean
  submittedAt: string
}
