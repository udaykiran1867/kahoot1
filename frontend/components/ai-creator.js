"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Upload,
  Brain,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

export function AiCreator({ onCreated, onCancel }) {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle"); // idle, process-upload, process-generate, reviewing
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState("Medium");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");

  const renderQuestionText = (text) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith("```")) {
        const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
        const code = match ? match[2] : part.slice(3, -3);
        return (
          <pre
            key={i}
            className="mt-3 mb-2 p-4 bg-slate-900 text-green-300 rounded-xl text-xs overflow-x-auto font-mono whitespace-pre text-left border border-slate-700"
          >
            <code>{code}</code>
          </pre>
        );
      }
      return part ? <span key={i}>{part}</span> : null;
    });
  };

  const transformQuestions = (rawMcqs) => {
    const items =
      typeof rawMcqs === "object" && !Array.isArray(rawMcqs)
        ? Object.values(rawMcqs)
        : rawMcqs;

    return items.map((q) => {
      let options = q.options || q.choices || {};

      // Extract options from various formats (object {a,b,c,d} or array)
      let optA =
        options.a || options.A || (Array.isArray(options) ? options[0] : "");
      let optB =
        options.b || options.B || (Array.isArray(options) ? options[1] : "");
      let optC =
        options.c || options.C || (Array.isArray(options) ? options[2] : "");
      let optD =
        options.d || options.D || (Array.isArray(options) ? options[3] : "");

      // Ensure no empty options
      if (!optA) optA = "Option A";
      if (!optB) optB = "Option B";
      if (!optC) optC = "Option C";
      if (!optD) optD = "Option D";

      const optionsArray = [
        String(optA),
        String(optB),
        String(optC),
        String(optD),
      ];

      const correctStr = String(
        q.correct || q.correct_answer || q.answer || "",
      ).toLowerCase();
      let correctAnswer = 0;
      if (
        correctStr.includes("a") ||
        correctStr === optionsArray[0].toLowerCase()
      )
        correctAnswer = 0;
      else if (
        correctStr.includes("b") ||
        correctStr === optionsArray[1].toLowerCase()
      )
        correctAnswer = 1;
      else if (
        correctStr.includes("c") ||
        correctStr === optionsArray[2].toLowerCase()
      )
        correctAnswer = 2;
      else if (
        correctStr.includes("d") ||
        correctStr === optionsArray[3].toLowerCase()
      )
        correctAnswer = 3;
      else {
        // Try matching by value if letter-based matching fails
        const matchedIdx = optionsArray.findIndex(
          (opt) => opt.toLowerCase() === correctStr,
        );
        if (matchedIdx !== -1) correctAnswer = matchedIdx;
      }

      return {
        text: q.mcq || q.question || "Untitled Question",
        options: optionsArray,
        correctAnswer: correctAnswer,
        timeLimit: 30,
        questionImage: "",
        optionImages: ["", "", "", ""],
      };
    });
  };

  const handleGenerate = async () => {
    if (!file && !text.trim() && !prompt.trim()) {
      setError("Please provide a file, some text content, or a prompt");
      return;
    }
    if (!quizTitle.trim()) {
      setError("Please enter a quiz title first");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("process-upload");

    try {
      // Step 1: Upload / Process (only if content was provided)
      if (file || text.trim()) {
        let uploadPayload;
        let uploadHeaders = {};

        if (file) {
          const formData = new FormData();
          formData.append("file", file);
          uploadPayload = formData;
        } else {
          uploadPayload = JSON.stringify({ text });
          uploadHeaders = { "Content-Type": "application/json" };
        }

        const uploadRes = await fetch("http://localhost:5050/api/upload", {
          method: "POST",
          headers: uploadHeaders,
          body: uploadPayload,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(
            errData.details || errData.error || "Failed to process content. Make sure AI service is running on port 5050."
          );
        }
      }

      // Step 2: Generate
      setStatus("process-generate");
      const genRes = await fetch("http://localhost:5050/api/mcq/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quizTitle,
          count: parseInt(questionCount),
          difficulty: difficulty,
          prompt: prompt.trim() || undefined,
        }),
      });

      if (!genRes.ok)
        throw new Error("Generation failed. Is the AI service running?");

      const data = await genRes.json();
      const rawQuestions = data.mcqs || data;

      const transformed = transformQuestions(rawQuestions);
      if (transformed.length === 0) {
        throw new Error("AI returned no questions. Please try more text.");
      }

      setGeneratedQuestions(transformed);
      setStatus("reviewing");
    } catch (err) {
      console.error(err);
      setError(err.message);
      setStatus("idle");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle.trim()) {
      setError("Please enter a quiz title");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Get auth token from local storage if needed, though usually handled by cookies in Next.js
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: quizTitle,
          questions: generatedQuestions,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Quiz saved successfully:", data);
        onCreated();
      } else {
        const data = await res.json();
        setError(
          data.error || "Failed to save quiz. Check if you are logged in.",
        );
      }
    } catch (err) {
      console.error("Save error:", err);
      setError("Server connection failed during save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="size-5 text-slate-600" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Brain className="size-7 text-indigo-600" />
              AI Quiz Creator
            </h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight uppercase">
              Smart RAG Integration
            </p>
          </div>
        </div>
      </div>

      {status === "idle" && (
        <div className="grid gap-6 mt-4">
          <div className="grid md:grid-cols-2 gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div
              className={`relative group rounded-3xl border-2 border-dashed transition-all p-8 flex flex-col items-center text-center gap-4 ${file ? "border-indigo-400 bg-indigo-50/30" : "border-slate-200 bg-slate-50/50 hover:border-indigo-300 hover:bg-white"}`}
            >
              <div
                className={`size-14 rounded-2xl flex items-center justify-center transition-colors ${file ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"}`}
              >
                <Upload className="size-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Document Upload
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  PDF or TXT supported
                </p>
              </div>
              <input
                type="file"
                accept=".pdf,.txt"
                onChange={(e) => {
                  setFile(e.target.files[0]);
                  setText("");
                }}
                className="hidden"
                id="ai-upload"
              />
              <label
                htmlFor="ai-upload"
                className={`px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all shadow-sm ${file ? "bg-indigo-600 text-white" : "bg-slate-900 text-white hover:bg-slate-800"}`}
              >
                {file ? "Change File" : "Select Document"}
              </label>
              {file && (
                <span className="text-[10px] font-bold text-indigo-600 truncate max-w-full px-2">
                  {file.name}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider ml-1">
                <Sparkles className="size-3 text-amber-500" /> Or Paste Content
              </h3>
              <textarea
                placeholder="Paste your study material here..."
                className="flex-1 min-h-[140px] w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all font-medium placeholder:text-slate-400"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setFile(null);
                }}
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
              <Brain className="size-3 text-indigo-500" /> Prompt / Instructions
            </label>
            <textarea
              placeholder={`Describe what you want, e.g.:\n• "Generate 5 technical, 3 code snippet, 2 debugging questions on JavaScript closures"\n• "Generate 10 questions on HTML forms for beginners"\n• Leave blank to auto-generate from your material above`}
              className="min-h-[100px] w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all font-medium placeholder:text-slate-400"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm grid gap-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wider">
                  Quiz Title
                </label>
                <input
                  placeholder="e.g., Biology Chapter 1"
                  className="h-12 w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-bold"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wider">
                  Questions
                </label>
                <div className="flex items-center gap-2 h-12 bg-slate-50/50 rounded-xl border border-slate-100 px-2">
                  <input
                    type="number"
                    value={questionCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) {
                        setQuestionCount(Math.max(1, Math.min(30, val)));
                      } else if (e.target.value === "") {
                        setQuestionCount("");
                      }
                    }}
                    onBlur={() => {
                      if (questionCount === "" || questionCount < 1)
                        setQuestionCount(1);
                      if (questionCount > 30) setQuestionCount(30);
                    }}
                    className="flex-1 w-full text-center text-sm font-bold text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0"
                  />
                  <button
                    onClick={() =>
                      setQuestionCount(
                        Math.min(30, (parseInt(questionCount) || 0) + 1),
                      )
                    }
                    className="size-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <span className="text-lg font-bold text-slate-600">+</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wider">
                  Difficulty
                </label>
                <div className="relative">
                  <select
                    className="h-12 w-full appearance-none rounded-xl border border-slate-100 bg-slate-50/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-bold cursor-pointer"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 text-red-600 text-[13px] flex items-center gap-3 border border-red-100 font-bold animate-in zoom-in-95 duration-200">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              className="h-14 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg mt-2 disabled:opacity-50"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Sparkles className="size-5 text-amber-300" />
              )}
              Generate  Quiz
            </button>
          </div>
        </div>
      )}

      {(status === "process-upload" || status === "process-generate") && (
        <div className="py-24 flex flex-col items-center gap-8 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="relative">
            <div className="size-28 rounded-full border-[5px] border-indigo-50 border-t-indigo-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="size-12 text-indigo-600 animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {status === "process-upload"
                ? "Reading Your Material..."
                : "Crafting Perfect MCQs..."}
            </h3>
            <p className="text-slate-500 font-semibold max-w-xs mt-3 leading-relaxed text-sm">
              Please wait while our AI drafts your {questionCount} {difficulty}{" "}
              questions.
            </p>
          </div>
        </div>
      )}

      {status === "reviewing" && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="flex items-center justify-between p-6 bg-slate-900 rounded-[2rem] shadow-xl text-white">
            <div>
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-1">
                Generated Successfully
              </p>
              <h3 className="text-lg font-bold">Review Your Quiz</h3>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStatus("idle")}
                className="px-5 py-2.5 text-xs font-bold bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10"
              >
                Discard
              </button>
              <button
                onClick={handleSaveQuiz}
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Finish & Save
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {generatedQuestions.map((q, idx) => (
              <div
                key={idx}
                className="p-6 rounded-[2rem] border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex gap-5">
                  <div className="size-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-base font-black text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-slate-800 mb-6 mt-1 leading-snug">
                      {renderQuestionText(q.text)}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between font-bold text-xs ${
                            q.correctAnswer === oIdx
                              ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                              : "bg-slate-50 border-slate-50 text-slate-500"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`size-6 rounded-lg flex items-center justify-center text-[10px] ${q.correctAnswer === oIdx ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            {opt}
                          </div>
                          {q.correctAnswer === oIdx && (
                            <Check className="size-3" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}