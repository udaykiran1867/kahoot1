const summaryService = require("../services/summaryService");

async function generateHandler(req, res) {
  try {
    const { quizTitle, questionAnalytics } = req.body;

    console.log(`Generating AI Summary for quiz: "${quizTitle || "(none)"}"`);

    if (!questionAnalytics || !Array.isArray(questionAnalytics)) {
      return res.status(400).json({ error: "questionAnalytics array is required" });
    }

    const summary = await summaryService.generateSummary({
      quizTitle,
      questionAnalytics,
    });

    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Summary generation failed" });
  }
}

module.exports = {
  generateHandler,
};
