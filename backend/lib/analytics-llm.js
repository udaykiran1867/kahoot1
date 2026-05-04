const DIFFICULT_THRESHOLD = 45;
const CLEAR_THRESHOLD = 75;
const SUMMARY_VERSION = 9;

const STOP_WORDS = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "is",
    "are",
    "was",
    "were",
    "be",
    "what",
    "which",
    "how",
    "does",
    "purpose",
    "primary",
    "consider",
    "following",
    "snippet",
    "code",
    "function",
    "question",
]);

const TOPIC_RULES = [
    {
        match: ["intelligence", "characteristic", "awareness"],
        topic: "Characteristics of intelligence",
        subtopics: [
            "Core traits of intelligent behavior",
            "Difference between intelligence and self-awareness",
            "Identifying non-characteristic distractors",
        ],
    },
    {
        match: ["machine", "learning", "goal", "accuracy"],
        topic: "Machine learning objectives",
        subtopics: [
            "Improving model performance from data",
            "Accuracy improvement through iterative learning",
            "Generalization beyond training examples",
        ],
    },
    {
        match: ["neural", "network", "patterns"],
        topic: "Purpose of neural networks",
        subtopics: [
            "Learning patterns from input features",
            "Mapping inputs to predictions",
            "Why neural networks are used in complex tasks",
        ],
    },
    {
        match: ["algorithm", "adjusting", "performance", "data", "training"],
        topic: "Model learning from data",
        subtopics: [
            "How models improve during training",
            "Feedback-driven parameter updates",
            "Link between data quality and model improvement",
        ],
    },
    {
        match: ["speech", "recognition", "deep", "learning"],
        topic: "Deep learning applications",
        subtopics: [
            "Speech recognition use cases",
            "Why deep models work for perception tasks",
            "Task-specific specialization in AI systems",
        ],
    },
    {
        match: ["natural", "language", "interacting", "users", "chat"],
        topic: "Conversational AI and NLP",
        subtopics: [
            "Natural language understanding and response",
            "User interaction through conversational systems",
            "Difference between chatbot and broader NLP tasks",
        ],
    },
    {
        match: [
            "artificial",
            "intelligence",
            "research",
            "intelligent",
            "machines",
        ],
        topic: "AI foundations",
        subtopics: [
            "Goals of AI research",
            "Building intelligent behavior in machines",
            "Core AI subfields and their purposes",
        ],
    },
    {
        match: ["human", "ability", "recognize", "pattern", "recognition"],
        topic: "Pattern recognition",
        subtopics: [
            "Recognizing structures and regularities",
            "Human vs machine pattern detection",
            "Pattern recognition role in intelligent systems",
        ],
    },
    {
        match: ["fs", "readfile", "asynchronous", "async", "callback", "promise"],
        topic: "Node.js fs asynchronous file handling",
        subtopics: [
            "Non-blocking I/O in the event loop",
            "fs.readFile callback flow and error-first pattern",
            "Using fs.promises.readFile with async/await",
            "Encoding selection (utf8 vs Buffer output)",
        ],
    },
    {
        match: ["prime", "factors", "factor"],
        topic: "Prime factorization logic",
        subtopics: [
            "Divisibility checks inside iterative loops",
            "Repeated division while a factor still divides n",
            "Loop boundary updates after reducing n",
            "Building factor arrays in ascending order",
        ],
    },
    {
        match: ["buffer", "binary", "bytes", "encoding"],
        topic: "Node.js Buffer usage",
        subtopics: [
            "Binary data representation in Node.js",
            "Buffer.from and Buffer.alloc use cases",
            "Text encoding and decoding (utf8/base64)",
            "When Buffer is preferred over plain strings",
        ],
    },
    {
        match: ["require", "module", "exports", "import"],
        topic: "CommonJS require and module loading",
        subtopics: [
            "Loading modules via require()",
            "Module caching behavior",
            "module.exports and exported API structure",
            "Relative and package module path resolution",
        ],
    },
    {
        match: ["http", "server", "createserver", "listen", "req", "res"],
        topic: "HTTP server creation in Node.js",
        subtopics: [
            "http.createServer request-response lifecycle",
            "Writing status and headers with res.writeHead",
            "Sending response payload with res.end",
            "Binding server.listen to a port",
        ],
    },
];

function clampNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function compactText(text, maxLength = 140) {
    const value = String(text || "")
        .replace(/\s+/g, " ")
        .trim();
    return value.length > maxLength
        ? `${value.slice(0, maxLength - 3)}...`
        : value;
}

function normalizeQuestionText(text) {
    const raw = String(text || "");
    const withoutCodeFences = raw.replace(/```[\s\S]*?```/g, " ");
    const withoutInlineCode = withoutCodeFences.replace(/`[^`]*`/g, " ");
    const cleaned = compactText(withoutInlineCode, 260);
    return cleaned || "Topic not specified";
}

function tokenizeKeywords(text) {
    const normalized = String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!normalized) return [];

    return normalized
        .split(" ")
        .filter((token) => token.length > 2 || ["fs", "io", "js"].includes(token))
        .filter((token) => !STOP_WORDS.has(token));
}

function unique(items) {
    return [...new Set((Array.isArray(items) ? items : []).filter(Boolean))];
}

function pickTopicRule(keywords) {
    const keywordSet = new Set(keywords);
    let bestRule = null;
    let bestScore = 0;

    for (const rule of TOPIC_RULES) {
        const score = rule.match.reduce(
            (sum, key) => sum + (keywordSet.has(key) ? 1 : 0),
            0,
        );

        if (score > bestScore) {
            bestScore = score;
            bestRule = rule;
        }
    }

    return bestScore > 0 ? bestRule : null;
}

function splitIntoParts(text) {
    return String(text || "")
        .split(/[,:;]+/)
        .map((part) => part.trim())
        .filter(Boolean);
}

function normalizeTopicLabel(topic) {
    const value = String(topic || "")
        .replace(/^which of the following is not a\s+/i, "")
        .replace(/^which of the following is a\s+/i, "")
        .replace(/^which of the following\s+/i, "")
        .replace(/^what is the primary purpose of\s+/i, "")
        .replace(/^what is the purpose of\s+/i, "")
        .replace(/^what is the term used in ai to describe\s+/i, "")
        .replace(/^the term used in ai to describe\s+/i, "")
        .replace(/^a key goal of\s+/i, "")
        .replace(/[?]+$/g, "")
        .trim();

    return compactText(value || "Topic not specified", 90);
}

function extractTopicAndSubtopics(questionText, correctOptionText) {
    const cleanText = normalizeQuestionText(questionText);
    const cleanCorrectOption = compactText(correctOptionText || "", 160);

    const questionKeywords = tokenizeKeywords(cleanText);
    const correctKeywords = tokenizeKeywords(cleanCorrectOption);
    const mergedKeywords = unique([...questionKeywords, ...correctKeywords]);
    const matchedRule = pickTopicRule(mergedKeywords);

    const parts = splitIntoParts(cleanText);
    const firstPart = parts[0] || cleanText;
    const fallbackTopic = firstPart
        .replace(/^consider the following code snippet\s*/i, "")
        .replace(/^what is\s+/i, "")
        .replace(/^how does\s+/i, "")
        .replace(/[?]+$/g, "")
        .trim();

    const fallbackSubtopics = [
        `Question focus: ${compactText(firstPart, 110)}`,
        cleanCorrectOption
            ? `Correct answer meaning: ${cleanCorrectOption}`
            : "Correct answer meaning: revisit the expected answer explanation",
        "Discuss one correct example and one incorrect example to contrast reasoning",
    ];

    const subtopics = unique([
        ...(matchedRule?.subtopics || []),
        ...fallbackSubtopics,
    ]).slice(0, 4);

    return {
        topic: normalizeTopicLabel(matchedRule?.topic || fallbackTopic),
        subtopics,
        fullText: cleanText,
        questionKeywords,
        correctKeywords,
    };
}

function getCorrectOptionText(question) {
    const stats = Array.isArray(question?.optionStats)
        ? question.optionStats
        : [];
    const idx = Number(question?.correctAnswerIndex);
    if (!Number.isInteger(idx)) return "";
    const option = stats.find((item) => Number(item?.index) === idx);
    return compactText(option?.text || "", 120);
}

function toTopicItem(q) {
    const accuracy = clampNumber(q?.accuracyPct);
    const totalResponses = clampNumber(q?.totalResponses);
    const correctResponses = clampNumber(q?.correctResponses);
    const correctOptionText = getCorrectOptionText(q);
    const { topic, subtopics, fullText, questionKeywords, correctKeywords } =
        extractTopicAndSubtopics(q?.questionText, correctOptionText);

    return {
        questionIndex: q?.questionIndex,
        questionLabel: `Q${clampNumber(q?.questionIndex) + 1}`,
        topic,
        subtopics,
        correctOptionText,
        fullQuestionText: fullText,
        questionKeywords,
        correctKeywords,
        accuracyPct: accuracy,
        reason: `${correctResponses}/${totalResponses} correct (${accuracy}%)`,
    };
}

function buildConceptsForSubtopic(topic, subtopic) {
    const signature = `${topic || ""} ${subtopic || ""}`.toLowerCase();

    const conceptRules = [
        {
            keys: ["characteristics of intelligence", "intelligent behavior"],
            concepts: [
                "Definition-level criteria for intelligence: goal-directed behavior, adaptation, reasoning, and learning from feedback.",
                "Intelligence vs self-awareness: compare problem-solving capability with consciousness/metacognition.",
                "Examples by category: reactive agents, model-based agents, and systems that update decisions using new evidence.",
            ],
        },
        {
            keys: ["machine learning objectives", "generalization", "accuracy"],
            concepts: [
                "Generalization vs memorization: how train, validation, and test splits measure real learning.",
                "Loss function vs accuracy metric: what each optimizes and when a lower loss may still hide class imbalance issues.",
                "Bias-variance trade-off: underfitting vs overfitting and how regularization controls model complexity.",
            ],
        },
        {
            keys: ["neural network", "patterns", "predictions"],
            concepts: [
                "Layer roles: input features, hidden-layer transformations, and output mapping for classification or regression.",
                "Activation functions comparison: ReLU, sigmoid, and tanh with typical use-cases and gradient behavior.",
                "Backpropagation pipeline: forward pass, loss computation, gradient update, and iterative weight refinement.",
            ],
        },
        {
            keys: ["model learning from data", "training", "parameter updates"],
            concepts: [
                "Gradient descent mechanics: learning rate, step size impact, and convergence stability.",
                "Epoch, batch, and mini-batch training: speed-memory trade-offs and update frequency differences.",
                "Data quality effects: noisy labels, feature leakage, and distribution shift on learned parameters.",
            ],
        },
        {
            keys: ["deep learning applications", "speech recognition", "perception"],
            concepts: [
                "Speech pipeline concepts: acoustic features, temporal modeling, and decoding into tokens/words.",
                "Architecture choices by modality: CNNs for spatial patterns, RNN/Transformer models for sequence context.",
                "Transfer learning use-case: adapting pretrained representations to low-data domain tasks.",
            ],
        },
        {
            keys: ["conversational ai", "nlp", "chatbot"],
            concepts: [
                "NLP stack for dialogue: tokenization, embeddings, intent classification, and entity extraction.",
                "Dialogue-state concepts: context tracking, slot filling, and turn-level response planning.",
                "Rule-based vs generative assistants: control, flexibility, hallucination risk, and evaluation differences.",
            ],
        },
        {
            keys: ["ai foundations", "intelligent machines", "ai research"],
            concepts: [
                "Core AI paradigms comparison: symbolic reasoning, probabilistic models, and data-driven learning.",
                "Search and optimization basics: state space, heuristics, and objective functions in decision problems.",
                "Knowledge representation forms: rules, graphs, and vector embeddings for machine reasoning.",
            ],
        },
        {
            keys: ["pattern recognition", "structures", "regularities"],
            concepts: [
                "Feature engineering vs feature learning: manual descriptors compared with learned representations.",
                "Similarity and distance measures: Euclidean, cosine, and when each is appropriate.",
                "Evaluation metrics by task: precision/recall/F1 vs accuracy, including class-imbalance implications.",
            ],
        },
        {
            keys: ["fs", "readfile", "asynchronous", "event loop"],
            concepts: [
                "Event loop phases and non-blocking I/O: why asynchronous file operations preserve server responsiveness.",
                "Callback API vs fs.promises API: error-first callbacks compared with async/await flow control.",
                "Encoding and return types: utf8 string output vs Buffer output and when binary-safe reading is required.",
            ],
        },
        {
            keys: ["prime factorization", "divisibility", "factor"],
            concepts: [
                "Divisibility loop design: repeated division while a factor still divides n.",
                "Complexity reasoning: checking factors up to sqrt(n) and handling remaining prime residue.",
                "Edge-case handling: n <= 1, repeated factors, and ordered factor list construction.",
            ],
        },
        {
            keys: ["buffer", "binary", "encoding", "bytes"],
            concepts: [
                "Buffer memory model: fixed-size byte arrays and how offsets/indexing map to raw bytes.",
                "Buffer creation methods comparison: Buffer.from for existing data vs Buffer.alloc for zero-filled memory.",
                "Encoding transforms: utf8, hex, and base64 conversions with data-size trade-offs.",
            ],
        },
        {
            keys: ["commonjs", "require", "module", "exports"],
            concepts: [
                "Module resolution rules: relative paths, package lookup, and index file fallback behavior.",
                "module.exports patterns: exporting functions, objects, and factory APIs with import ergonomics.",
                "Module caching behavior: single evaluation, shared state risks, and cache invalidation implications.",
            ],
        },
        {
            keys: ["http server", "createserver", "listen", "req", "res"],
            concepts: [
                "Request-response lifecycle: parsing request metadata, writing headers, and finalizing with res.end.",
                "Status code and header semantics: content-type, cache-control, and correct protocol signaling.",
                "Port binding and host scope: listen(port, host) behavior and local vs public accessibility.",
            ],
        },
    ];

    for (const rule of conceptRules) {
        if (rule.keys.some((key) => signature.includes(key))) {
            return rule.concepts;
        }
    }

    const normalizedSubtopic = compactText(subtopic || "Core concept", 90);
    return [
        `Definition and scope of ${normalizedSubtopic}, including where this concept is used in problem solving.`,
        `Key types or variants of ${normalizedSubtopic}, and how to choose between them in practical scenarios.`,
        `Comparison of ${normalizedSubtopic} with its closest related concept to avoid conceptual confusion in MCQs.`,
    ];
}

// function buildRecommendations(difficultTopics, moderateTopics) {
//   const focusTopics = [...difficultTopics, ...moderateTopics];
//   const orderedFocus = [...focusTopics].sort(
//     (a, b) => clampNumber(a?.accuracyPct) - clampNumber(b?.accuracyPct),
//   );

//   if (orderedFocus.length === 0) {
//     return [
//       "Topics needing more attention: none identified right now.",
//       "Improvements to maintain progress: run a short recap quiz and reinforce clear topics with one advanced application task.",
//     ];
//   }

//   const primaryAttentionTopics = unique(
//     orderedFocus.map((item) => normalizeTopicLabel(item?.topic)),
//   ).slice(0, 4);

//   const difficultTopicNames = unique(
//     difficultTopics.map((item) => normalizeTopicLabel(item?.topic)),
//   ).slice(0, 4);

//   const moderateTopicNames = unique(
//     moderateTopics.map((item) => normalizeTopicLabel(item?.topic)),
//   ).slice(0, 4);

//   return [
//     `Topics needing more attention: ${primaryAttentionTopics.join(", ")}.`,
//     difficultTopicNames.length > 0
//       ? `Priority improvements for difficult topics (<45%): Re-teach core definitions, explain why the correct answer is right vs common distractors, and solve 2 guided examples for: ${difficultTopicNames.join(", ")}.`
//       : "Priority improvements for difficult topics (<45%): none.",
//     moderateTopicNames.length > 0
//       ? `Improvements for moderately understood topics (45-75%): strengthen concept clarity with short practice sets and immediate feedback for: ${moderateTopicNames.join(", ")}.`
//       : "Improvements for moderately understood topics (45-75%): none.",
//     "Success target: move difficult topics above 45% and moderately understood topics above 75% in the next assessment.",
//   ];
// }

function buildRecommendations(difficultTopics, moderateTopics) {
    const focusTopics = [...difficultTopics, ...moderateTopics].sort(
        (a, b) => clampNumber(a?.accuracyPct) - clampNumber(b?.accuracyPct),
    );

    if (focusTopics.length === 0) {
        return [];
    }

    const groupedByTopic = new Map();

    for (const item of focusTopics) {
        const topic = normalizeTopicLabel(item?.topic);
        const accuracy = clampNumber(item?.accuracyPct);
        const existing = groupedByTopic.get(topic);

        if (!existing) {
            groupedByTopic.set(topic, {
                topic,
                minAccuracy: accuracy,
                subtopicSet: new Set(unique(item?.subtopics || []).slice(0, 2)),
            });
            continue;
        }

        existing.minAccuracy = Math.min(existing.minAccuracy, accuracy);
        for (const subtopic of unique(item?.subtopics || []).slice(0, 2)) {
            existing.subtopicSet.add(subtopic);
        }
    }

    return [...groupedByTopic.values()]
        .sort((a, b) => a.minAccuracy - b.minAccuracy)
        .map((item) => {
            const mergedSubtopics = [];
            const subtopicList = [...item.subtopicSet].slice(0, 1);

            for (const subtopic of subtopicList) {
                mergedSubtopics.push(
                    `Subtopic: ${compactText(subtopic || "Core concept", 120)}`,
                    "What to Learn:",
                    ...buildConceptsForSubtopic(item.topic, subtopic),
                );
            }

            const band =
                item.minAccuracy < DIFFICULT_THRESHOLD
                    ? "Difficult (<45%)"
                    : "Moderately understood (45-75%)";

            return {
                topic: item.topic,
                subtopics: mergedSubtopics,
                target: `Accuracy band: ${band}. Current accuracy: ${item.minAccuracy}%`,
            };
        });
}
function buildDeterministicSummary({ quizTitle, questionAnalytics }) {
    const questions = Array.isArray(questionAnalytics) ? questionAnalytics : [];

    if (questions.length === 0) {
        return {
            provider: "rule-based",
            briefSummary:
                "No question analytics data is available yet for this game.",
            difficultTopics: [],
            moderatelyUnderstoodTopics: [],
            clearTopics: [],
            unansweredQuestions: [],
            recommendations: [],
        };
    }

    const sorted = [...questions].sort(
        (a, b) => clampNumber(a?.questionIndex) - clampNumber(b?.questionIndex),
    );

    const difficultTopics = [];
    const moderatelyUnderstoodTopics = [];
    const clearTopics = [];
    const unansweredQuestions = [];

    for (const question of sorted) {
        const accuracy = clampNumber(question?.accuracyPct);
        const topicItem = toTopicItem(question);

        if (clampNumber(question?.totalResponses) === 0) {
            unansweredQuestions.push({
                questionIndex: topicItem.questionIndex,
                questionLabel: topicItem.questionLabel,
                topic: topicItem.topic,
            });
        }

        if (accuracy < DIFFICULT_THRESHOLD) {
            difficultTopics.push(topicItem);
            continue;
        }

        if (accuracy <= CLEAR_THRESHOLD) {
            moderatelyUnderstoodTopics.push(topicItem);
            continue;
        }

        clearTopics.push(topicItem);
    }

    const briefSummary =
        `In ${quizTitle || "this quiz"}, ${difficultTopics.length} topic(s) are difficult (<45%), ` +
        `${moderatelyUnderstoodTopics.length} topic(s) are moderately understood (45-75%), and ` +
        `${clearTopics.length} topic(s) are clear (>75%).` +
        (unansweredQuestions.length > 0
            ? ` ${unansweredQuestions.length} question(s) received no responses.`
            : " Every question received at least one response.");

    return {
        provider: "rule-based",
        summaryVersion: SUMMARY_VERSION,
        briefSummary,
        difficultTopics,
        moderatelyUnderstoodTopics,
        clearTopics,
        unansweredQuestions,
        recommendations: buildRecommendations(
            difficultTopics,
            moderatelyUnderstoodTopics,
        ),
    };
}

export async function buildPerformanceInsight({
    quizTitle,
    questionAnalytics,
}) {
    try {
        const response = await fetch("http://localhost:3000/api/summary/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quizTitle, questionAnalytics }),
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.summary) {
                // Ensure we tag it as LLM-generated and add the version
                return {
                    ...data.summary,
                    provider: "llm",
                    summaryVersion: SUMMARY_VERSION,
                };
            }
        }
        console.warn("AI summary generation failed or returned empty. Falling back to deterministic summary.");
    } catch (error) {
        console.error("Error communicating with ai-creator summary API:", error.message);
    }
    
    // Fallback
    return buildDeterministicSummary({ quizTitle, questionAnalytics });
}