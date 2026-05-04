const ragService = require("../services/ragService");
const textUtils = require("../utils/textUtils");

async function uploadHandler(req, res) {
  try {
    const { text } = req.body;
    if (text) {
      await ragService.processTextContent(text);
      return res.json({ status: "ok", message: "Text processed" });
    }
    if (req.file) {
      // assume PDF
      const pdfText = await textUtils.parsePDF(req.file.buffer);
      await ragService.processTextContent(pdfText);
      return res.json({ status: "ok", message: "PDF processed" });
    }
    return res.status(400).json({ error: "No text or file provided" });
  } catch (err) {
    const message = String(err?.message || "Processing failed");
    const isPdfParsingError =
      message.toLowerCase().includes("pdf") ||
      message.toLowerCase().includes("xref") ||
      message.toLowerCase().includes("extract text");

    console.error("Upload processing error:", message);

    if (isPdfParsingError) {
      return res.status(400).json({
        error:
          "Failed to read PDF content. Please re-export the file (Print to PDF) or upload plain text.",
        details: message,
      });
    }

    res.status(500).json({ error: "Processing failed", details: err.message, stack: err.stack });
  }
}

module.exports = {
  uploadHandler,
};
