export function buildQuestionAnalytics({ quiz, playerResults, playersCount }) {
  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
  if (questions.length === 0) return [];

  const safePlayersCount = Math.max(Number(playersCount) || 0, 0);

  return questions.map((question, index) => {
    const text = question?.text || "";
    const options = Array.isArray(question?.options) ? question.options : [];
    const correctAnswerIndex = Number.isInteger(question?.correctAnswer) ? question.correctAnswer : -1;

    let totalResponses = 0;
    let correctResponses = 0;
    let sumResponseTimeMs = 0;
    let sumScore = 0;
    
    const optionCounts = {};
    for (let i = 0; i < options.length; i++) {
      optionCounts[i] = 0;
    }

    for (const result of playerResults) {
      const answers = Array.isArray(result.answers) ? result.answers : [];
      const answer = answers.find(a => Number(a.questionIndex) === index);

      if (answer) {
        totalResponses++;
        const ansIdx = Number(answer.answerIndex);
        if (Number.isInteger(ansIdx) && ansIdx >= 0 && ansIdx < options.length) {
          optionCounts[ansIdx] = (optionCounts[ansIdx] || 0) + 1;
        }

        if (answer.isCorrect) {
          correctResponses++;
        }
        
        sumResponseTimeMs += Number(answer.responseTimeMs) || 0;
        sumScore += Number(answer.score) || 0;
      }
    }

    const accuracyPct = totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0;
    const avgResponseTimeMs = totalResponses > 0 ? Math.round(sumResponseTimeMs / totalResponses) : 0;
    const avgScore = totalResponses > 0 ? Math.round(sumScore / totalResponses) : 0;
    const unansweredCount = Math.max(safePlayersCount - totalResponses, 0);

    const labels = ["A", "B", "C", "D", "E", "F"];
    const optionStats = options.map((optText, optIdx) => {
      const count = optionCounts[optIdx] || 0;
      const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
      return {
        index: optIdx,
        label: labels[optIdx] || String(optIdx),
        text: optText,
        count,
        pct
      };
    });

    return {
      questionIndex: index,
      questionText: text,
      correctAnswerIndex,
      totalResponses,
      unansweredCount,
      correctResponses,
      accuracyPct,
      avgScore,
      avgResponseTimeMs,
      optionStats
    };
  });
}

export function buildAnalyticsSummary(questionAnalytics) {
  const qs = Array.isArray(questionAnalytics) ? questionAnalytics : [];
  if (qs.length === 0) {
    return {
      questionCount: 0,
      avgAccuracyPct: 0,
      avgResponseTimeMs: 0,
      hardestQuestionIndex: null
    };
  }

  const questionCount = qs.length;
  let sumAccuracy = 0;
  let sumResponseTime = 0;
  let hardestIndex = null;
  let minAccuracy = 101;

  for (const q of qs) {
    sumAccuracy += q.accuracyPct || 0;
    sumResponseTime += q.avgResponseTimeMs || 0;
    
    if (typeof q.accuracyPct === 'number' && q.accuracyPct < minAccuracy) {
      minAccuracy = q.accuracyPct;
      hardestIndex = q.questionIndex;
    }
  }

  const avgAccuracyPct = Math.round(sumAccuracy / questionCount);
  const avgResponseTimeMs = Math.round(sumResponseTime / questionCount);

  return {
    questionCount,
    avgAccuracyPct,
    avgResponseTimeMs,
    hardestQuestionIndex: hardestIndex
  };
}
