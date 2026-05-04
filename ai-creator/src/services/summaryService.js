const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GENERATION_MODEL = process.env.GENERATION_MODEL || "llama-3.1-8b-instant";

function buildSummaryPrompt({ quizTitle, questionAnalytics }) {
  const analyticsData = JSON.stringify(questionAnalytics, null, 2);
  return `You are an expert AI teaching assistant.
Analyze the following quiz performance data for the quiz titled "${quizTitle}".
Your goal is to provide a brief summary and identify difficult topics, moderately understood topics, clear topics, and recommended next steps for the professor.

## Performance Data:
${analyticsData}

## Output Format:
Respond ONLY with a valid JSON object matching this schema:
{
  "briefSummary": "A 2-3 sentence overview of the overall performance.",
  "difficultTopics": [
    {
      "questionIndex": 0,
      "questionLabel": "Q1",
      "topic": "Name of the concept",
      "reason": "Why it was difficult based on data"
    }
  ],
  "moderatelyUnderstoodTopics": [
    // same structure as difficultTopics
  ],
  "clearTopics": [
    // same structure as difficultTopics
  ],
  "recommendations": [
    {
      "topic": "Topic Name",
      "target": "Explanation of what to focus on",
      "subtopics": ["Subtopic 1", "Subtopic 2"]
    }
  ]
}

No other text or markdown, just the JSON.`;
}

async function callGenerationModel(prompt) {
  const completion = await groq.chat.completions.create({
    model: GENERATION_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 2048,
  });
  return completion.choices[0].message.content;
}

async function generateSummary({ quizTitle, questionAnalytics }) {
  const prompt = buildSummaryPrompt({ quizTitle, questionAnalytics });
  const result = await callGenerationModel(prompt);
  
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : result;
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse summary from AI. Original result:", result);
    throw new Error("AI returned invalid JSON");
  }
}

module.exports = {
  generateSummary,
};
