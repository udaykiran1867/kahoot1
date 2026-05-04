const Groq = require("groq-sdk");
const axios = require("axios");
const { OpenAI } = require("openai");
const textUtils = require("../utils/textUtils");
const db = require("../utils/db");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const GENERATION_MODEL = process.env.GENERATION_MODEL || "llama-3.1-8b-instant";
const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "nomic-embed-text:latest";
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

const DIFFICULTY_PARAMS = {
  Easy: {
    label: "Easy — Basic recall and definitions",
    types:
      "definitional, factual recall, basic syntax identification, simple true/false-style reasoning",
    codeGuidance:
      "If code is needed, use only simple 1-5 line snippets with clear, obvious output. Avoid any complex logic.",
    optionGuidance:
      "Wrong options must be clearly and obviously incorrect to someone with basic knowledge. No trick answers.",
    depth:
      "Test only fundamental understanding. No edge cases, no gotchas. Every question must be straightforward.",
  },
  Medium: {
    label: "Medium — Application and comprehension",
    types:
      "application, comprehension, moderate code analysis, cause-effect reasoning, multi-step logic",
    codeGuidance:
      "Code snippets should be 5-15 lines showing moderate logic such as loops, conditionals, function calls, or simple data structures.",
    optionGuidance:
      "Wrong options should be plausible and require genuine understanding to rule out. One option must be clearly correct upon careful analysis.",
    depth:
      "Include some edge cases. Mix conceptual questions with practical application. Moderate reasoning required.",
  },
  Hard: {
    label: "Hard — Advanced reasoning, debugging, and edge cases",
    types:
      "complex code output prediction, debugging (find the bug), edge case behavior, advanced concepts, subtle type coercions, scope/closure traps, async behavior",
    codeGuidance:
      "Code snippets should be 15-30 lines involving advanced patterns: closures, prototype chains, async/await pitfalls, subtle type coercions, algorithmic edge cases, or tricky scoping.",
    optionGuidance:
      "Options must be very similar and differ only in subtle ways — e.g., outputs differ by one character, off-by-one values, very similar method names, or subtly different boolean results. Requires deep expertise.",
    depth:
      "Every question should challenge even experienced developers. Focus on common pitfalls, subtle bugs, and non-obvious behavior.",
  },
};

async function embedText(text) {
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });
      return response.data[0].embedding;
    } catch (err) {
      console.warn("OpenAI embedding failed:", err.message);
    }
  }

  try {
    const resp = await axios.post(
      `${OLLAMA_HOST}/v1/embeddings`,
      { model: EMBEDDING_MODEL, input: text },
      { headers: { "Content-Type": "application/json" }, timeout: 3000 }
    );
    return resp.data.data[0].embedding;
  } catch (err) {
    console.warn(`Ollama embedding failed, falling back to text matching`);
    return null;
  }
}

async function processTextContent(content) {
  const chunks = textUtils.chunkText(content);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embedText(chunk);
    db.addEmbedding(`${Date.now()}-${i}`, embedding, chunk);
  }
}

function buildMCQPrompt({ context, userPrompt, questionCount, difficulty }) {
  const diff = DIFFICULTY_PARAMS[difficulty] || DIFFICULTY_PARAMS["Medium"];
  const hasContext = context && context.trim().length > 0;
  const hasPrompt = userPrompt && userPrompt.trim().length > 0;

  // Scenario 1: content provided — questions must come FROM the material, prompt guides style/types
  // Scenario 2: no content — LLM uses its own knowledge, prompt fully drives topic + style
  const sourceRule =
    hasContext && hasPrompt
      ? `IMPORTANT: All questions MUST be derived from the Reference Material above. Use the User Instructions ONLY to determine question types, style, and distribution (e.g. "5 technical, 5 code snippets") — NOT to change the topic. The topic and facts must come from the Reference Material.`
      : hasContext
        ? `All questions MUST be based on the Reference Material above.`
        : `Generate questions based on the topic and instructions provided. Use your own knowledge — no reference material was provided.`;

  const contextBlock = hasContext
    ? `## Reference Material\n${context}\n\n`
    : "";
  const promptBlock = hasPrompt
    ? `## User Instructions\n${userPrompt}\n\n`
    : "";

  return `You are an expert quiz designer creating high-quality multiple choice questions.

${contextBlock}${promptBlock}## Source Rule
${sourceRule}

## Difficulty Level: ${diff.label}
- Question types: ${diff.types}
- Code guidance: ${diff.codeGuidance}
- Option style: ${diff.optionGuidance}
- Depth: ${diff.depth}

## Strict Rules
1. Generate exactly ${questionCount} questions total.
2. If the User Instructions specify a distribution (e.g. "5 technical, 3 code snippets, 2 debugging"), follow it EXACTLY in that order.
3. Every question MUST be UNIQUE — different concept, different wording, different style from all others.
4. OPTIONS must be DIVERSE across ALL questions. Do NOT reuse the same answer text, numeric values, or structural patterns between different questions. Each question's options must feel freshly crafted and specific to that question.
5. For ANY question involving code, embed the FULL code snippet INSIDE the "mcq" field using markdown triple-backtick code fences with the language name (e.g. javascript, python, html, css). The code block must appear after the question text, separated by a newline.
6. The "correct" field must contain ONLY the letter: "a", "b", "c", or "d".
7. All 4 options must be non-empty, meaningful, and relevant to the question.
8. Respond ONLY with a valid JSON object. No explanations, no markdown outside the JSON.
9. IMPORTANT: Ensure the response is strictly valid JSON. Use proper string escaping for any code snippets (do not use unescaped multi-line strings or triple quotes inside JSON values).

## Required Output Format
{
  "1": { "mcq": "question text (embed code block here if needed)", "options": { "a": "...", "b": "...", "c": "...", "d": "..." }, "correct": "a" },
  "2": { "mcq": "question text", "options": { "a": "...", "b": "...", "c": "...", "d": "..." }, "correct": "b" }
}

Generate exactly ${questionCount} entries numbered 1 through ${questionCount}.`;
}

async function callGenerationModel(prompt) {
  const completion = await groq.chat.completions.create({
    model: GENERATION_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.9,
    max_tokens: 4096,
    response_format: { type: "json_object" },
  });
  return completion.choices[0].message.content;
}

async function generate({
  text,
  userPrompt,
  query,
  questionCount = 5,
  difficulty = "Medium",
}) {
  let context = "";
  if (text) {
    // Text provided directly — use as context
    context = text;
  } else if (db.hasEmbeddings()) {
    // Embeddings exist from a previous upload — do semantic search
    const searchQuery = userPrompt || query || "general";
    const qVec = await embedText(searchQuery);
    const nearest = db.queryEmbedding(qVec, 5, searchQuery);
    context = nearest.map((n) => n.text).join("\n");
  }
  // If no context at all, userPrompt alone drives generation (prompt-only mode)
  const prompt = buildMCQPrompt({
    context,
    userPrompt,
    questionCount,
    difficulty,
  });
  return callGenerationModel(prompt);
}

module.exports = {
  processTextContent,
  generate,
  // Backwards-compat aliases
  generateMCQs: (count, subject, tone) =>
    generate({ questionCount: count, difficulty: tone }),
  searchAndGenerate: (query, count, subject, tone) =>
    generate({ query, questionCount: count, difficulty: tone }),
  generateFromText: (text, count, subject, tone) =>
    generate({ text, questionCount: count, difficulty: tone }),
};
