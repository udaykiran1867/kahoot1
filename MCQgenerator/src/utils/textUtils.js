const pdf = require('pdf-parse');

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

async function parsePDF(buffer) {
  try {
    const data = await pdf(buffer);
    const text = (data.text || '').trim();
    if (!text) {
      throw new Error('PDF has no extractable text');
    }
    return text;
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error.message || 'Unknown PDF error'}`);
  }
}

module.exports = {
  chunkText,
  parsePDF,
};
