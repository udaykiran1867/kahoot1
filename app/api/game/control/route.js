import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { persistFinishedGameToMongo } from "@/lib/game-persistence";
export async function POST(req) {
    try {
        const { gameId, action } = await req.json();
        if (!gameId || !action) {
            return NextResponse.json({ error: "gameId and action are required" }, { status: 400 });
        }
        let resolvedGameId = gameId;
        let gameData = await redis.get(`game:${resolvedGameId}`);
        if (!gameData) {
            const mappedGameId = await redis.get(`game:pin:${gameId}`);
            if (mappedGameId) {
                resolvedGameId = mappedGameId;
                gameData = await redis.get(`game:${resolvedGameId}`);
            }
        }
        if (!gameData) {
            return NextResponse.json({ error: "Game not found" }, { status: 404 });
        }
        const game = typeof gameData === "string" ? JSON.parse(gameData) : gameData;
        const quizData = await redis.get(`quiz:${game.quizId}`);
        if (!quizData) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }
        const quiz = typeof quizData === "string" ? JSON.parse(quizData) : quizData;
        let shouldPersist = false;
        if (action === "start") {
            game.status = "started";
            game.currentQuestion = 0;
            const questionStartTime = Date.now();
            await redis.set(`game:${resolvedGameId}:questionStart`, questionStartTime.toString(), { ex: 86400 });
        }
        else if (action === "next") {
            const nextQ = game.currentQuestion + 1;
            if (nextQ >= quiz.questions.length) {
                game.status = "finished";
                game.finishedAt = new Date().toISOString();
                shouldPersist = true;
            }
            else {
                game.currentQuestion = nextQ;
                const questionStartTime = Date.now();
                await redis.set(`game:${resolvedGameId}:questionStart`, questionStartTime.toString(), { ex: 86400 });
            }
        }
        else if (action === "end") {
            game.status = "finished";
            game.finishedAt = new Date().toISOString();
            shouldPersist = true;
        }
        await redis.set(`game:${resolvedGameId}`, JSON.stringify(game), { ex: 86400 });
        let persistedToMongo = false;
        let persistenceError = null;
        if (shouldPersist) {
            try {
                await persistFinishedGameToMongo(game, quiz);
                persistedToMongo = true;
            }
            catch (mongoError) {
                console.error("Failed to persist finished game to MongoDB:", mongoError);
                persistenceError = "Game finished in Redis but failed to persist to MongoDB";
            }
        }
        return NextResponse.json({ success: true, game, quiz, persistedToMongo, persistenceError });
    }
    catch (error) {
        console.error("Game control error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
