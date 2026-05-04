const vectors = [];

function addEmbedding(id, embedding, text) {
  vectors.push({ id, embedding, text });
}

function cosineSimilarity(a, b) {
  if (!a || !b) return 0;
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

function getWords(str) {
  return (str || "").toLowerCase().split(/\\W+/).filter(w => w.length > 0);
}

function jaccardSimilarity(queryStr, docStr) {
  const queryWords = new Set(getWords(queryStr));
  const docWords = new Set(getWords(docStr));
  if (queryWords.size === 0 || docWords.size === 0) return 0;
  const intersectionSize = [...queryWords].filter(x => docWords.has(x)).length;
  const unionSize = queryWords.size + docWords.size - intersectionSize;
  return intersectionSize / unionSize;
}

function queryEmbedding(queryVec, topK = 5, queryText = "") {
  const scored = vectors.map((v) => {
    let score = 0;
    if (queryVec && v.embedding) {
      score = cosineSimilarity(queryVec, v.embedding);
    } else {
      score = jaccardSimilarity(queryText, v.text);
    }
    return { ...v, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function hasEmbeddings() {
  return vectors.length > 0;
}

function clearEmbeddings() {
  vectors.length = 0;
}

module.exports = {
  addEmbedding,
  queryEmbedding,
  hasEmbeddings,
  clearEmbeddings,
};
