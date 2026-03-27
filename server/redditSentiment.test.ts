/**
 * Tests for Reddit sentiment classification module.
 * Validates keyword matching, scoring, sentiment split computation,
 * ticker extraction, and crowd bias determination.
 */
import { describe, expect, it, vi } from "vitest";
import {
  classifyPostSentiment,
  computeSentimentSplit,
  extractTickers,
  type PostMention,
} from "./redditSentiment";

// ── classifyPostSentiment tests ──
describe("classifyPostSentiment", () => {
  it("classifies strongly bullish post", () => {
    const result = classifyPostSentiment(
      "$AAPL to the moon 🚀🚀 diamond hands 💎🙌 YOLO calls",
      "AAPL"
    );
    expect(result.classification).toBe("BULLISH");
    expect(result.bullishScore).toBeGreaterThan(result.bearishScore);
    expect(result.bullishSignals.length).toBeGreaterThan(0);
  });

  it("classifies strongly bearish post", () => {
    const result = classifyPostSentiment(
      "$TSLA puts printing, this stock is overvalued and going to crash 📉 rug pull incoming",
      "TSLA"
    );
    expect(result.classification).toBe("BEARISH");
    expect(result.bearishScore).toBeGreaterThan(result.bullishScore);
    expect(result.bearishSignals.length).toBeGreaterThan(0);
  });

  it("classifies neutral post with no signals", () => {
    const result = classifyPostSentiment(
      "$GME earnings report coming next week, what do you think?",
      "GME"
    );
    expect(result.classification).toBe("NEUTRAL");
    expect(result.bullishScore).toBe(0);
    expect(result.bearishScore).toBe(0);
  });

  it("detects multi-word bullish phrases", () => {
    const result = classifyPostSentiment(
      "Loading up on $AMC, this is going to the moon, diamond hands baby",
      "AMC"
    );
    expect(result.classification).toBe("BULLISH");
    expect(result.bullishSignals).toEqual(
      expect.arrayContaining(["to the moon"])
    );
  });

  it("detects multi-word bearish phrases", () => {
    const result = classifyPostSentiment(
      "$WISH is a falling knife, dead cat bounce, bag holders everywhere",
      "WISH"
    );
    expect(result.classification).toBe("BEARISH");
    expect(result.bearishSignals.length).toBeGreaterThan(0);
  });

  it("handles emoji-based signals", () => {
    const bullish = classifyPostSentiment("$NVDA 🚀🚀🚀", "NVDA");
    expect(bullish.classification).toBe("BULLISH");
    expect(bullish.bullishSignals).toEqual(expect.arrayContaining(["🚀"]));

    const bearish = classifyPostSentiment("$INTC 📉📉📉 🐻", "INTC");
    expect(bearish.classification).toBe("BEARISH");
  });

  it("handles mixed signals — higher bullish wins", () => {
    const result = classifyPostSentiment(
      "$SPY calls but also some puts, bullish overall, going up",
      "SPY"
    );
    expect(result.classification).toBe("BULLISH");
    expect(result.bullishScore).toBeGreaterThan(result.bearishScore);
  });

  it("handles mixed signals — tie results in NEUTRAL", () => {
    const result = classifyPostSentiment(
      "$AAPL buy or sell?",
      "AAPL"
    );
    // "buy" = 1 bullish, "sell" = 1 bearish → tie → NEUTRAL
    expect(result.classification).toBe("NEUTRAL");
  });

  it("is case insensitive for keyword matching", () => {
    const result = classifyPostSentiment(
      "$GME BULLISH SQUEEZE INCOMING, MOON SOON",
      "GME"
    );
    expect(result.classification).toBe("BULLISH");
  });

  it("handles empty title", () => {
    const result = classifyPostSentiment("", "AAPL");
    expect(result.classification).toBe("NEUTRAL");
    expect(result.bullishScore).toBe(0);
    expect(result.bearishScore).toBe(0);
  });
});

// ── extractTickers tests ──
describe("extractTickers", () => {
  it("extracts $TICKER format", () => {
    const tickers = extractTickers("$AAPL is going up, $TSLA too");
    expect(tickers).toContain("AAPL");
    expect(tickers).toContain("TSLA");
  });

  it("extracts uppercase tickers from text", () => {
    const tickers = extractTickers("NVDA and AMD are the play today");
    expect(tickers).toContain("NVDA");
    expect(tickers).toContain("AMD");
  });

  it("filters out common words", () => {
    const tickers = extractTickers("THE BEST STOCK TO BUY NOW IS AAPL");
    expect(tickers).not.toContain("THE");
    expect(tickers).not.toContain("BEST");
    expect(tickers).not.toContain("BUY");
    expect(tickers).not.toContain("NOW");
    expect(tickers).toContain("AAPL");
  });

  it("returns empty array for no tickers", () => {
    const tickers = extractTickers("this is just a regular sentence with no tickers");
    expect(tickers).toEqual([]);
  });

  it("deduplicates tickers", () => {
    const tickers = extractTickers("$AAPL $AAPL AAPL");
    const aaplCount = tickers.filter(t => t === "AAPL").length;
    expect(aaplCount).toBe(1);
  });

  it("handles tickers with numbers", () => {
    // Tickers must be 2-5 letters only (no numbers)
    const tickers = extractTickers("$BRK2 is not valid but $MSFT is");
    expect(tickers).toContain("MSFT");
  });
});

// ── computeSentimentSplit tests ──
describe("computeSentimentSplit", () => {
  it("computes correct percentages for all bullish", () => {
    const mentions: PostMention[] = [
      { title: "AAPL to the moon 🚀", subreddit: "wsb", upvotes: 100, createdAt: new Date(), classification: "BULLISH", bullishSignals: ["moon", "🚀"], bearishSignals: [] },
      { title: "AAPL calls printing", subreddit: "wsb", upvotes: 50, createdAt: new Date(), classification: "BULLISH", bullishSignals: ["calls"], bearishSignals: [] },
    ];
    const result = computeSentimentSplit("AAPL", mentions);
    expect(result.ticker).toBe("AAPL");
    expect(result.bullishPct).toBe(100);
    expect(result.bearishPct).toBe(0);
    expect(result.neutralPct).toBe(0);
    expect(result.crowdBias).toBe("LONG_BIAS");
  });

  it("computes correct percentages for all bearish", () => {
    const mentions: PostMention[] = [
      { title: "TSLA puts", subreddit: "wsb", upvotes: 100, createdAt: new Date(), classification: "BEARISH", bullishSignals: [], bearishSignals: ["puts"] },
      { title: "TSLA crash", subreddit: "wsb", upvotes: 50, createdAt: new Date(), classification: "BEARISH", bullishSignals: [], bearishSignals: ["crash"] },
    ];
    const result = computeSentimentSplit("TSLA", mentions);
    expect(result.bullishPct).toBe(0);
    expect(result.bearishPct).toBe(100);
    expect(result.crowdBias).toBe("SHORT_BIAS");
  });

  it("computes mixed sentiment correctly", () => {
    const mentions: PostMention[] = [
      { title: "AAPL bullish", subreddit: "wsb", upvotes: 100, createdAt: new Date(), classification: "BULLISH", bullishSignals: ["bullish"], bearishSignals: [] },
      { title: "AAPL bearish", subreddit: "wsb", upvotes: 50, createdAt: new Date(), classification: "BEARISH", bullishSignals: [], bearishSignals: ["bearish"] },
      { title: "AAPL neutral", subreddit: "wsb", upvotes: 25, createdAt: new Date(), classification: "NEUTRAL", bullishSignals: [], bearishSignals: [] },
    ];
    const result = computeSentimentSplit("AAPL", mentions);
    // 1/3 = 33.33... rounds to 33 or 34 depending on implementation
    expect(result.bullishPct).toBeGreaterThanOrEqual(33);
    expect(result.bullishPct).toBeLessThanOrEqual(34);
    expect(result.bearishPct).toBeGreaterThanOrEqual(33);
    expect(result.bearishPct).toBeLessThanOrEqual(34);
    expect(result.neutralPct).toBeGreaterThanOrEqual(33);
    expect(result.neutralPct).toBeLessThanOrEqual(34);
    expect(result.crowdBias).toBe("MIXED");
  });

  it("determines LONG_BIAS when bullish > 60%", () => {
    const mentions: PostMention[] = Array.from({ length: 7 }, () => ({
      title: "bullish", subreddit: "wsb", upvotes: 10, createdAt: new Date(),
      classification: "BULLISH" as const, bullishSignals: ["bullish"], bearishSignals: [],
    })).concat(Array.from({ length: 3 }, () => ({
      title: "bearish", subreddit: "wsb", upvotes: 10, createdAt: new Date(),
      classification: "BEARISH" as const, bullishSignals: [], bearishSignals: ["bearish"],
    })));
    const result = computeSentimentSplit("TEST", mentions);
    expect(result.bullishPct).toBe(70);
    expect(result.bearishPct).toBe(30);
    expect(result.crowdBias).toBe("LONG_BIAS");
  });

  it("determines SHORT_BIAS when bearish > 60%", () => {
    const mentions: PostMention[] = Array.from({ length: 3 }, () => ({
      title: "bullish", subreddit: "wsb", upvotes: 10, createdAt: new Date(),
      classification: "BULLISH" as const, bullishSignals: ["bullish"], bearishSignals: [],
    })).concat(Array.from({ length: 7 }, () => ({
      title: "bearish", subreddit: "wsb", upvotes: 10, createdAt: new Date(),
      classification: "BEARISH" as const, bullishSignals: [], bearishSignals: ["bearish"],
    })));
    const result = computeSentimentSplit("TEST", mentions);
    expect(result.bullishPct).toBe(30);
    expect(result.bearishPct).toBe(70);
    expect(result.crowdBias).toBe("SHORT_BIAS");
  });

  it("handles empty mentions", () => {
    const result = computeSentimentSplit("EMPTY", []);
    expect(result.totalMentions).toBe(0);
    expect(result.bullishPct).toBe(0);
    expect(result.bearishPct).toBe(0);
    expect(result.neutralPct).toBe(0);
    expect(result.crowdBias).toBe("MIXED");
  });

  it("tracks top bullish and bearish signals", () => {
    const mentions: PostMention[] = [
      { title: "moon rocket", subreddit: "wsb", upvotes: 100, createdAt: new Date(), classification: "BULLISH", bullishSignals: ["moon", "🚀", "calls"], bearishSignals: [] },
      { title: "moon again", subreddit: "wsb", upvotes: 50, createdAt: new Date(), classification: "BULLISH", bullishSignals: ["moon", "bullish"], bearishSignals: [] },
      { title: "crash dump", subreddit: "wsb", upvotes: 30, createdAt: new Date(), classification: "BEARISH", bullishSignals: [], bearishSignals: ["crash", "dump"] },
    ];
    const result = computeSentimentSplit("TEST", mentions);
    expect(result.topBullishSignals.length).toBeGreaterThan(0);
    expect(result.topBullishSignals.length).toBeLessThanOrEqual(3);
    expect(result.topBearishSignals.length).toBeGreaterThan(0);
    expect(result.topBearishSignals.length).toBeLessThanOrEqual(3);
  });
});

// NOTE: Router-level tests for reddit.sentiment are in oracleScanner.test.ts
// where the full module mock is set up. This file tests pure functions only.
