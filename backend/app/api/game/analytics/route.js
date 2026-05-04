import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { GameResult } from "@/lib/models/GameResult";
import { Quiz } from "@/lib/models/Quiz";
import { buildPerformanceInsight } from "@/lib/analytics-llm";
import {
    buildAnalyticsSummary,
    buildQuestionAnalytics,
} from "@/lib/question-analytics";

export const dynamic = "force-dynamic";

export async function GET(req) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.role !== "professor") {
            return NextResponse.json(
                { error: "Only professors can access game analytics" },
                { status: 403 },
            );
        }

        const { searchParams } = new URL(req.url);
        const gameId = searchParams.get("gameId");

        if (!gameId) {
            return NextResponse.json({ error: "gameId required" }, { status: 400 });
        }

        await connectToDatabase();

        const gameResult = await GameResult.findOne({ gameId }).lean();
        if (!gameResult) {
            return NextResponse.json(
                { error: "Finished game result not found" },
                { status: 404 },
            );
        }

        if (String(gameResult.professorId) !== String(session.userId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (gameResult.status !== "finished") {
            return NextResponse.json(
                { error: "Analytics are available only after quiz ends" },
                { status: 409 },
            );
        }

        const quizDoc = gameResult.quizId
            ? await Quiz.findById(gameResult.quizId).lean()
            : null;
        const quiz = {
            id: gameResult.quizId,
            title: gameResult.quizTitle || quizDoc?.title || "Quiz",
            questions: Array.isArray(quizDoc?.questions)
                ? quizDoc.questions.map((q) => ({
                    text: q?.question || "",
                    options: Array.isArray(q?.options) ? q.options : ["", "", "", ""],
                    correctAnswer: Number.isInteger(q?.correctAnswer)
                        ? q.correctAnswer
                        : null,
                    timeLimit: Number.isFinite(q?.timeLimit) ? q.timeLimit : 30,
                }))
                : [],
        };

        let questionAnalytics = Array.isArray(gameResult.questionAnalytics)
            ? gameResult.questionAnalytics
            : null;
        let summary = gameResult.analyticsSummary || null;
        let llmSummary = gameResult.llmSummary || null;
        const hasCurrentSummary = Number(llmSummary?.summaryVersion) >= 9;

        if (!questionAnalytics || !summary || !llmSummary || !hasCurrentSummary) {
            questionAnalytics = buildQuestionAnalytics({
                quiz,
                playerResults: gameResult.playerResults || [],
                playersCount: Array.isArray(gameResult.players)
                    ? gameResult.players.length
                    : 0,
            });

            summary = buildAnalyticsSummary(questionAnalytics);
            llmSummary = await buildPerformanceInsight({
                quizTitle: quiz.title,
                questionAnalytics,
            });

            await GameResult.updateOne(
                { gameId },
                {
                    $set: {
                        questionAnalytics,
                        analyticsSummary: summary,
                        llmSummary,
                    },
                },
            );
        }

        return NextResponse.json({
            game: {
                id: gameResult.gameId,
                pin: gameResult.pin,
                status: gameResult.status,
                createdAt: gameResult.createdAt,
                finishedAt: gameResult.finishedAt,
            },
            quiz: {
                id: quiz.id,
                title: quiz.title,
            },
            summary,
            llmSummary,
            questionAnalytics,
        });
    } catch (error) {
        console.error("Game analytics error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}