import mongoose, { Schema, Document } from "mongoose"

export interface QuestionSchema {
  question: string
  options: string[]
  correctAnswer: number
}

export interface QuizSchema extends Document {
  title: string
  createdBy: string
  questions: QuestionSchema[]
  createdAt: Date
  updatedAt: Date
}

const QuestionSchema = new Schema<QuestionSchema>({
  question: { type: String, required: true },
  options: { type: [String], required: true, minlength: 4, maxlength: 4 },
  correctAnswer: { type: Number, required: true, min: 0, max: 3 },
})

const quizSchema = new Schema<QuizSchema>(
  {
    title: { type: String, required: true },
    createdBy: { type: String, required: true },
    questions: { type: [QuestionSchema], required: true, default: [] },
  },
  { timestamps: true }
)

export const Quiz = mongoose.models.Quiz || mongoose.model<QuizSchema>("Quiz", quizSchema)
