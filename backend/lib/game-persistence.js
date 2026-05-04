import { redis } from "@/lib/redis";
import { connectToDatabase } from "@/lib/mongodb";
import { GameResult } from "@/lib/models/GameResult";
import { buildPerformanceInsight } from "@/lib/analytics-llm";
import {
  buildAnalyticsSummary,
  buildQuestionAnalytics,
} from "@/lib/question-analytics";

async function buildPlayerResults(gameId, players, totalQuestions) {
  const playerResults = [];

  for (const player of players) {
    const answers = [];

    for (let i = 0; i < totalQuestions; i++) {
      const answerData = await redis.get(
        `game:${gameId}:answer:${player.id}:${i}`,
      );
      if (answerData) {
        const parsed =
          typeof answerData === "string" ? JSON.parse(answerData) : answerData;
        answers.push(parsed);
      }
    }

    const correctCount = answers.filter((a) => a.isCorrect).length;
    const avgResponseTime =
      answers.length > 0
        ? answers.reduce((sum, a) => sum + a.responseTimeMs, 0) / answers.length
        : 0;

    playerResults.push({
      playerId: player.id,
      nickname: player.nickname,
      totalScore: player.score,
      correctCount,
      totalQuestions,
      avgResponseTime: Math.round(avgResponseTime),
      answers,
    });
  }

  playerResults.sort((a, b) => b.totalScore - a.totalScore);
  return playerResults;
}

export async function persistFinishedGameToMongo(game, quiz = null) {
  if (!game?.id || !game?.quizId || !game?.professorId) {
    throw new Error("Invalid game payload for persistence");
  }

  await connectToDatabase();

  const totalQuestions = quiz?.questions?.length || 0;
  const playerResults = await buildPlayerResults(
    game.id,
    game.players || [],
    totalQuestions,
  );

  const analyticsQuiz = {
    id: game.quizId,
    title: quiz?.title || "Quiz",
    questions: Array.isArray(quiz?.questions)
      ? quiz.questions.map((q) => ({
          text: q?.text || q?.question || "",
          options: Array.isArray(q?.options) ? q.options : ["", "", "", ""],
          correctAnswer: Number.isInteger(q?.correctAnswer)
            ? q.correctAnswer
            : null,
          timeLimit: Number.isFinite(q?.timeLimit) ? q.timeLimit : 30,
        }))
      : [],
  };

  const questionAnalytics = buildQuestionAnalytics({
    quiz: analyticsQuiz,
    playerResults,
    playersCount: Array.isArray(game?.players) ? game.players.length : 0,
  });

  const analyticsSummary = buildAnalyticsSummary(questionAnalytics);
  const llmSummary = await buildPerformanceInsight({
    quizTitle: analyticsQuiz.title,
    questionAnalytics,
  });

  const payload = {
    gameId: game.id,
    pin: game.pin,
    quizId: game.quizId,
    quizTitle: quiz?.title || "",
    professorId: game.professorId,
    status: game.status || "finished",
    questionCount: totalQuestions,
    createdAt: new Date(game.createdAt || Date.now()),
    finishedAt: new Date(game.finishedAt || Date.now()),
    players: (game.players || []).map((player) => ({
      id: player.id,
      nickname: player.nickname,
      score: player.score || 0,
      joinedAt: new Date(player.joinedAt || Date.now()),
    })),
    playerResults: playerResults.map((result) => ({
      ...result,
      answers: result.answers.map((answer) => ({
        ...answer,
        submittedAt: new Date(answer.submittedAt || Date.now()),
      })),
    })),
    questionAnalytics,
    analyticsSummary,
    llmSummary,
  };

  return GameResult.findOneAndUpdate(
    { gameId: game.id },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}