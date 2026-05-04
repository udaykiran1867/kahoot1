"use client";

import useSWR from "swr";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Users,
} from "lucide-react";

const fetcher = (url) =>
  fetch(url, { cache: "no-store", credentials: "include" }).then((r) =>
    r.json(),
  );

function MetricCard({ title, value, subtitle, icon }) {
  return (
    <div className="rounded-xl border border-white/55 bg-white/90 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">{icon}</div>
      </div>
    </div>
  );
}

function OptionBar({ option, isCorrect }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span
          className={`font-medium ${isCorrect ? "text-emerald-700" : "text-slate-700"}`}
        >
          {option.label}. {option.text || "(empty option)"}
        </span>
        <span className="text-slate-500">
          {option.count} ({option.pct}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${isCorrect ? "bg-emerald-500" : "bg-indigo-400"}`}
          style={{ width: `${Math.max(0, Math.min(100, option.pct || 0))}%` }}
        />
      </div>
    </div>
  );
}

function RecommendationItem({ item, index }) {
  if (typeof item === "string") {
    return <li>{item}</li>;
  }

  const topic = item?.topic || `Topic ${index + 1}`;
  const subtopics = Array.isArray(item?.subtopics) ? item.subtopics : [];
  const target = item?.target || "";

  return (
    <li className="rounded-lg border border-slate-200 bg-white/70 p-3">
      <p className="text-sm font-semibold text-slate-900">Topic: {topic}</p>
      {subtopics.length > 0 ? (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
          {subtopics.map((subtopic, subtopicIdx) => (
            <li key={`sub-${index}-${subtopicIdx}`}>{subtopic}</li>
          ))}
        </ul>
      ) : null}
      {target ? <p className="mt-2 text-xs text-slate-500">{target}</p> : null}
    </li>
  );
}

export function ProfessorGameSummary({ gameId }) {
  const { data, error, isLoading } = useSWR(
    gameId ? `/api/game/analytics?gameId=${encodeURIComponent(gameId)}` : null,
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      </div>
    );
  }

  if (error || data?.error) {
    const status = error?.status || null;
    const message =
      data?.error ||
      (status === 401
        ? "Please login as a professor"
        : status === 403
          ? "Only the quiz owner professor can view this summary"
          : status === 404
            ? "Finished game not found"
            : status === 409
              ? "Summary appears only after quiz ends"
              : "Failed to load game analytics");

    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5" />
          <div>
            <h2 className="text-lg font-semibold">Analytics unavailable</h2>
            <p className="mt-1 text-sm">{message}</p>
          </div>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const llmSummary = data?.llmSummary || null;
  const questionAnalytics = data?.questionAnalytics || [];
  const unansweredQuestions = questionAnalytics.filter(
    (q) => Number(q?.unansweredCount) > 0,
  );
  const title = data?.quiz?.title || "Quiz";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/55 bg-white/90 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Professor Summary Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Game ID: {data?.game?.id}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Questions"
          value={summary.questionCount ?? 0}
          icon={<BarChart3 className="size-4" />}
        />
        <MetricCard
          title="Average Accuracy"
          value={`${summary.avgAccuracyPct ?? 0}%`}
          icon={<CheckCircle2 className="size-4" />}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${summary.avgResponseTimeMs ?? 0} ms`}
          icon={<Clock3 className="size-4" />}
        />
        <MetricCard
          title="Hardest Question"
          value={
            Number.isInteger(summary.hardestQuestionIndex)
              ? `Q${summary.hardestQuestionIndex + 1}`
              : "N/A"
          }
          icon={<Users className="size-4" />}
        />
      </section>

      {llmSummary ? (
        <section className="rounded-2xl border border-white/55 bg-white/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            AI Teaching Insight
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {llmSummary.briefSummary}
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Difficult Topics
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {(llmSummary.difficultTopics || []).length === 0 ? (
                  <li>No major difficulty detected.</li>
                ) : (
                  (llmSummary.difficultTopics || []).map((item, idx) => (
                    <li key={`d-${idx}`}>
                      <span className="font-semibold">
                        {item.questionLabel ||
                          `Q${(item.questionIndex ?? 0) + 1}`}
                        :{" "}
                      </span>
                      <span>{item.topic || "Topic not specified"}</span>
                      {item.reason ? (
                        <span className="text-slate-500"> - {item.reason}</span>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Moderately Understood Topics
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {(llmSummary.moderatelyUnderstoodTopics || []).length === 0 ? (
                  <li>No moderate topics in this quiz.</li>
                ) : (
                  (llmSummary.moderatelyUnderstoodTopics || []).map(
                    (item, idx) => (
                      <li key={`m-${idx}`}>
                        <span className="font-semibold">
                          {item.questionLabel ||
                            `Q${(item.questionIndex ?? 0) + 1}`}
                          :{" "}
                        </span>
                        <span>{item.topic || "Topic not specified"}</span>
                        {item.reason ? (
                          <span className="text-slate-500">
                            {" "}
                            - {item.reason}
                          </span>
                        ) : null}
                      </li>
                    ),
                  )
                )}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Clear Topics
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {(llmSummary.clearTopics || []).length === 0 ? (
                  <li>No clear-topic highlights available.</li>
                ) : (
                  (llmSummary.clearTopics || []).map((item, idx) => (
                    <li key={`c-${idx}`}>
                      <span className="font-semibold">
                        {item.questionLabel ||
                          `Q${(item.questionIndex ?? 0) + 1}`}
                        :{" "}
                      </span>
                      <span>{item.topic || "Topic not specified"}</span>
                      {item.reason ? (
                        <span className="text-slate-500"> - {item.reason}</span>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Questions With No Responses
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {unansweredQuestions.length === 0 ? (
                <li>All questions were attempted.</li>
              ) : (
                unansweredQuestions.map((q) => (
                  <li key={`u-${q.questionIndex}`}>
                    <span className="font-semibold">
                      Q{q.questionIndex + 1}:{" "}
                    </span>
                    <span>
                      {q.unansweredCount}{" "}
                      {q.unansweredCount === 1 ? "student" : "students"} did not
                      answer
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Recommended Next Steps
            </h3>
            <ul className="mt-2 space-y-3 text-sm text-slate-700">
              {(llmSummary.recommendations || []).map((item, idx) => (
                <RecommendationItem key={`r-${idx}`} item={item} index={idx} />
              ))}
            </ul>
          </div>
        </section>
      ) : null}
      <section className="space-y-4">
        {questionAnalytics.map((q) => (
          <article
            key={q.questionIndex}
            className="rounded-2xl border border-white/55 bg-white/90 p-5 shadow-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Q{q.questionIndex + 1}
                </h2>
                <p className="text-sm text-slate-600">
                  {q.questionText || "Question text unavailable"}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Accuracy: {q.accuracyPct}%</p>
                <p>
                  Correct: {q.correctResponses}/{q.totalResponses}
                </p>
                <p>Avg time: {q.avgResponseTimeMs} ms</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Answered" value={q.totalResponses} />
              <MetricCard title="Unanswered" value={q.unansweredCount} />
              <MetricCard title="Correct" value={q.correctResponses} />
              <MetricCard title="Avg Score" value={q.avgScore} />
            </div>

            <div className="mt-4 space-y-2">
              {(q.optionStats || []).map((option) => (
                <OptionBar
                  key={`${q.questionIndex}-${option.index}`}
                  option={option}
                  isCorrect={option.index === q.correctAnswerIndex}
                />
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}