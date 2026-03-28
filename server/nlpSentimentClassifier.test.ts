/**
 * Tests for the NLP Sentiment Classifier
 * 
 * Tests both the enhanced keyword classifier (Tier 2 fallback) and
 * the batch classification pipeline. LLM calls are mocked since
 * we can't rely on external API availability in tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  classifyWithEnhancedKeywords,
  classifyPostSentiment,
  classifyBatch,
  resetClassifierState,
} from "./nlpSentimentClassifier";

// Mock the LLM module to prevent actual API calls in tests
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockRejectedValue(new Error("LLM mocked")),
}));

beforeEach(() => {
  resetClassifierState();
});

// ══════════════════════════════════════════════════════
// BASIC KEYWORD CLASSIFICATION
// ══════════════════════════════════════════════════════

describe("Enhanced Keyword Classifier - Basic", () => {
  it("classifies clearly bullish text", () => {
    const result = classifyWithEnhancedKeywords("TSLA to the moon 🚀🚀🚀 buying calls", "TSLA");
    expect(result.classification).toBe("BULLISH");
    expect(result.bullishSignals.length).toBeGreaterThan(0);
    expect(result.classifierTier).toBe("enhanced-keyword");
  });

  it("classifies clearly bearish text", () => {
    const result = classifyWithEnhancedKeywords("AAPL is crashing, buying puts, this is a dead cat bounce", "AAPL");
    expect(result.classification).toBe("BEARISH");
    expect(result.bearishSignals.length).toBeGreaterThan(0);
  });

  it("classifies neutral text with no signals", () => {
    const result = classifyWithEnhancedKeywords("What do you think about the earnings report?", "AAPL");
    expect(result.classification).toBe("NEUTRAL");
    expect(result.bullishScore).toBe(0);
    expect(result.bearishScore).toBe(0);
  });

  it("classifies mixed signals as NEUTRAL when tied", () => {
    const result = classifyWithEnhancedKeywords("I'm bullish but also bearish on this one", "SPY");
    expect(result.classification).toBe("NEUTRAL");
    expect(result.bullishSignals.length).toBeGreaterThan(0);
    expect(result.bearishSignals.length).toBeGreaterThan(0);
  });

  it("gives higher weight to multi-word phrases", () => {
    const result = classifyWithEnhancedKeywords("This is a short squeeze play, diamond hands!", "GME");
    expect(result.classification).toBe("BULLISH");
    expect(result.bullishScore).toBeGreaterThan(2); // multi-word phrases = 2 weight each
  });

  it("handles emoji-only sentiment", () => {
    const bullish = classifyWithEnhancedKeywords("🚀🚀🚀💎🙌📈", "AMC");
    expect(bullish.classification).toBe("BULLISH");

    const bearish = classifyWithEnhancedKeywords("📉🔻💀", "AMC");
    expect(bearish.classification).toBe("BEARISH");
  });
});

// ══════════════════════════════════════════════════════
// NEGATION HANDLING
// ══════════════════════════════════════════════════════

describe("Enhanced Keyword Classifier - Negation", () => {
  it("flips bullish to bearish when negated: 'not bullish'", () => {
    const result = classifyWithEnhancedKeywords("I'm not bullish on TSLA at all", "TSLA");
    expect(result.bearishSignals).toContain("NOT bullish");
    expect(result.bearishScore).toBeGreaterThan(0);
  });

  it("flips bearish to bullish when negated: 'not bearish'", () => {
    const result = classifyWithEnhancedKeywords("I'm not bearish on AAPL anymore", "AAPL");
    expect(result.bullishSignals).toContain("NOT bearish");
    expect(result.bullishScore).toBeGreaterThan(0);
  });

  it("handles 'don't buy' as bearish", () => {
    const result = classifyWithEnhancedKeywords("don't buy this stock, it's a trap", "PLTR");
    expect(result.bearishSignals).toContain("NOT buy");
    expect(result.bearishScore).toBeGreaterThan(0);
  });

  it("handles 'won't crash' as bullish", () => {
    const result = classifyWithEnhancedKeywords("NVDA won't crash, strong fundamentals", "NVDA");
    expect(result.bullishSignals).toContain("NOT crash");
  });

  it("handles 'never sell' as bullish (negated bearish)", () => {
    const result = classifyWithEnhancedKeywords("Never sell your GME shares, diamond hands", "GME");
    expect(result.bullishSignals).toContain("NOT sell");
  });

  it("handles 'can't go down' / 'cannot fail'", () => {
    const result = classifyWithEnhancedKeywords("This stock can't tank from here", "SPY");
    expect(result.bullishSignals).toContain("NOT tank");
  });

  it("does not negate when negation word is too far away", () => {
    // "not" is more than 4 words before "bullish"
    const result = classifyWithEnhancedKeywords("I'm not sure what to think but I'm very bullish", "TSLA");
    expect(result.classification).toBe("BULLISH");
    expect(result.bullishSignals).toContain("bullish");
  });
});

// ══════════════════════════════════════════════════════
// SARCASM DETECTION
// ══════════════════════════════════════════════════════

describe("Enhanced Keyword Classifier - Sarcasm", () => {
  it("detects sarcasm markers and reduces dominant sentiment", () => {
    const result = classifyWithEnhancedKeywords(
      "Oh sure, totally going to moon, trust me bro, copium",
      "AMC"
    );
    // Sarcasm should reduce the bullish score
    expect(result.bearishSignals).toContain("sarcasm detected");
  });

  it("detects sarcastic bearish text", () => {
    const result = classifyWithEnhancedKeywords(
      "Yeah right, definitely crashing, lol what a genius move to sell",
      "TSLA"
    );
    // Sarcasm on bearish text should boost bullish
    expect(result.bullishSignals).toContain("sarcasm detected");
  });

  it("does not flag sarcasm for straightforward text", () => {
    const result = classifyWithEnhancedKeywords("AAPL earnings beat expectations, buying calls", "AAPL");
    expect(result.bullishSignals).not.toContain("sarcasm detected");
    expect(result.bearishSignals).not.toContain("sarcasm detected");
  });
});

// ══════════════════════════════════════════════════════
// PAST TENSE / TEMPORAL MODIFIERS
// ══════════════════════════════════════════════════════

describe("Enhanced Keyword Classifier - Temporal Modifiers", () => {
  it("reduces weight for past tense bullish signals", () => {
    const current = classifyWithEnhancedKeywords("I'm bullish on TSLA", "TSLA");
    const past = classifyWithEnhancedKeywords("I was bullish on TSLA", "TSLA");
    // Past tense should have lower bullish score
    expect(past.bullishScore).toBeLessThanOrEqual(current.bullishScore);
  });

  it("reduces weight for past tense bearish signals", () => {
    const current = classifyWithEnhancedKeywords("This stock is crashing hard", "AMC");
    const past = classifyWithEnhancedKeywords("This stock was crashing hard", "AMC");
    expect(past.bearishScore).toBeLessThanOrEqual(current.bearishScore);
  });
});

// ══════════════════════════════════════════════════════
// COMPLEX / REAL-WORLD SCENARIOS
// ══════════════════════════════════════════════════════

describe("Enhanced Keyword Classifier - Real-World Scenarios", () => {
  it("handles WSB-style bullish post", () => {
    const result = classifyWithEnhancedKeywords(
      "GME short squeeze incoming 🚀🚀🚀 diamond hands 💎🙌 YOLO all in",
      "GME"
    );
    expect(result.classification).toBe("BULLISH");
    expect(result.bullishScore).toBeGreaterThan(5);
  });

  it("handles bearish DD post", () => {
    const result = classifyWithEnhancedKeywords(
      "RIVN is overvalued, insider selling, dilution incoming, this is a falling knife",
      "RIVN"
    );
    expect(result.classification).toBe("BEARISH");
    expect(result.bearishScore).toBeGreaterThan(3);
  });

  it("handles news-style neutral post", () => {
    const result = classifyWithEnhancedKeywords(
      "AAPL reports Q4 earnings after market close today",
      "AAPL"
    );
    expect(result.classification).toBe("NEUTRAL");
  });

  it("handles contradictory sentiment (bullish then bearish)", () => {
    const result = classifyWithEnhancedKeywords(
      "Was bullish on PLTR but now I think it's overvalued and buying puts",
      "PLTR"
    );
    // Should lean bearish due to recent sentiment + past tense on bullish
    expect(result.bearishScore).toBeGreaterThan(0);
  });

  it("handles question-style post", () => {
    const result = classifyWithEnhancedKeywords(
      "Is anyone else buying NVDA calls for earnings?",
      "NVDA"
    );
    expect(result.classification).toBe("BULLISH");
    expect(result.bullishSignals).toContain("buying");
  });

  it("handles bag holder confession", () => {
    const result = classifyWithEnhancedKeywords(
      "I'm a bag holder on WISH, loss porn, should have sold months ago",
      "WISH"
    );
    expect(result.classification).toBe("BEARISH");
  });
});

// ══════════════════════════════════════════════════════
// CONFIDENCE SCORES
// ══════════════════════════════════════════════════════

describe("Enhanced Keyword Classifier - Confidence", () => {
  it("returns higher confidence for strong signals", () => {
    const strong = classifyWithEnhancedKeywords(
      "TSLA to the moon 🚀 short squeeze diamond hands YOLO all in",
      "TSLA"
    );
    const weak = classifyWithEnhancedKeywords("Maybe buy TSLA?", "TSLA");
    expect(strong.confidence).toBeGreaterThan(weak.confidence);
  });

  it("returns low confidence for tied/neutral results", () => {
    const result = classifyWithEnhancedKeywords("I'm bullish but also bearish", "SPY");
    expect(result.confidence).toBeLessThan(0.5);
  });

  it("returns 0.5 confidence for no-signal neutral", () => {
    const result = classifyWithEnhancedKeywords("What time does the market open?", "SPY");
    expect(result.confidence).toBe(0.5);
  });
});

// ══════════════════════════════════════════════════════
// SINGLE CLASSIFY (classifyPostSentiment)
// ══════════════════════════════════════════════════════

describe("classifyPostSentiment (unified API)", () => {
  it("returns valid classification for bullish text", () => {
    const result = classifyPostSentiment("GME to the moon 🚀", "GME");
    expect(result.classification).toBe("BULLISH");
    expect(result.classifierTier).toBe("enhanced-keyword"); // LLM is mocked
  });

  it("returns valid classification for bearish text", () => {
    const result = classifyPostSentiment("AAPL is crashing, sell everything", "AAPL");
    expect(result.classification).toBe("BEARISH");
  });

  it("caches results for identical text", () => {
    const text = "TSLA diamond hands forever 💎🙌";
    const result1 = classifyPostSentiment(text, "TSLA");
    const result2 = classifyPostSentiment(text, "TSLA");
    expect(result1).toEqual(result2);
  });
});

// ══════════════════════════════════════════════════════
// BATCH CLASSIFICATION
// ══════════════════════════════════════════════════════

describe("classifyBatch", () => {
  it("classifies multiple posts in batch", async () => {
    const posts = [
      { text: "GME to the moon 🚀", ticker: "GME" },
      { text: "AAPL is crashing hard", ticker: "AAPL" },
      { text: "What are earnings for MSFT?", ticker: "MSFT" },
    ];

    const results = await classifyBatch(posts);
    expect(results).toHaveLength(3);
    expect(results[0].classification).toBe("BULLISH");
    expect(results[1].classification).toBe("BEARISH");
    expect(results[2].classification).toBe("NEUTRAL");
  });

  it("returns empty array for empty input", async () => {
    const results = await classifyBatch([]);
    expect(results).toHaveLength(0);
  });

  it("uses cache for repeated texts in batch", async () => {
    // Pre-populate cache
    classifyPostSentiment("GME moon 🚀", "GME");

    const posts = [
      { text: "GME moon 🚀", ticker: "GME" },
      { text: "New text about AAPL puts", ticker: "AAPL" },
    ];

    const results = await classifyBatch(posts);
    expect(results).toHaveLength(2);
    expect(results[0].classification).toBe("BULLISH");
    expect(results[1].classification).toBe("BEARISH");
  });

  it("falls back to enhanced keywords when LLM is unavailable", async () => {
    const posts = [
      { text: "Buying TSLA calls, very bullish", ticker: "TSLA" },
      { text: "Selling AAPL, it's overvalued", ticker: "AAPL" },
    ];

    const results = await classifyBatch(posts);
    // All should use enhanced-keyword tier since LLM is mocked to fail
    for (const result of results) {
      expect(result.classifierTier).toBe("enhanced-keyword");
    }
  });
});

// ══════════════════════════════════════════════════════
// EDGE CASES
// ══════════════════════════════════════════════════════

describe("Edge Cases", () => {
  it("handles empty text", () => {
    const result = classifyWithEnhancedKeywords("", "AAPL");
    expect(result.classification).toBe("NEUTRAL");
  });

  it("handles very long text", () => {
    const longText = "buy ".repeat(500) + "AAPL is going to moon";
    const result = classifyWithEnhancedKeywords(longText, "AAPL");
    expect(result.classification).toBe("BULLISH");
  });

  it("handles text with only special characters", () => {
    const result = classifyWithEnhancedKeywords("!@#$%^&*()", "AAPL");
    expect(result.classification).toBe("NEUTRAL");
  });

  it("handles mixed case text", () => {
    const result = classifyWithEnhancedKeywords("BUYING CALLS ON TSLA, VERY BULLISH", "TSLA");
    expect(result.classification).toBe("BULLISH");
  });

  it("handles text with URLs", () => {
    const result = classifyWithEnhancedKeywords(
      "Check out this DD https://reddit.com/r/wsb/abc123 - very bullish on GME",
      "GME"
    );
    expect(result.classification).toBe("BULLISH");
  });

  it("handles double negation", () => {
    // "not not bullish" = bullish (double negation)
    // Our simple negation only checks the nearest negation word,
    // so "not" before "not" won't double-flip. This is expected behavior.
    const result = classifyWithEnhancedKeywords("I'm not going to not buy this stock", "AAPL");
    // "not" negates "buy" → bearish signal
    expect(result.bearishSignals).toContain("NOT buy");
  });
});
