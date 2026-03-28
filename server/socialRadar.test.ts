import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock all external platform fetchers ──

// Mock redditSentiment
vi.mock("./redditSentiment", () => ({
  fetchRedditSentimentCached: vi.fn().mockResolvedValue({
    fetchedAt: new Date(),
    totalPosts: 100,
    totalTickers: 5,
    tickers: new Map([
      ["AAPL", {
        ticker: "AAPL",
        totalMentions: 15,
        bullishCount: 10,
        bearishCount: 3,
        neutralCount: 2,
        bullishPct: 67,
        bearishPct: 20,
        neutralPct: 13,
        crowdBias: "LONG_BIAS",
        topBullishSignals: ["moon", "calls"],
        topBearishSignals: ["puts"],
      }],
      ["TSLA", {
        ticker: "TSLA",
        totalMentions: 20,
        bullishCount: 5,
        bearishCount: 12,
        neutralCount: 3,
        bullishPct: 25,
        bearishPct: 60,
        neutralPct: 15,
        crowdBias: "SHORT_BIAS",
        topBullishSignals: ["buy"],
        topBearishSignals: ["puts", "overvalued"],
      }],
    ]),
  }),
  refreshRedditSentiment: vi.fn().mockResolvedValue({
    fetchedAt: new Date(),
    totalPosts: 100,
    totalTickers: 5,
    tickers: new Map(),
  }),
  getSentimentForTickers: vi.fn().mockResolvedValue(new Map()),
  classifyPostSentiment: vi.fn().mockReturnValue({
    classification: "NEUTRAL",
    bullishSignals: [],
    bearishSignals: [],
    bullishScore: 0,
    bearishScore: 0,
  }),
  computeSentimentSplit: vi.fn().mockReturnValue({
    ticker: "TEST",
    totalMentions: 0,
    bullishCount: 0,
    bearishCount: 0,
    neutralCount: 0,
    bullishPct: 0,
    bearishPct: 0,
    neutralPct: 0,
    crowdBias: "MIXED",
    topBullishSignals: [],
    topBearishSignals: [],
  }),
  extractTickers: vi.fn().mockReturnValue([]),
}));

// Mock redditTracker
vi.mock("./redditTracker", () => ({
  fetchRedditMentionsCached: vi.fn().mockResolvedValue({
    fetchedAt: new Date(),
    totalTickers: 5,
    tickers: [
      { ticker: "AAPL", name: "Apple Inc", mentions: 30, mentions24hAgo: 20, velocityPct: 50, velocitySignal: "RISING", rank: 1, rank24hAgo: 2, upvotes: 500 },
      { ticker: "TSLA", name: "Tesla Inc", mentions: 25, mentions24hAgo: 30, velocityPct: -17, velocitySignal: "STABLE", rank: 2, rank24hAgo: 1, upvotes: 400 },
      { ticker: "GME", name: "GameStop", mentions: 10, mentions24hAgo: 5, velocityPct: 100, velocitySignal: "SURGING", rank: 3, rank24hAgo: 5, upvotes: 200 },
    ],
  }),
  runRedditScan: vi.fn().mockResolvedValue({
    fetchedAt: new Date(),
    totalTickers: 5,
    snapshotId: "test-snap",
    tickers: [],
  }),
  getLatestMentionsForTickers: vi.fn().mockResolvedValue(new Map()),
  getTopTrendingTickers: vi.fn().mockResolvedValue([]),
  getTickerVelocityHistory: vi.fn().mockResolvedValue([]),
}));

// Mock xTracker
vi.mock("./xTracker", () => ({
  fetchXMentionsCached: vi.fn().mockResolvedValue({
    fetchedAt: new Date(),
    totalTweets: 50,
    totalTickers: 3,
    tickers: new Map([
      ["AAPL", {
        ticker: "AAPL",
        mentions: 12,
        engagement: 3500,
        sentiment: {
          ticker: "AAPL",
          totalMentions: 12,
          bullishCount: 8,
          bearishCount: 2,
          neutralCount: 2,
          bullishPct: 67,
          bearishPct: 17,
          neutralPct: 16,
          crowdBias: "LONG_BIAS",
          topBullishSignals: ["bullish"],
          topBearishSignals: [],
        },
      }],
      ["NVDA", {
        ticker: "NVDA",
        mentions: 8,
        engagement: 2000,
        sentiment: {
          ticker: "NVDA",
          totalMentions: 8,
          bullishCount: 6,
          bearishCount: 1,
          neutralCount: 1,
          bullishPct: 75,
          bearishPct: 13,
          neutralPct: 12,
          crowdBias: "LONG_BIAS",
          topBullishSignals: ["moon"],
          topBearishSignals: [],
        },
      }],
    ]),
  }),
  refreshXMentions: vi.fn().mockResolvedValue({
    fetchedAt: new Date(),
    totalTweets: 50,
    totalTickers: 3,
    tickers: new Map(),
  }),
}));

// Mock tiktokTracker
vi.mock("./tiktokTracker", () => ({
  fetchTikTokMentionsCached: vi.fn().mockResolvedValue({
    fetchedAt: new Date(),
    totalVideos: 30,
    totalTickers: 2,
    tickers: new Map([
      ["AAPL", {
        ticker: "AAPL",
        mentions: 5,
        engagement: 15000,
        sentiment: {
          ticker: "AAPL",
          totalMentions: 5,
          bullishCount: 4,
          bearishCount: 0,
          neutralCount: 1,
          bullishPct: 80,
          bearishPct: 0,
          neutralPct: 20,
          crowdBias: "LONG_BIAS",
          topBullishSignals: ["rocket"],
          topBearishSignals: [],
        },
      }],
      ["TSLA", {
        ticker: "TSLA",
        mentions: 3,
        engagement: 8000,
        sentiment: {
          ticker: "TSLA",
          totalMentions: 3,
          bullishCount: 1,
          bearishCount: 2,
          neutralCount: 0,
          bullishPct: 33,
          bearishPct: 67,
          neutralPct: 0,
          crowdBias: "SHORT_BIAS",
          topBullishSignals: [],
          topBearishSignals: ["puts"],
        },
      }],
    ]),
  }),
  refreshTikTokMentions: vi.fn().mockResolvedValue({
    fetchedAt: new Date(),
    totalVideos: 30,
    totalTickers: 2,
    tickers: new Map(),
  }),
}));

// Mock shift detector
vi.mock("./sentimentShiftDetector", () => ({
  runShiftDetection: vi.fn().mockResolvedValue({ shifts: [], notified: false }),
  getRecentAlerts: vi.fn().mockResolvedValue([]),
  getAlertHistory: vi.fn().mockResolvedValue([]),
  dismissAlert: vi.fn().mockResolvedValue(true),
  getActiveAlertCount: vi.fn().mockResolvedValue(0),
}));

// Now import the aggregator (after mocks are set up)
import { buildUnifiedRadar, refreshUnifiedRadar } from "./socialRadarAggregator";

describe("Social Radar Aggregator", () => {
  describe("buildUnifiedRadar", () => {
    it("merges data from all three platforms", async () => {
      const result = await buildUnifiedRadar();

      expect(result.totalTickers).toBeGreaterThan(0);
      expect(result.totalContentScanned.reddit).toBe(100);
      expect(result.totalContentScanned.x).toBe(50);
      expect(result.totalContentScanned.tiktok).toBe(30);
      expect(result.totalContentScanned.total).toBe(180);
    });

    it("AAPL appears on all 3 platforms", async () => {
      const result = await buildUnifiedRadar();
      const aapl = result.tickers.find(t => t.ticker === "AAPL");

      expect(aapl).toBeDefined();
      expect(aapl!.platformCount).toBe(3);
      expect(aapl!.platforms.map(p => p.platform).sort()).toEqual(["reddit", "tiktok", "x"]);
    });

    it("TSLA appears on Reddit and TikTok", async () => {
      const result = await buildUnifiedRadar();
      const tsla = result.tickers.find(t => t.ticker === "TSLA");

      expect(tsla).toBeDefined();
      expect(tsla!.platformCount).toBe(2);
      expect(tsla!.platforms.map(p => p.platform).sort()).toEqual(["reddit", "tiktok"]);
    });

    it("NVDA appears only on X", async () => {
      const result = await buildUnifiedRadar();
      const nvda = result.tickers.find(t => t.ticker === "NVDA");

      expect(nvda).toBeDefined();
      expect(nvda!.platformCount).toBe(1);
      expect(nvda!.platforms[0].platform).toBe("x");
    });

    it("GME appears only on Reddit", async () => {
      const result = await buildUnifiedRadar();
      const gme = result.tickers.find(t => t.ticker === "GME");

      expect(gme).toBeDefined();
      expect(gme!.platformCount).toBe(1);
      expect(gme!.platforms[0].platform).toBe("reddit");
    });

    it("combines total mentions across platforms", async () => {
      const result = await buildUnifiedRadar();
      const aapl = result.tickers.find(t => t.ticker === "AAPL");

      // Reddit: 30, X: 12, TikTok: 5
      expect(aapl!.totalMentions).toBe(47);
    });

    it("combines total engagement across platforms", async () => {
      const result = await buildUnifiedRadar();
      const aapl = result.tickers.find(t => t.ticker === "AAPL");

      // Reddit upvotes: 500, X engagement: 3500, TikTok engagement: 15000
      expect(aapl!.totalEngagement).toBe(19000);
    });

    it("computes combined sentiment across platforms", async () => {
      const result = await buildUnifiedRadar();
      const aapl = result.tickers.find(t => t.ticker === "AAPL");

      // AAPL is bullish on all platforms
      expect(aapl!.combinedSentiment.crowdBias).toBe("LONG_BIAS");
      expect(aapl!.combinedSentiment.bullishPct).toBeGreaterThan(50);
    });

    it("sorts by platform count first, then total mentions", async () => {
      const result = await buildUnifiedRadar();
      const tickers = result.tickers;

      // AAPL (3 platforms) should be first
      expect(tickers[0].ticker).toBe("AAPL");

      // TSLA (2 platforms) should be second
      expect(tickers[1].ticker).toBe("TSLA");
    });

    it("preserves Reddit velocity data", async () => {
      const result = await buildUnifiedRadar();
      const aapl = result.tickers.find(t => t.ticker === "AAPL");

      expect(aapl!.redditVelocity).toBeDefined();
      expect(aapl!.redditVelocity!.velocityPct).toBe(50);
      expect(aapl!.redditVelocity!.velocitySignal).toBe("RISING");
    });

    it("handles platform failures gracefully", async () => {
      // Make X tracker fail
      const { fetchXMentionsCached } = await import("./xTracker");
      (fetchXMentionsCached as any).mockRejectedValueOnce(new Error("X API down"));

      const result = await buildUnifiedRadar();
      // Should still have data from Reddit and TikTok
      expect(result.totalTickers).toBeGreaterThan(0);
      expect(result.totalContentScanned.x).toBe(0);
    });
  });

  describe("refreshUnifiedRadar", () => {
    it("returns platform results and snapshot", async () => {
      const result = await refreshUnifiedRadar();

      expect(result.snapshot).toBeDefined();
      expect(result.platformResults).toBeDefined();
      expect(result.platformResults.reddit).toBeDefined();
      expect(result.platformResults.x).toBeDefined();
      expect(result.platformResults.tiktok).toBeDefined();
    });
  });

  describe("Combined sentiment merging", () => {
    it("TSLA has SHORT_BIAS from combined Reddit + TikTok bearish sentiment", async () => {
      const result = await buildUnifiedRadar();
      const tsla = result.tickers.find(t => t.ticker === "TSLA");

      // Reddit: 25% bullish / 60% bearish, TikTok: 33% bullish / 67% bearish
      // Combined should be bearish-leaning
      expect(tsla!.combinedSentiment.bearishPct).toBeGreaterThan(tsla!.combinedSentiment.bullishPct);
      expect(tsla!.combinedSentiment.crowdBias).toBe("SHORT_BIAS");
    });

    it("ticker with no sentiment data gets MIXED bias", async () => {
      const result = await buildUnifiedRadar();
      const gme = result.tickers.find(t => t.ticker === "GME");

      // GME only has Reddit velocity data, no sentiment from any platform
      expect(gme!.combinedSentiment.crowdBias).toBe("MIXED");
    });
  });

  describe("Platform breakdown", () => {
    it("each platform entry has correct mention count", async () => {
      const result = await buildUnifiedRadar();
      const aapl = result.tickers.find(t => t.ticker === "AAPL");

      const reddit = aapl!.platforms.find(p => p.platform === "reddit");
      const x = aapl!.platforms.find(p => p.platform === "x");
      const tiktok = aapl!.platforms.find(p => p.platform === "tiktok");

      expect(reddit!.mentions).toBe(30);
      expect(x!.mentions).toBe(12);
      expect(tiktok!.mentions).toBe(5);
    });

    it("each platform entry has sentiment data when available", async () => {
      const result = await buildUnifiedRadar();
      const aapl = result.tickers.find(t => t.ticker === "AAPL");

      const reddit = aapl!.platforms.find(p => p.platform === "reddit");
      const x = aapl!.platforms.find(p => p.platform === "x");
      const tiktok = aapl!.platforms.find(p => p.platform === "tiktok");

      expect(reddit!.sentiment).toBeDefined();
      expect(x!.sentiment).toBeDefined();
      expect(tiktok!.sentiment).toBeDefined();
    });
  });
});
