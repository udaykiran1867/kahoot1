const axios = require('axios');
const textUtils = require('../utils/textUtils');
const db = require('../utils/db');

// We'll talk to an ollama server; default to localhost:11434
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
let shouldSkipRemoteEmbedding = false;
let loggedEmbeddingFallback = false;
let loggedGenerationFallback = false;

function sanitizeLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildFallbackMcqs(context, questionCount, subject = 'general') {
  const lines = context
    .split(/\n+/)
    .map((line) => sanitizeLine(line))
    .filter((line) => line.length > 24);

  const source = lines.length ? lines : ['The uploaded document contains study material.'];
  const output = {};

  for (let i = 0; i < questionCount; i++) {
    const fact = source[i % source.length];
    const shortFact = fact.length > 120 ? `${fact.slice(0, 117)}...` : fact;
    output[String(i + 1)] = {
      mcq: `Which statement best matches the document content for ${subject}?`,
      options: {
        a: shortFact,
        b: `An unrelated statement about a different topic (${i + 1}).`,
        c: `A contradictory claim not supported by the document (${i + 1}).`,
        d: `A generic option without direct evidence from the text (${i + 1}).`,
      },
      correct: 'a',
    };
  }

  return JSON.stringify(output);
}

function localEmbeddingFallback(text, dims = 128) {
  const vector = Array.from({ length: dims }, () => 0);
  const normalized = String(text || '');

  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    vector[i % dims] += (code % 97) / 97;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) {
    return vector;
  }
  return vector.map((value) => value / norm);
}

async function requestEmbeddingFromOllama(text) {
  const model = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
  const payload = { model, input: text };

  try {
    const resp = await axios.post(`${OLLAMA_HOST}/v1/embeddings`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    const vector = resp?.data?.data?.[0]?.embedding;
    if (Array.isArray(vector) && vector.length > 0) {
      return vector;
    }
  } catch (_firstError) {
    // Fall through to /api/embeddings for older Ollama compatibility.
  }

  const resp = await axios.post(
    `${OLLAMA_HOST}/api/embeddings`,
    { model, prompt: text },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );
  const vector = resp?.data?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error('Embedding response missing vector data');
  }
  return vector;
}

async function embedText(text) {
  if (shouldSkipRemoteEmbedding) {
    return localEmbeddingFallback(text);
  }

  try {
    return await requestEmbeddingFromOllama(text);
  } catch (error) {
    shouldSkipRemoteEmbedding = true;
    if (!loggedEmbeddingFallback) {
      console.warn('Embedding fallback enabled (remote embedding unavailable):', error.message || error);
      loggedEmbeddingFallback = true;
    }
    return localEmbeddingFallback(text);
  }
}

async function processTextContent(content) {
  // split into chunks and create embeddings
  const chunks = textUtils.chunkText(content);
  if (!chunks.length) {
    throw new Error('No text chunks found for processing');
  }
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embedText(chunk);
    db.addEmbedding(`${Date.now()}-${i}`, embedding, chunk);
  }
}

async function generateMCQs(questionCount = 5, subject = 'general', tone = 'neutral') {
  const context = db.queryEmbedding([], 10).map(c => c.text).join('\n');
  const fullPrompt = `Text: ${context}

You are an expert MCQ maker. 
Given the above text, it is your job to create a quiz of 
${questionCount} multiple choice questions for ${subject} students 
where the tone and difficulty is ${tone}.

Make sure the questions are not repeated and check all the 
questions to be conforming to the text as well.

Make sure to format your response like RESPONSE_JSON below 
and use it as a guide.

Ensure to make ${questionCount} MCQs.

### RESPONSE_JSON
{
    "1": {
        "mcq": "multiple choice question",
        "options": {
            "a": "choice here",
            "b": "choice here",
            "c": "choice here",
            "d": "choice here"
        },
        "correct": "correct answer"
    },
    "2": {
        "mcq": "multiple choice question",
        "options": {
            "a": "choice here",
            "b": "choice here",
            "c": "choice here",
            "d": "choice here"
        },
        "correct": "correct answer"
    }
}`;

  try {
    const resp = await axios.post(
      `${OLLAMA_HOST}/api/generate`,
      {
        model: process.env.GENERATION_MODEL || 'llama3:latest',
        prompt: fullPrompt,
        stream: false,
        format: 'json',
        options: {
          num_predict: 1000,
          temperature: 0.7,
        }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 90000 }
    );

    return resp.data.response;
  } catch (error) {
    const details = error?.response?.data ? JSON.stringify(error.response.data) : (error.message || String(error));
    if (!loggedGenerationFallback) {
      console.warn('Primary generation failed, using fallback MCQs:', details);
      loggedGenerationFallback = true;
    }
    return buildFallbackMcqs(context, questionCount, subject);
  }
}

async function searchAndGenerate(query, questionCount = 5, subject = 'general', tone = 'neutral') {
  const qVec = await embedText(query);
  const nearest = db.queryEmbedding(qVec, 5);
  const context = nearest.map(n => n.text).join('\n');
  const fullPrompt = `Text: ${context}

You are an expert MCQ maker. 
Given the above text, it is your job to create a quiz of 
${questionCount} multiple choice questions about "${query}" for ${subject} students 
where the tone and difficulty is ${tone}.

Make sure the questions are not repeated and check all the 
questions to be conforming to the text as well.

Make sure to format your response like RESPONSE_JSON below 
and use it as a guide.

Ensure to make ${questionCount} MCQs.

### RESPONSE_JSON
{
    "1": {
        "mcq": "multiple choice question",
        "options": {
            "a": "choice here",
            "b": "choice here",
            "c": "choice here",
            "d": "choice here"
        },
        "correct": "correct answer"
    },
    "2": {
        "mcq": "multiple choice question",
        "options": {
            "a": "choice here",
            "b": "choice here",
            "c": "choice here",
            "d": "choice here"
        },
        "correct": "correct answer"
    }
}`;
  try {
    const resp = await axios.post(
      `${OLLAMA_HOST}/api/generate`,
      {
        model: process.env.GENERATION_MODEL || 'llama3:latest',
        prompt: fullPrompt,
        stream: false,
        format: 'json',
        options: {
          num_predict: 1000,
          temperature: 0.7,
        }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 90000 }
    );
    return resp.data.response;
  } catch (error) {
    const details = error?.response?.data ? JSON.stringify(error.response.data) : (error.message || String(error));
    if (!loggedGenerationFallback) {
      console.warn('Search generation failed, using fallback MCQs:', details);
      loggedGenerationFallback = true;
    }
    return buildFallbackMcqs(context || query, questionCount, subject);
  }
}

module.exports = {
  processTextContent,
  generateMCQs,
  searchAndGenerate,
};
