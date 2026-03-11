// A very basic in-memory vector store for demonstration purposes.
// In production you'd use a proper vector database like Pinecone, Weaviate, or Redis.

const vectors = [];

function addEmbedding(id, embedding, text) {
  vectors.push({ id, embedding, text });
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) {
    return 0;
  }
  if (a.length !== b.length) {
    return 0;
  }
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  if (!magA || !magB) {
    return 0;
  }
  return dot / (magA * magB);
}

function queryEmbedding(queryVec, topK = 5) {
  if (!Array.isArray(queryVec) || queryVec.length === 0) {
    return vectors.slice(-topK).reverse();
  }

  const scored = vectors.map(v => ({
    ...v,
    score: cosineSimilarity(queryVec, v.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

module.exports = {
  addEmbedding,
  queryEmbedding,
};
