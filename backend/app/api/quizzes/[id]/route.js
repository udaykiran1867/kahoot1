import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Quiz } from "@/lib/models/Quiz";
export const dynamic = "force-dynamic";

const IMAGE_DATA_URL_REGEX = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const MAX_IMAGE_DATA_URL_LENGTH = 2_800_000;

function sanitizeImageDataUrl(value) {
    if (typeof value !== "string") {
        return "";
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }
    if (!IMAGE_DATA_URL_REGEX.test(trimmed)) {
        return "";
    }
    if (trimmed.length > MAX_IMAGE_DATA_URL_LENGTH) {
        return "";
    }
    return trimmed;
}

function sanitizeOptionImages(optionImages) {
    return Array.from({ length: 4 }, (_, index) => {
        if (!Array.isArray(optionImages)) {
            return "";
        }
        return sanitizeImageDataUrl(optionImages[index]);
    });
}

export async function PUT(req, { params }) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { title, questions } = await req.json();

        if (typeof title !== "string" || !title.trim()) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }
        if (!Array.isArray(questions) || questions.length === 0) {
            return NextResponse.json({ error: "Title and questions are required" }, { status: 400 });
        }

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (typeof q?.text !== "string" || !q.text.trim()) {
                return NextResponse.json({ error: `Question ${i + 1} text is required` }, { status: 400 });
            }
            if (!Array.isArray(q?.options) || q.options.length !== 4 || q.options.some((opt) => typeof opt !== "string" || !opt.trim())) {
                return NextResponse.json({ error: `Question ${i + 1} requires exactly 4 filled options` }, { status: 400 });
            }
            if (!Number.isInteger(q?.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer > 3) {
                return NextResponse.json({ error: `Question ${i + 1} has invalid correct answer` }, { status: 400 });
            }
        }

        const normalizedQuestions = questions.map((q) => ({
            question: q.text.trim(),
            questionImage: sanitizeImageDataUrl(q.questionImage),
            options: q.options.map((opt) => String(opt).trim()),
            optionImages: sanitizeOptionImages(q.optionImages),
            correctAnswer: q.correctAnswer,
            timeLimit: Math.max(5, Math.min(120, parseInt(String(q.timeLimit || 30), 10) || 30)),
        }));

        await connectToDatabase();
        const updatedQuiz = await Quiz.findOneAndUpdate(
            { _id: id, createdBy: session.userId },
            {
                title: title.trim(),
                questions: normalizedQuestions,
            },
            { new: true }
        );

        if (!updatedQuiz) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        const quiz = {
            id: String(updatedQuiz._id),
            title: updatedQuiz.title,
            professorId: session.userId,
            questions: normalizedQuestions.map((q, i) => ({
                id: `q-${i}`,
                text: q.question,
                questionImage: q.questionImage,
                options: q.options,
                optionImages: q.optionImages,
                correctAnswer: q.correctAnswer,
                timeLimit: q.timeLimit,
            })),
            createdAt: updatedQuiz.createdAt?.toISOString ? updatedQuiz.createdAt.toISOString() : new Date().toISOString(),
        };

        await redis.set(`quiz:${id}`, JSON.stringify(quiz));
        await redis.sadd(`professor:${session.userId}:quizzes`, id);

        return NextResponse.json({ success: true, quiz });
    }
    catch (error) {
        console.error("Update quiz error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(_req, { params }) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectToDatabase();
        await Quiz.findOneAndDelete({ _id: id, createdBy: session.userId });
        await redis.del(`quiz:${id}`);
        await redis.srem(`professor:${session.userId}:quizzes`, id);
        return NextResponse.json({ success: true });
    }
    catch (error) {
        console.error("Delete quiz error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
