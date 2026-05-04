const pdf = require("pdf-parse");

// simple splitter by sentences/chunks for demonstration
function chunkText(text, maxChars = 1000) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

function toUint8Array(buffer) {
  if (Buffer.isBuffer(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  if (buffer instanceof Uint8Array) {
    return buffer;
  }

  return new Uint8Array(buffer.buffer || buffer, buffer.byteOffset, buffer.byteLength);
}

async function parseWithPdfParse(buffer) {
  const data = await pdf(buffer);
  return String(data?.text || "").trim();
}

async function parseWithPdfJs(buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: toUint8Array(buffer),
    disableWorker: true,
    stopAtErrors: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const doc = await loadingTask.promise;
  const pages = [];

  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => (typeof item?.str === "string" ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (pageText) {
        pages.push(pageText);
      }
    }
  } finally {
    if (typeof doc.cleanup === "function") {
      doc.cleanup();
    }
    if (typeof doc.destroy === "function") {
      await doc.destroy();
    }
  }

  return pages.join("\n\n").trim();
}

async function parsePDF(buffer) {
  let firstError = null;

  try {
    const text = await parseWithPdfParse(buffer);
    if (text) {
      return text;
    }
    firstError = new Error("pdf-parse returned empty text");
  } catch (error) {
    firstError = error;
  }

  try {
    const text = await parseWithPdfJs(buffer);
    if (text) {
      return text;
    }
    throw new Error("pdfjs-dist returned empty text");
  } catch (fallbackError) {
    const message = [
      "Unable to extract text from this PDF.",
      `Primary parser error: ${firstError?.message || "unknown"}.`,
      `Fallback parser error: ${fallbackError?.message || "unknown"}.`,
      "Try another PDF export (Print to PDF) or upload plain text.",
    ].join(" ");
    throw new Error(message);
  }
}

module.exports = {
  chunkText,
  parsePDF,
};
