import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { withGameLock } from "@/lib/game-lock";
import { randomUUID } from "node:crypto";

export async function POST(req) {
    try {
        const { pin, nickname } = await req.json();
        if (!pin || !nickname) {
            return NextResponse.json({ error: "PIN and nickname are required" }, { status: 400 });
        }

        const gameId = await redis.get(`game:pin:${pin}`);
        if (!gameId) {
            return NextResponse.json({ error: "Invalid game PIN" }, { status: 404 });
        }

        const result = await withGameLock(gameId, async () => {
            const gameData = await redis.get(`game:${gameId}`);
            if (!gameData) {
                return { status: 404, body: { error: "Game not found" } };
            }

            const game = typeof gameData === "string" ? JSON.parse(gameData) : gameData;
            if (game.status !== "waiting") {
                return { status: 400, body: { error: "Game has already started" } };
            }

            const hasDuplicate = game.players.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase());
            if (hasDuplicate) {
                return { status: 409, body: { error: "Nickname already taken" } };
            }

            const playerId = randomUUID();
            const player = {
                id: playerId,
                nickname,
                score: 0,
                lastResponseTimeMs: null,
                joinedAt: new Date().toISOString(),
            };

            game.players.push(player);
            await redis.set(`game:${gameId}`, JSON.stringify(game), { ex: 86400 });
            return { status: 200, body: { success: true, playerId, gameId } };
        });

        return NextResponse.json(result.body, { status: result.status });
    }
    catch (error) {
        console.error("Join game error:", error);
        const status = error?.message === "Game is busy, please retry" ? 409 : 500;
        return NextResponse.json({ error: status === 409 ? "Game is busy, please retry" : "Internal server error" }, { status });
    }
}
