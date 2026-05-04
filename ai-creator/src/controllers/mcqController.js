const ragService = require("../services/ragService");

/**
 * Fix malformed JSON that the LLM sometimes produces:
 * Pass 1 — code fence placed OUTSIDE the "mcq" string (after its closing quote):
 *   "mcq": "question?",\n```js\ncode\n```\n"options":  →  "mcq": "question?\n```js\ncode\n```",\n"options":
 * Pass 2 — literal control characters (newline / tab) inside JSON string values.
 */
function fixAIJSON(raw) {
  // Pass 1: move out-of-string code fences back inside the preceding "mcq" value
  let s = raw.replace(
    /"mcq"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,(\s*```[\s\S]*?```\s*)(?=\s*"options")/g,
    (_match, mcqContent, codeBlock) => {
      const escaped = codeBlock
        .trim()
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "")
        .replace(/\t/g, "\\t");
      return `"mcq": "${mcqContent}\\n${escaped}",`;
    },
  );

  // Pass 2: escape literal control chars inside JSON string values
  let result = "";
  let inString = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) {
      result += c;
      esc = false;
      continue;
    }
    if (c === "\\" && inString) {
      result += c;
      esc = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      result += c;
      continue;
    }
    if (inString) {
      if (c === "\n") {
        result += "\\n";
        continue;
      }
      if (c === "\r") {
        result += "\\r";
        continue;
      }
      if (c === "\t") {
        result += "\\t";
        continue;
      }
    }
    result += c;
  }
  return result;
}

async function generateHandler(req, res) {
  try {
    const { title, count, difficulty, prompt: userPrompt } = req.body;

    console.log(
      `Generating MCQs — count: ${count}, difficulty: ${difficulty}, prompt: "${userPrompt || "(none)"}"`,
    );

    const result = await ragService.generate({
      userPrompt,
      query: title,
      questionCount: count || 5,
      difficulty: difficulty || "Medium",
    });

    // The result from Ollama is a stringified JSON. Parse it if it's a string.
    let mcqs = result;
    if (typeof result === "string") {
      try {
        // Remove any thinking or markdown blocks if present
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : result;
        mcqs = JSON.parse(fixAIJSON(jsonString));
      } catch (e) {
        console.error(
          "Failed to parse result from AI. Original result:",
          result,
        );
        console.error("Parse error:", e);
        return res.status(500).json({ error: "AI returned invalid JSON" });
      }
    }

    res.json({ mcqs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Generation failed" });
  }
}

let cachedMCQs = [];
function cacheHandler(req, res) {
  res.json(cachedMCQs);
}

module.exports = {
  generateHandler,
  cacheHandler,
};
