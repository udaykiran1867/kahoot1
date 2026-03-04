import { utils, write } from "xlsx"

export interface QuizExcelRow {
  Question: string
  "Option A": string
  "Option B": string
  "Option C": string
  "Option D": string
  "Correct Option": "A" | "B" | "C" | "D"
}

/**
 * Generates a sample Excel template for quiz import
 * Users can download this and fill in their quiz questions
 */
export function generateExcelTemplate(): void {
  const sampleData: QuizExcelRow[] = [
    {
      Question: "What is the capital of France?",
      "Option A": "London",
      "Option B": "Berlin",
      "Option C": "Paris",
      "Option D": "Madrid",
      "Correct Option": "C",
    },
    {
      Question: "What is 2 + 2?",
      "Option A": "2",
      "Option B": "3",
      "Option C": "4",
      "Option D": "5",
      "Correct Option": "C",
    },
    {
      Question: "Which planet is closest to the sun?",
      "Option A": "Venus",
      "Option B": "Mercury",
      "Option C": "Mars",
      "Option D": "Earth",
      "Correct Option": "B",
    },
  ]

  const worksheet = utils.json_to_sheet(sampleData)

  // Set column widths
  worksheet["!cols"] = [
    { wch: 40 }, // Question
    { wch: 20 }, // Option A
    { wch: 20 }, // Option B
    { wch: 20 }, // Option C
    { wch: 20 }, // Option D
    { wch: 15 }, // Correct Option
  ]

  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, worksheet, "Questions")

  // Generate download
  return write(workbook, { bookType: "xlsx", type: "buffer" })
}

/**
 * Validates the structure of an Excel file for quiz import
 */
export function validateExcelStructure(headers: string[]): {
  valid: boolean
  missingColumns?: string[]
} {
  const requiredColumns = ["Question", "Option A", "Option B", "Option C", "Option D", "Correct Option"]
  const missingColumns = requiredColumns.filter((col) => !headers.includes(col))

  return {
    valid: missingColumns.length === 0,
    missingColumns: missingColumns.length > 0 ? missingColumns : undefined,
  }
}
