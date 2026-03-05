import mongoose, { Schema } from "mongoose"

export const QuestionSchema = new Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true, minlength: 4, maxlength: 4 },
  correctAnswer: { type: Number, required: true, min: 0, max: 3 },
  timeLimit: { type: Number, required: true, min: 5, max: 120, default: 30 },
})

const quizSchema = new Schema(
  {
    title: { type: String, required: true },
    createdBy: { type: String, required: true },
    questions: { type: [QuestionSchema], required: true, default: [] },
  },
  { timestamps: true }
)

export const Quiz = mongoose.models.Quiz || mongoose.model("Quiz", quizSchema)
