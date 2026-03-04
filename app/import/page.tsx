"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ExcelUploader } from "@/components/excel-uploader"
import { QuizCreator } from "@/components/quiz-creator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Plus, ArrowLeft } from "lucide-react"

type ImportMode = "choose" | "excel" | "manual"

export default function ImportPage() {
  const router = useRouter()
  const [mode, setMode] = useState<ImportMode>("choose")

  function handleBackToDashboard() {
    router.back()
  }

  if (mode === "excel") {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <Button
            onClick={() => setMode("choose")}
            variant="ghost"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <ExcelUploader
            onSuccess={() => {
              setTimeout(() => handleBackToDashboard(), 2000)
            }}
            onCancel={() => setMode("choose")}
          />
        </div>
      </div>
    )
  }

  if (mode === "manual") {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <Button
            onClick={() => setMode("choose")}
            variant="ghost"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <QuizCreator
            onCreated={() => {
              handleBackToDashboard()
            }}
            onCancel={() => setMode("choose")}
          />
        </div>
      </div>
    )
  }

  // Choose mode
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto pt-16">
        <div className="mb-8">
          <Button
            onClick={handleBackToDashboard}
            variant="ghost"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Create Quiz</h1>
          <p className="text-slate-600">Choose how you want to create your quiz</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Excel Import Option */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setMode("excel")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-lg p-3">
                  <Upload className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Import from Excel</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Upload an Excel file (.xlsx) with your quiz questions and answers
              </p>
              <div className="bg-slate-50 rounded p-3 text-xs text-slate-700">
                <p className="font-semibold mb-2">Format Required:</p>
                <p>Question | Option A | Option B | Option C | Option D | Correct Option</p>
              </div>
              <Button className="w-full" onClick={() => setMode("excel")}>
                <Upload className="w-4 h-4 mr-2" />
                Import Excel
              </Button>
            </CardContent>
          </Card>

          {/* Manual Creation Option */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setMode("manual")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-lg p-3">
                  <Plus className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Create Manually</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Create your quiz questions manually through our easy-to-use form
              </p>
              <div className="bg-slate-50 rounded p-3 text-xs text-slate-700">
                <p className="font-semibold mb-2">Features:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Add questions one by one</li>
                  <li>Set time limits</li>
                  <li>Preview before saving</li>
                </ul>
              </div>
              <Button className="w-full" onClick={() => setMode("manual")}>
                <Plus className="w-4 h-4 mr-2" />
                Create Manually
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
