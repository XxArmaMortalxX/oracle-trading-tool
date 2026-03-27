/**
 * Tests for Sentiment Shift Detector module.
 * Validates severity classification, direction detection, shift detection logic,
 * and the full pipeline integration.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  classifySeverity,
  classifyDirection,
  detectShifts,
  type DetectedShift,
  type ShiftSeverity,
  type ShiftDirection,
} from "./sentimentShiftDetector";
import type { TickerSentimentSplit } from "./redditSentiment";

// ── classifySeverity tests ──
describe("classifySeverity", () => {
  it("returns DRAMATIC for magnitude >= 40", () => {
    expect(classifySeverity(40)).toBe("DRAMATIC");
    expect(classifySeverity(55)).toBe("DRAMATIC");
    expect(classifySeverity(100)).toBe("DRAMATIC");
  });

  it("returns MODERATE for magnitude >= 25 and < 40", () => {
    expect(classifySeverity(25)).toBe("MODERATE");
    expect(classifySeverity(30)).toBe("MODERATE");
    expect(classifySeverity(39)).toBe("MODERATE");
  });

  it("returns MINOR for magnitude >= 15 and < 25", () => {
    expect(classifySeverity(15)).toBe("MINOR");
    expect(classifySeverity(20)).toBe("MINOR");
    expect(classifySeverity(24)).toBe("MINOR");
  });

  it("returns null for magnitude < 15", () => {
    expect(classifySeverity(0)).toBeNull();
    expect(classifySeverity(10)).toBeNull();
    expect(classifySeverity(14)).toBeNull();
  });

  it("handles negative magnitudes (uses absolute value)", () => {
    expect(classifySeverity(-45)).toBe("DRAMATIC");
    expect(classifySeverity(-30)).toBe("MODERATE");
    expect(classifySeverity(-20)).toBe("MINOR");
    expect(classifySeverity(-5)).toBeNull();
  });
});

// ── classifyDirection tests ──
describe("classifyDirection", () => {
  it("detects BEARISH_TO_BULLISH", () => {
    expect(classifyDirection("SHORT_BIAS", "LONG_BIAS")).toBe("BEARISH_TO_BULLISH");
  });

  it("detects MIXED_TO_BULLISH", () => {
    expect(classifyDirection("MIXED", "LONG_BIAS")).toBe("MIXED_TO_BULLISH");
  });

  it("detects BULLISH_TO_BEARISH", () => {
    expect(classifyDirection("LONG_BIAS", "SHORT_BIAS")).toBe("BULLISH_TO_BEARISH");
  });

  it("detects MIXED_TO_BEARISH", () => {
    expect(classifyDirection("MIXED", "SHORT_BIAS")).toBe("MIXED_TO_BEARISH");
  });

  it("detects BULLISH_TO_MIXED", () => {
    expect(classifyDirection("LONG_BIAS", "MIXED")).toBe("BULLISH_TO_MIXED");
  });

  it("detects BEARISH_TO_MIXED", () => {
    expect(classifyDirection("SHORT_BIAS", "MIXED")).toBe("BEARISH_TO_MIXED");
  });

  it("returns null for same bias (no change)", () => {
    expect(classifyDirection("LONG_BIAS", "LONG_BIAS")).toBeNull();
    expect(classifyDirection("SHORT_BIAS", "SHORT_BIAS")).toBeNull();
    expect(classifyDirection("MIXED", "MIXED")).toBeNull();
  });
});

// ── detectShifts tests ──
describe("detectShifts", () => {
  function makeSplit(overrides: Partial<TickerSentimentSplit> & { ticker: string }): TickerSentimentSplit {
    return {
      totalMentions: 10,
      bullishCount: 5,
      bearishCount: 3,
      neutralCount: 2,
      bullishPct: 50,
      bearishPct: 30,
      neutralPct: 20,
      crowdBias: "MIXED",
      topBullishSignals: [],
      topBearishSignals: [],
      ...overrides,
    };
  }

  it("detects a dramatic bearish to bullish shift", () => {
    const current = new Map<string, TickerSentimentSplit>([
      ["AAPL", makeSplit({ ticker: "AAPL", bullishPct: 75, bearishPct: 15, crowdBias: "LONG_BIAS" })],
    ]);
    const previous = new Map<string, { bullishPct: number; bearishPct: number; crowdBias: string }>([
      ["AAPL", { bullishPct: 20, bearishPct: 65, crowdBias: "SHORT_BIAS" }],
    ]);

    const shifts = detectShifts(current, previous);
    expect(shifts).toHaveLength(1);
    expect(shifts[0].ticker).toBe("AAPL");
    expect(shifts[0].direction).toBe("BEARISH_TO_BULLISH");
    expect(shifts[0].severity).toBe("DRAMATIC");
    expect(shifts[0].shiftMagnitude).toBe(55);
  });

  it("detects a moderate mixed to bullish shift", () => {
    const current = new Map<string, TickerSentimentSplit>([
      ["TSLA", makeSplit({ ticker: "TSLA", bullishPct: 70, bearishPct: 20, crowdBias: "LONG_BIAS" })],
    ]);
    const previous = new Map<string, { bullishPct: number; bearishPct: number; crowdBias: string }>([
      ["TSLA", { bullishPct: 40, bearishPct: 35, crowdBias: "MIXED" }],
    ]);

    const shifts = detectShifts(current, previous);
    expect(shifts).toHaveLength(1);
    expect(shifts[0].direction).toBe("MIXED_TO_BULLISH");
    expect(shifts[0].severity).toBe("MODERATE");
    expect(shifts[0].shiftMagnitude).toBe(30);
  });

  it("detects a minor bullish to bearish shift", () => {
    const current = new Map<string, TickerSentimentSplit>([
      ["GME", makeSplit({ ticker: "GME", bullishPct: 25, bearishPct: 65, crowdBias: "SHORT_BIAS" })],
    ]);
    const previous = new Map<string, { bullishPct: number; bearishPct: number; crowdBias: string }>([
      ["GME", { bullishPct: 45, bearishPct: 30, crowdBias: "LONG_BIAS" }],
    ]);

    const shifts = detectShifts(current, previous);
    // Bullish delta = 25 - 45 = -20, magnitude = 20 → MINOR
    expect(shifts).toHaveLength(1);
    expect(shifts[0].direction).toBe("BULLISH_TO_BEARISH");
    expect(shifts[0].severity).toBe("MINOR");
  });

  it("ignores tickers with no previous data", () => {
    const current = new Map<string, TickerSentimentSplit>([
      ["NVDA", makeSplit({ ticker: "NVDA", bullishPct: 80, crowdBias: "LONG_BIAS" })],
    ]);
    const previous = new Map<string, { bullishPct: number; bearishPct: number; crowdBias: string }>();

    const shifts = detectShifts(current, previous);
    expect(shifts).toHaveLength(0);
  });

  it("ignores tickers with same bias (no directional change)", () => {
    const current = new Map<string, TickerSentimentSplit>([
      ["SPY", makeSplit({ ticker: "SPY", bullishPct: 80, bearishPct: 10, crowdBias: "LONG_BIAS" })],
    ]);
    const previous = new Map<string, { bullishPct: number; bearishPct: number; crowdBias: string }>([
      ["SPY", { bullishPct: 65, bearishPct: 20, crowdBias: "LONG_BIAS" }],
    ]);

    const shifts = detectShifts(current, previous);
    expect(shifts).toHaveLength(0); // Same bias, no directional shift
  });

  it("ignores tickers with too few mentions", () => {
    const current = new Map<string, TickerSentimentSplit>([
      ["TINY", makeSplit({ ticker: "TINY", bullishPct: 80, crowdBias: "LONG_BIAS", totalMentions: 2 })],
    ]);
    const previous = new Map<string, { bullishPct: number; bearishPct: number; crowdBias: string }>([
      ["TINY", { bullishPct: 20, bearishPct: 70, crowdBias: "SHORT_BIAS" }],
    ]);

    const shifts = detectShifts(current, previous);
    expect(shifts).toHaveLength(0); // totalMentions < 3
  });

  it("ignores shifts below minimum threshold", () => {
    const current = new Map<string, TickerSentimentSplit>([
      ["AMD", makeSplit({ ticker: "AMD", bullishPct: 55, bearishPct: 30, crowdBias: "MIXED" })],
    ]);
    const previous = new Map<string, { bullishPct: number; bearishPct: number; crowdBias: string }>([
      ["AMD", { bullishPct: 45, bearishPct: 40, crowdBias: "SHORT_BIAS" }],
    ]);

    // Bullish delta = 55 - 45 = 10, below MINOR threshold of 15
    const shifts = detectShifts(current, previous);
    expect(shifts).toHaveLength(0);
  });

  it("detects multiple shifts and sorts by severity", () => {
    const current = new Map<string, TickerSentimentSplit>([
      ["AAPL", makeSplit({ ticker: "AAPL", bullishPct: 80, bearishPct: 10, crowdBias: "LONG_BIAS" })],
      ["TSLA", makeSplit({ ticker: "TSLA", bullishPct: 65, bearishPct: 25, crowdBias: "LONG_BIAS" })],
      ["GME", makeSplit({ ticker: "GME", bullishPct: 70, bearishPct: 20, crowdBias: "LONG_BIAS" })],
    ]);
    const previous = new Map<string, { bullishPct: number; bearishPct: number; crowdBias: string }>([
      ["AAPL", { bullishPct: 20, bearishPct: 70, crowdBias: "SHORT_BIAS" }],  // +60 DRAMATIC
      ["TSLA", { bullishPct: 40, bearishPct: 45, crowdBias: "MIXED" }],       // +25 MODERATE
      ["GME", { bullishPct: 30, bearishPct: 55, crowdBias: "SHORT_BIAS" }],   // +40 DRAMATIC
    ]);

    const shifts = detectShifts(current, previous);
    expect(shifts).toHaveLength(3);
    // DRAMATIC shifts first, sorted by magnitude
    expect(shifts[0].ticker).toBe("AAPL"); // +60
    expect(shifts[0].severity).toBe("DRAMATIC");
    expect(shifts[1].ticker).toBe("GME");  // +40
    expect(shifts[1].severity).toBe("DRAMATIC");
    expect(shifts[2].ticker).toBe("TSLA"); // +25
    expect(shifts[2].severity).toBe("MODERATE");
  });

  it("handles empty current data", () => {
    const current = new Map<string, TickerSentimentSplit>();
    const previous = new Map<string, { bullishPct: number; bearishPct: number; crowdBias: string }>([
      ["AAPL", { bullishPct: 20, bearishPct: 70, crowdBias: "SHORT_BIAS" }],
    ]);

    const shifts = detectShifts(current, previous);
    expect(shifts).toHaveLength(0);
  });

  it("handles empty previous data", () => {
    const current = new Map<string, TickerSentimentSplit>([
      ["AAPL", makeSplit({ ticker: "AAPL", bullishPct: 80, crowdBias: "LONG_BIAS" })],
    ]);
    const previous = new Map<string, { bullishPct: number; bearishPct: number; crowdBias: string }>();

    const shifts = detectShifts(current, previous);
    expect(shifts).toHaveLength(0);
  });

  it("correctly computes shift magnitude as absolute value", () => {
    const current = new Map<string, TickerSentimentSplit>([
      ["INTC", makeSplit({ ticker: "INTC", bullishPct: 15, bearishPct: 75, crowdBias: "SHORT_BIAS" })],
    ]);
    const previous = new Map<string, { bullishPct: number; bearishPct: number; crowdBias: string }>([
      ["INTC", { bullishPct: 70, bearishPct: 20, crowdBias: "LONG_BIAS" }],
    ]);

    const shifts = detectShifts(current, previous);
    expect(shifts).toHaveLength(1);
    expect(shifts[0].shiftMagnitude).toBe(55); // |15 - 70| = 55
    expect(shifts[0].direction).toBe("BULLISH_TO_BEARISH");
    expect(shifts[0].severity).toBe("DRAMATIC");
  });
});

// ── Integration: route mock tests ──
describe("alerts routes", () => {
  // Mock the database and notification modules
  vi.mock("./sentimentShiftDetector", async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
      ...actual,
      // Override DB-dependent functions
      getRecentAlerts: vi.fn(async () => [
        {
          id: 1,
          ticker: "AAPL",
          previousBias: "SHORT_BIAS",
          newBias: "LONG_BIAS",
          previousBullishPct: 20,
          newBullishPct: 75,
          previousBearishPct: 65,
          newBearishPct: 15,
          shiftMagnitude: 55,
          severity: "DRAMATIC",
          direction: "BEARISH_TO_BULLISH",
          totalMentions: 15,
          notified: 1,
          dismissed: 0,
          createdAt: new Date("2026-03-27T10:00:00Z"),
        },
      ]),
      getAlertHistory: vi.fn(async () => []),
      dismissAlert: vi.fn(async () => {}),
      getActiveAlertCount: vi.fn(async () => 1),
      runShiftDetection: vi.fn(async () => ({ shifts: [], notified: false })),
      storeRedditSentimentSnapshots: vi.fn(async () => {}),
      getPreviousSentimentSnapshots: vi.fn(async () => new Map()),
      storeShiftAlerts: vi.fn(async () => []),
      notifyShiftAlerts: vi.fn(async () => false),
    };
  });

  // Mock other modules that make network calls
  vi.mock("./redditSentiment", () => ({
    fetchRedditSentimentCached: vi.fn(async () => ({
      fetchedAt: new Date(),
      totalPosts: 0,
      totalTickers: 0,
      tickers: new Map(),
    })),
    refreshRedditSentiment: vi.fn(async () => ({
      fetchedAt: new Date(),
      totalPosts: 0,
      totalTickers: 0,
      tickers: new Map(),
    })),
    getSentimentForTickers: vi.fn(async () => new Map()),
  }));

  vi.mock("./redditTracker", () => ({
    fetchRedditMentionsCached: vi.fn(async () => ({
      fetchedAt: new Date(),
      totalTickers: 0,
      tickers: [],
    })),
    runRedditScan: vi.fn(async () => ({
      totalTickers: 0,
      snapshotId: "test-snap",
      fetchedAt: new Date(),
      tickers: [],
    })),
    getLatestMentionsForTickers: vi.fn(async () => new Map()),
    getTopTrendingTickers: vi.fn(async () => []),
    getTickerVelocityHistory: vi.fn(async () => []),
  }));

  it("alerts.recent returns alert data", async () => {
    const { appRouter } = await import("./routers");
    type TrpcContext = import("./_core/context").TrpcContext;
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.alerts.recent();
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0].ticker).toBe("AAPL");
      expect(result[0].direction).toBe("BEARISH_TO_BULLISH");
      expect(result[0].severity).toBe("DRAMATIC");
    }
  });

  it("alerts.count returns active alert count", async () => {
    const { appRouter } = await import("./routers");
    type TrpcContext = import("./_core/context").TrpcContext;
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.alerts.count();
    expect(result).toHaveProperty("count");
    expect(typeof result.count).toBe("number");
  });
});
