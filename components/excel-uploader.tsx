"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, AlertCircle, CheckCircle2, Loader2, ArrowLeft, Download } from "lucide-react"

interface ImportedQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

interface ExcelUploaderProps {
  onSuccess?: (quizId: string, questions: ImportedQuestion[]) => void
  onCancel: () => void
}

const OPTION_LABELS = ["A", "B", "C", "D"]

export function ExcelUploader({ onSuccess, onCancel }: ExcelUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [importedQuestions, setImportedQuestions] = useState<ImportedQuestion[]>([])
  const [quizId, setQuizId] = useState("")
  const [dragActive, setDragActive] = useState(false)

  function validateFile(f: File): boolean {
    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
      setError("File must be an Excel file (.xlsx or .xls)")
      return false
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB")
      return false
    }
    return true
  }

  function handleFileSelect(f: File) {
    if (validateFile(f)) {
      setFile(f)
      setError("")
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f) {
      handleFileSelect(f)
    }
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select a file")
      return
    }
    if (!title.trim()) {
      setError("Please enter a quiz title")
      return
    }

    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title)

      const res = await fetch("/api/upload-quiz", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to upload quiz")
        return
      }

      setSuccess(true)
      setQuizId(data.quizId)
      setImportedQuestions(data.importedQuestions || [])

      if (onSuccess) {
        onSuccess(data.quizId, data.importedQuestions || [])
      }
    } catch (err) {
      setError(String(err) || "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  // Success screen showing imported questions
  if (success) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <CardTitle>Quiz Imported Successfully!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-800">
              ✓ Successfully imported {importedQuestions.length} question{importedQuestions.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Imported Questions Preview:</h3>
            <div className="max-h-96 overflow-y-auto space-y-4">
              {importedQuestions.map((q, idx) => (
                <div key={idx} className="border rounded-lg p-4 bg-slate-50">
                  <p className="font-medium mb-3">
                    Q{idx + 1}: {q.question}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((option, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-2 rounded text-sm ${
                          oIdx === q.correctAnswer
                            ? "bg-green-200 border border-green-400 font-semibold"
                            : "bg-slate-200 border border-slate-300"
                        }`}
                      >
                        <span className="font-bold">{OPTION_LABELS[oIdx]}.</span> {option}
                        {oIdx === q.correctAnswer && " ✓"}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => {
                setSuccess(false)
                setFile(null)
                setTitle("")
                setImportedQuestions([])
              }}
              className="flex-1"
            >
              Import Another Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Upload form
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Import Quiz from Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 font-medium mb-2">Excel Format Required:</p>
          <p className="text-sm text-blue-800">
            Your Excel file should have columns: <code className="bg-blue-100 px-1 rounded">Question</code>, 
            <code className="bg-blue-100 px-1 rounded ml-1">Option A</code>, 
            <code className="bg-blue-100 px-1 rounded ml-1">Option B</code>, 
            <code className="bg-blue-100 px-1 rounded ml-1">Option C</code>, 
            <code className="bg-blue-100 px-1 rounded ml-1">Option D</code>, 
            <code className="bg-blue-100 px-1 rounded ml-1">Correct Option</code>
          </p>
          <p className="text-sm text-blue-800 mt-2">
            Example: "What is 2+2?" | "2" | "3" | "4" | "5" | "C"
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-3"
          >
            <a href="/api/download-template" download="quiz_template.xlsx">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </a>
          </Button>
        </div>

        {/* Quiz Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Quiz Title</Label>
          <Input
            id="title"
            placeholder="Enter quiz title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* File Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 bg-slate-50 hover:border-slate-400"
          } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => !loading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
            disabled={loading}
          />

          <div className="flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-slate-400" />
            <div>
              <p className="font-medium text-slate-900">
                {file ? file.name : "Drag and drop your Excel file here"}
              </p>
              <p className="text-sm text-slate-500">or click to browse</p>
            </div>
          </div>
        </div>

        {/* File Info */}
        {file && (
          <div className="bg-slate-100 rounded-lg p-3">
            <p className="text-sm text-slate-700">
              <span className="font-medium">Selected:</span> {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button onClick={onCancel} variant="outline" className="flex-1" disabled={loading}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || !title.trim() || loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Quiz
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
