import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const gameId = searchParams.get("gameId");
        if (!gameId) {
            return NextResponse.json({ error: "gameId required" }, { status: 400 });
        }
        const gameData = await redis.get(`game:${gameId}`);
        if (!gameData) {
            return NextResponse.json({ error: "Game not found" }, { status: 404 });
        }
        const game = typeof gameData === "string" ? JSON.parse(gameData) : gameData;
        const quizData = await redis.get(`quiz:${game.quizId}`);
        const quiz = quizData
            ? typeof quizData === "string"
                ? JSON.parse(quizData)
                : quizData
            : null;
        return NextResponse.json({ game, quiz });
    }
    catch (error) {
        console.error("Game state error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
