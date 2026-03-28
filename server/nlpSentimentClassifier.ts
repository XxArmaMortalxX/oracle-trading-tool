/**
 * NLP Sentiment Classifier
 * 
 * Replaces the simple keyword-matching classifier with a multi-tier approach:
 * 
 * Tier 1 (Primary): LLM-based classification using the built-in Gemini 2.5 Flash.
 *   - Batch-classifies post titles with full context understanding
 *   - Handles negation, sarcasm, and nuanced language naturally
 *   - Uses structured JSON output for reliable parsing
 * 
 * Tier 2 (Fallback): Enhanced keyword classifier with:
 *   - Negation detection ("not bullish" → bearish, "don't buy" → bearish)
 *   - Sarcasm heuristics ("sure, totally going to moon" → likely bearish)
 *   - Contextual modifier handling ("was bullish" vs "is bullish")
 *   - Weighted multi-word phrase matching
 * 
 * Both tiers produce the same output format for seamless integration.
 */

import { invokeLLM } from "./_core/llm";

// ── Types ──

export interface SentimentClassification {
  classification: "BULLISH" | "BEARISH" | "NEUTRAL";
  bullishSignals: string[];
  bearishSignals: string[];
  bullishScore: number;
  bearishScore: number;
  /** Which classifier tier produced this result */
  classifierTier: "llm" | "enhanced-keyword";
  /** Confidence level from the classifier (0-1) */
  confidence: number;
}

// ── In-memory cache for classified texts ──

const classificationCache = new Map<string, SentimentClassification>();
const CACHE_MAX_SIZE = 5000;

function getCacheKey(text: string): string {
  return text.toLowerCase().trim().slice(0, 500);
}

function getCachedResult(text: string): SentimentClassification | null {
  return classificationCache.get(getCacheKey(text)) || null;
}

function setCachedResult(text: string, result: SentimentClassification): void {
  if (classificationCache.size >= CACHE_MAX_SIZE) {
    // Evict oldest entries (first 20%)
    const keysToDelete = Array.from(classificationCache.keys()).slice(0, Math.floor(CACHE_MAX_SIZE * 0.2));
    for (const key of keysToDelete) {
      classificationCache.delete(key);
    }
  }
  classificationCache.set(getCacheKey(text), result);
}

// ══════════════════════════════════════════════════════
// TIER 1: LLM-Based Classifier
// ══════════════════════════════════════════════════════

const LLM_BATCH_SIZE = 25; // Posts per LLM call
const LLM_TIMEOUT_MS = 30000;

interface LLMClassificationResult {
  index: number;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  signals: string[];
}

/**
 * Classify a batch of post titles using the LLM.
 * Returns null if the LLM call fails (triggers fallback).
 */
async function classifyBatchWithLLM(
  texts: string[]
): Promise<LLMClassificationResult[] | null> {
  try {
    const numberedTexts = texts.map((t, i) => `[${i}] ${t}`).join("\n");

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a financial sentiment classifier for social media posts about stocks. 
Classify each post as "bullish", "bearish", or "neutral" based on the overall sentiment toward the mentioned stock(s).

Key rules:
- Detect negation: "not bullish" = bearish, "don't buy" = bearish, "won't crash" = bullish
- Detect sarcasm: "sure, totally going to moon" = likely bearish, "great job losing money" = bearish
- Context matters: "was bullish but now bearish" = bearish (most recent sentiment wins)
- Questions are usually neutral unless they contain strong sentiment words
- Pure news/facts without opinion = neutral
- Emoji context: 🚀💎🙌 = bullish, 📉🐻💀 = bearish
- "Diamond hands" = bullish (holding), "paper hands" = bearish (selling)
- "YOLO" / "all in" = bullish, "bag holder" = bearish

For each post, provide:
- sentiment: "bullish", "bearish", or "neutral"
- confidence: 0.0 to 1.0 (how confident you are)
- signals: array of key phrases/words that drove the classification (max 3)

Return a JSON array of objects with fields: index, sentiment, confidence, signals.`,
        },
        {
          role: "user",
          content: `Classify these ${texts.length} social media posts about stocks:\n\n${numberedTexts}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sentiment_classifications",
          strict: true,
          schema: {
            type: "object",
            properties: {
              results: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "integer", description: "Post index from input" },
                    sentiment: { type: "string", enum: ["bullish", "bearish", "neutral"], description: "Sentiment classification" },
                    confidence: { type: "number", description: "Confidence 0.0-1.0" },
                    signals: {
                      type: "array",
                      items: { type: "string" },
                      description: "Key signals that drove classification (max 3)",
                    },
                  },
                  required: ["index", "sentiment", "confidence", "signals"],
                  additionalProperties: false,
                },
              },
            },
            required: ["results"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") return null;

    const parsed = JSON.parse(content);
    const results: LLMClassificationResult[] = parsed.results || parsed;

    // Validate results
    if (!Array.isArray(results)) return null;

    return results.map((r) => ({
      index: r.index,
      sentiment: r.sentiment as "bullish" | "bearish" | "neutral",
      confidence: Math.max(0, Math.min(1, r.confidence || 0.5)),
      signals: Array.isArray(r.signals) ? r.signals.slice(0, 3) : [],
    }));
  } catch (err) {
    console.warn("[NLPClassifier] LLM classification failed, will use fallback:", err);
    return null;
  }
}

/**
 * Convert LLM result to our standard SentimentClassification format.
 */
function llmResultToClassification(result: LLMClassificationResult): SentimentClassification {
  const sentimentMap: Record<string, "BULLISH" | "BEARISH" | "NEUTRAL"> = {
    bullish: "BULLISH",
    bearish: "BEARISH",
    neutral: "NEUTRAL",
  };

  const classification = sentimentMap[result.sentiment] || "NEUTRAL";
  const bullishSignals = classification === "BULLISH" ? result.signals : [];
  const bearishSignals = classification === "BEARISH" ? result.signals : [];

  return {
    classification,
    bullishSignals,
    bearishSignals,
    bullishScore: classification === "BULLISH" ? Math.round(result.confidence * 3) : 0,
    bearishScore: classification === "BEARISH" ? Math.round(result.confidence * 3) : 0,
    classifierTier: "llm",
    confidence: result.confidence,
  };
}

// ══════════════════════════════════════════════════════
// TIER 2: Enhanced Keyword Classifier (Fallback)
// ══════════════════════════════════════════════════════

// ── Keyword Lists (same as original, used for fallback) ──

const BULLISH_KEYWORDS = [
  "calls", "call", "long", "buy", "buying", "bought", "moon", "mooning",
  "rocket", "rockets", "🚀", "squeeze", "squeezing", "breakout", "breaking out",
  "bullish", "bull", "bulls", "upside", "rip", "ripping", "rally", "rallying",
  "pump", "pumping", "tendies", "tendie", "diamond hands", "💎", "🙌",
  "to the moon", "going up", "gap up", "gapping up", "runner", "running",
  "parabolic", "send it", "all in", "yolo", "undervalued", "underpriced",
  "oversold", "accumulate", "accumulating", "loading", "loaded",
  "catalyst", "approval", "approved", "fda approval", "partnership",
  "contract", "deal", "upgrade", "upgraded", "beat", "beats", "earnings beat",
  "revenue beat", "guidance raise", "raised guidance", "insider buying",
  "short squeeze", "gamma squeeze", "high short interest",
  "support", "bounce", "bouncing", "recovery", "recovering",
  "double bottom", "golden cross", "breakout pattern",
  "massive volume", "huge volume", "volume spike",
  "free money", "easy money", "print money", "money printer",
  "next gme", "next amc", "next squeeze",
  "🔥", "🤑", "📈", "💰", "🌙",
];

const BEARISH_KEYWORDS = [
  "puts", "put", "short", "shorting", "shorted", "sell", "selling", "sold",
  "dump", "dumping", "dumped", "crash", "crashing", "crashed",
  "bearish", "bear", "bears", "downside", "tank", "tanking", "tanked",
  "plunge", "plunging", "plunged", "drill", "drilling",
  "overvalued", "overpriced", "overbought", "bubble",
  "bag holder", "bagholder", "bagholding", "bag holding",
  "loss porn", "loss", "losses", "red", "bleeding",
  "dead cat bounce", "dead cat", "death cross", "head and shoulders",
  "resistance", "rejection", "rejected", "failed",
  "dilution", "diluted", "offering", "shelf offering", "atm offering",
  "sec investigation", "sec probe", "lawsuit", "fraud", "scam",
  "downgrade", "downgraded", "miss", "missed", "earnings miss",
  "revenue miss", "guidance cut", "lowered guidance", "insider selling",
  "delisting", "delisted", "bankruptcy", "bankrupt",
  "warning", "caution", "careful", "trap", "bull trap",
  "gap down", "gapping down", "falling knife", "knife catching",
  "rug pull", "rugpull", "ponzi",
  "📉", "🔻", "💀", "☠️", "🪦",
];

// ── Negation Handling ──

const NEGATION_WORDS = [
  "not", "no", "don't", "dont", "doesn't", "doesnt",
  "won't", "wont", "wouldn't", "wouldnt",
  "can't", "cant", "cannot", "couldn't", "couldnt",
  "isn't", "isnt", "aren't", "arent",
  "never", "neither", "nor", "hardly", "barely", "rarely",
  "stop", "stopped", "stopping",
];

// Window size: how many words after a negation word to check for keyword flips
const NEGATION_WINDOW = 4;

/**
 * Check if a keyword at a given position in the text is negated.
 * Looks backward from the keyword position for negation words within the window.
 */
function isNegated(words: string[], keywordStartIndex: number): boolean {
  const start = Math.max(0, keywordStartIndex - NEGATION_WINDOW);
  for (let i = start; i < keywordStartIndex; i++) {
    const word = words[i].replace(/[^a-z']/g, "");
    if (NEGATION_WORDS.includes(word)) {
      return true;
    }
  }
  return false;
}

/**
 * Find the word index where a keyword phrase starts in the word array.
 * Returns -1 if not found.
 */
function findKeywordWordIndex(words: string[], keyword: string): number {
  const kwWords = keyword.toLowerCase().split(/\s+/);
  for (let i = 0; i <= words.length - kwWords.length; i++) {
    let match = true;
    for (let j = 0; j < kwWords.length; j++) {
      if (!words[i + j].includes(kwWords[j])) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

// ── Sarcasm Detection ──

const SARCASM_MARKERS = [
  "sure", "totally", "definitely", "obviously", "clearly",
  "of course", "yeah right", "right", "lol", "lmao", "rofl",
  "what could go wrong", "nothing can go wrong", "genius move",
  "great idea", "brilliant", "amazing plan", "trust me bro",
  "copium", "hopium",
];

const EXCESSIVE_PUNCTUATION_RE = /[!?]{3,}/;
const ALL_CAPS_SARCASM_RE = /\b[A-Z]{5,}\b/; // Long all-caps words

/**
 * Detect potential sarcasm in text.
 * Returns a sarcasm score (0 = no sarcasm, higher = more likely sarcastic).
 */
function detectSarcasm(text: string): number {
  const lower = text.toLowerCase();
  let sarcasmScore = 0;

  // Check for sarcasm marker words
  for (const marker of SARCASM_MARKERS) {
    if (lower.includes(marker)) {
      sarcasmScore += 1;
    }
  }

  // Excessive punctuation (e.g., "to the moon!!!!!!")
  if (EXCESSIVE_PUNCTUATION_RE.test(text)) {
    sarcasmScore += 0.5;
  }

  // Quoted text often indicates sarcasm ("going to moon" sure)
  const quoteCount = (text.match(/["']/g) || []).length;
  if (quoteCount >= 2) {
    sarcasmScore += 0.5;
  }

  // Contradictory structure: bullish keyword + "but" + bearish keyword
  if (lower.includes(" but ") || lower.includes(" however ") || lower.includes(" yet ")) {
    sarcasmScore += 0.3;
  }

  return sarcasmScore;
}

// ── Past Tense / Temporal Modifiers ──

const PAST_TENSE_MARKERS = [
  "was", "were", "used to", "had been", "previously", "formerly",
  "before", "yesterday", "last week", "last month",
];

/**
 * Check if a keyword is modified by past tense, reducing its current relevance.
 */
function isPastTense(words: string[], keywordStartIndex: number): boolean {
  const start = Math.max(0, keywordStartIndex - 3);
  for (let i = start; i < keywordStartIndex; i++) {
    const word = words[i].replace(/[^a-z']/g, "");
    if (PAST_TENSE_MARKERS.includes(word)) {
      return true;
    }
  }
  return false;
}

/**
 * Enhanced keyword-based classifier with negation, sarcasm, and context awareness.
 */
export function classifyWithEnhancedKeywords(
  text: string,
  _ticker: string
): SentimentClassification {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).map(w => w.replace(/[^a-z0-9'🚀💎🙌📈📉🔻💀☠️🪦🔥🤑💰🌙]/g, ""));
  
  const bullishSignals: string[] = [];
  const bearishSignals: string[] = [];
  let bullishScore = 0;
  let bearishScore = 0;

  // Check bullish keywords with negation awareness
  for (const kw of BULLISH_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      const wordIdx = findKeywordWordIndex(words, kw);
      const weight = kw.includes(" ") ? 2 : 1;

      if (wordIdx >= 0 && isNegated(words, wordIdx)) {
        // Negated bullish = bearish signal
        bearishSignals.push(`NOT ${kw}`);
        bearishScore += weight;
      } else if (wordIdx >= 0 && isPastTense(words, wordIdx)) {
        // Past tense reduces weight by half
        bullishSignals.push(kw);
        bullishScore += weight * 0.5;
      } else {
        bullishSignals.push(kw);
        bullishScore += weight;
      }
    }
  }

  // Check bearish keywords with negation awareness
  for (const kw of BEARISH_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      const wordIdx = findKeywordWordIndex(words, kw);
      const weight = kw.includes(" ") ? 2 : 1;

      if (wordIdx >= 0 && isNegated(words, wordIdx)) {
        // Negated bearish = bullish signal
        bullishSignals.push(`NOT ${kw}`);
        bullishScore += weight;
      } else if (wordIdx >= 0 && isPastTense(words, wordIdx)) {
        bearishSignals.push(kw);
        bearishScore += weight * 0.5;
      } else {
        bearishSignals.push(kw);
        bearishScore += weight;
      }
    }
  }

  // Apply sarcasm modifier
  const sarcasmLevel = detectSarcasm(text);
  if (sarcasmLevel >= 2) {
    // High sarcasm: flip the dominant sentiment partially
    if (bullishScore > bearishScore) {
      // Sarcastic bullish → reduce bullish, boost bearish
      const flip = Math.min(bullishScore * 0.5, sarcasmLevel);
      bullishScore -= flip;
      bearishScore += flip * 0.5;
      bearishSignals.push("sarcasm detected");
    } else if (bearishScore > bullishScore) {
      // Sarcastic bearish → reduce bearish, boost bullish
      const flip = Math.min(bearishScore * 0.5, sarcasmLevel);
      bearishScore -= flip;
      bullishScore += flip * 0.5;
      bullishSignals.push("sarcasm detected");
    }
  }

  // Determine classification
  let classification: "BULLISH" | "BEARISH" | "NEUTRAL";
  let confidence: number;

  if (bullishScore === 0 && bearishScore === 0) {
    classification = "NEUTRAL";
    confidence = 0.5;
  } else if (bullishScore > bearishScore) {
    classification = "BULLISH";
    confidence = Math.min(0.9, 0.5 + (bullishScore - bearishScore) / 10);
  } else if (bearishScore > bullishScore) {
    classification = "BEARISH";
    confidence = Math.min(0.9, 0.5 + (bearishScore - bullishScore) / 10);
  } else {
    classification = "NEUTRAL";
    confidence = 0.3; // Tied = low confidence neutral
  }

  return {
    classification,
    bullishSignals: Array.from(new Set(bullishSignals)),
    bearishSignals: Array.from(new Set(bearishSignals)),
    bullishScore: Math.round(bullishScore),
    bearishScore: Math.round(bearishScore),
    classifierTier: "enhanced-keyword",
    confidence,
  };
}

// ══════════════════════════════════════════════════════
// UNIFIED CLASSIFIER (Public API)
// ══════════════════════════════════════════════════════

/** Track whether LLM is available (avoid repeated failures) */
let llmAvailable = true;
let llmLastFailure = 0;
const LLM_COOLDOWN_MS = 5 * 60 * 1000; // 5 min cooldown after failure

/**
 * Classify a single post's sentiment.
 * Uses cached result if available, otherwise uses enhanced keyword classifier.
 * For batch LLM classification, use classifyBatch() instead.
 * 
 * This is the drop-in replacement for the old classifyPostSentiment().
 */
export function classifyPostSentiment(
  text: string,
  ticker: string
): SentimentClassification {
  // Check cache first
  const cached = getCachedResult(text);
  if (cached) return cached;

  // Use enhanced keyword classifier for single calls
  const result = classifyWithEnhancedKeywords(text, ticker);
  setCachedResult(text, result);
  return result;
}

/**
 * Batch-classify multiple posts using the LLM (primary) with keyword fallback.
 * This is the preferred method for processing large sets of posts.
 * 
 * @param posts Array of { text, ticker } objects to classify
 * @returns Array of SentimentClassification results in the same order
 */
export async function classifyBatch(
  posts: { text: string; ticker: string }[]
): Promise<SentimentClassification[]> {
  if (posts.length === 0) return [];

  const results: SentimentClassification[] = new Array(posts.length);
  const uncachedIndices: number[] = [];

  // Step 1: Check cache for each post
  for (let i = 0; i < posts.length; i++) {
    const cached = getCachedResult(posts[i].text);
    if (cached) {
      results[i] = cached;
    } else {
      uncachedIndices.push(i);
    }
  }

  if (uncachedIndices.length === 0) return results;

  // Step 2: Try LLM classification for uncached posts
  const shouldTryLLM = llmAvailable || (Date.now() - llmLastFailure > LLM_COOLDOWN_MS);

  if (shouldTryLLM) {
    // Process in batches
    for (let batchStart = 0; batchStart < uncachedIndices.length; batchStart += LLM_BATCH_SIZE) {
      const batchIndices = uncachedIndices.slice(batchStart, batchStart + LLM_BATCH_SIZE);
      const batchTexts = batchIndices.map(i => posts[i].text);

      const llmResults = await classifyBatchWithLLM(batchTexts);

      if (llmResults) {
        llmAvailable = true;
        // Map LLM results back to original indices
        for (const llmResult of llmResults) {
          const originalIndex = batchIndices[llmResult.index];
          if (originalIndex !== undefined) {
            const classification = llmResultToClassification(llmResult);
            results[originalIndex] = classification;
            setCachedResult(posts[originalIndex].text, classification);
          }
        }
      } else {
        // LLM failed — mark unavailable and fall through to keyword fallback
        llmAvailable = false;
        llmLastFailure = Date.now();
        console.warn("[NLPClassifier] LLM unavailable, switching to enhanced keyword fallback");
      }
    }
  }

  // Step 3: Fill any remaining gaps with enhanced keyword fallback
  for (let i = 0; i < posts.length; i++) {
    if (!results[i]) {
      const result = classifyWithEnhancedKeywords(posts[i].text, posts[i].ticker);
      results[i] = result;
      setCachedResult(posts[i].text, result);
    }
  }

  return results;
}

/**
 * Get classifier health status.
 */
export function getClassifierStatus(): {
  llmAvailable: boolean;
  cacheSize: number;
  lastLLMFailure: number | null;
} {
  return {
    llmAvailable,
    cacheSize: classificationCache.size,
    lastLLMFailure: llmLastFailure || null,
  };
}

/**
 * Reset the classifier state (for testing).
 */
export function resetClassifierState(): void {
  classificationCache.clear();
  llmAvailable = true;
  llmLastFailure = 0;
}
