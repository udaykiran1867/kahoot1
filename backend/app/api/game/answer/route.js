import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { withGameLock } from "@/lib/game-lock";
import { calculateScore } from "@/lib/game-utils";

export async function POST(req) {
    try {
        const { gameId, playerId, questionIndex, answerIndex } = await req.json();

        const result = await withGameLock(gameId, async () => {
            const gameData = await redis.get(`game:${gameId}`);
            if (!gameData) {
                return { status: 404, body: { error: "Game not found" } };
            }

            const game = typeof gameData === "string" ? JSON.parse(gameData) : gameData;
            if (game.status !== "started") {
                return { status: 400, body: { error: "Game is not active" } };
            }

            if (game.currentQuestion !== questionIndex) {
                return { status: 400, body: { error: "Wrong question" } };
            }

            const existingAnswer = await redis.get(`game:${gameId}:answer:${playerId}:${questionIndex}`);
            if (existingAnswer) {
                return { status: 409, body: { error: "Already answered" } };
            }

            const quizData = await redis.get(`quiz:${game.quizId}`);
            if (!quizData) {
                return { status: 404, body: { error: "Quiz not found" } };
            }

            const quiz = typeof quizData === "string" ? JSON.parse(quizData) : quizData;
            const question = quiz.questions[questionIndex];
            const questionStartStr = await redis.get(`game:${gameId}:questionStart`);
            const questionStart = questionStartStr ? parseInt(questionStartStr) : Date.now();
            const responseTimeMs = Date.now() - questionStart;
            const timeLimitMs = (question.timeLimit || 30) * 1000;
            const isCorrect = answerIndex === question.correctAnswer;
            const score = calculateScore(isCorrect, responseTimeMs, timeLimitMs);
            const answer = {
                playerId,
                questionIndex,
                answerIndex,
                responseTimeMs,
                score,
                isCorrect,
                submittedAt: new Date().toISOString(),
            };

            await redis.set(`game:${gameId}:answer:${playerId}:${questionIndex}`, JSON.stringify(answer), { ex: 86400 });

            const playerIndex = game.players.findIndex((p) => p.id === playerId);
            if (playerIndex !== -1) {
                game.players[playerIndex].score += score;
                game.players[playerIndex].lastResponseTimeMs = responseTimeMs;
                await redis.set(`game:${gameId}`, JSON.stringify(game), { ex: 86400 });
            }

            return {
                status: 200,
                body: {
                    success: true,
                    isCorrect,
                    score,
                    reactionTimeMs: responseTimeMs,
                    correctAnswer: question.correctAnswer,
                    totalScore: game.players[playerIndex]?.score || 0,
                },
            };
        });

        return NextResponse.json(result.body, { status: result.status });
    }
    catch (error) {
        console.error("Submit answer error:", error);
        const status = error?.message === "Game is busy, please retry" ? 409 : 500;
        return NextResponse.json({ error: status === 409 ? "Game is busy, please retry" : "Internal server error" }, { status });
    }
}
