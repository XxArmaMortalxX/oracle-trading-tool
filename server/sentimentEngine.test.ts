import { describe, expect, it } from "vitest";
import { computeSentiment, type SentimentResult } from "./sentimentEngine";
import type { StockChartData } from "./oracleScanner";

/** Helper to create a StockChartData object with sensible defaults */
function makeStock(overrides: Partial<StockChartData> = {}): StockChartData {
  return {
    symbol: "TEST",
    companyName: "Test Corp",
    currentPrice: 5.0,
    previousClose: 4.5,
    dayOpen: 4.8,
    dayHigh: 5.5,
    dayLow: 4.6,
    volume: 500_000,
    avgVolume: 250_000,
    marketCap: 50_000_000,
    fiftyTwoWeekHigh: 10.0,
    fiftyTwoWeekLow: 2.0,
    gapPercent: 6.7,
    dayChangePercent: 11.1,
    prices: [4.0, 4.2, 4.5, 4.7, 5.0],
    volumes: [200_000, 250_000, 300_000, 400_000, 500_000],
    timestamps: [1, 2, 3, 4, 5],
    ...overrides,
  };
}

describe("sentimentEngine", () => {
  describe("computeSentiment returns valid structure", () => {
    it("returns score, label, and all 5 components", () => {
      const result = computeSentiment(makeStock());
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("label");
      expect(result).toHaveProperty("components");
      expect(result.components).toHaveProperty("momentum");
      expect(result.components).toHaveProperty("volumeConviction");
      expect(result.components).toHaveProperty("gapSentiment");
      expect(result.components).toHaveProperty("weekPosition");
      expect(result.components).toHaveProperty("intradayStrength");
    });

    it("score is clamped between -100 and +100", () => {
      const result = computeSentiment(makeStock());
      expect(result.score).toBeGreaterThanOrEqual(-100);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("label is one of the 5 valid labels", () => {
      const validLabels = ["Strong Bullish", "Bullish", "Neutral", "Bearish", "Strong Bearish"];
      const result = computeSentiment(makeStock());
      expect(validLabels).toContain(result.label);
    });
  });

  describe("bullish scenarios", () => {
    it("strong uptrend with high volume produces bullish sentiment", () => {
      const stock = makeStock({
        prices: [3.0, 3.5, 4.0, 4.5, 5.0], // consistent uptrend
        volume: 1_000_000,
        avgVolume: 200_000, // 5x relative volume
        gapPercent: 10,
        dayChangePercent: 11,
        currentPrice: 5.0,
        dayHigh: 5.2,
        dayLow: 4.5,
        fiftyTwoWeekHigh: 6.0,
        fiftyTwoWeekLow: 2.0,
      });
      const result = computeSentiment(stock);
      expect(result.score).toBeGreaterThan(30);
      expect(["Strong Bullish", "Bullish"]).toContain(result.label);
    });

    it("stock near 52-week high is more bullish", () => {
      const nearHigh = computeSentiment(makeStock({
        currentPrice: 9.5,
        fiftyTwoWeekHigh: 10.0,
        fiftyTwoWeekLow: 2.0,
      }));
      const nearLow = computeSentiment(makeStock({
        currentPrice: 2.5,
        fiftyTwoWeekHigh: 10.0,
        fiftyTwoWeekLow: 2.0,
      }));
      expect(nearHigh.components.weekPosition).toBeGreaterThan(nearLow.components.weekPosition);
    });
  });

  describe("bearish scenarios", () => {
    it("downtrend with high volume produces bearish sentiment", () => {
      const stock = makeStock({
        prices: [7.0, 6.5, 6.0, 5.5, 5.0], // consistent downtrend
        volume: 800_000,
        avgVolume: 200_000, // 4x relative volume
        gapPercent: -8,
        dayChangePercent: -10,
        currentPrice: 5.0,
        dayHigh: 5.8,
        dayLow: 4.9,
        fiftyTwoWeekHigh: 10.0,
        fiftyTwoWeekLow: 3.0,
      });
      const result = computeSentiment(stock);
      expect(result.score).toBeLessThan(-10);
      expect(["Strong Bearish", "Bearish"]).toContain(result.label);
    });

    it("stock near 52-week low is more bearish", () => {
      const stock = makeStock({
        currentPrice: 2.2,
        fiftyTwoWeekHigh: 10.0,
        fiftyTwoWeekLow: 2.0,
      });
      const result = computeSentiment(stock);
      expect(result.components.weekPosition).toBeLessThan(0);
    });
  });

  describe("neutral scenarios", () => {
    it("flat price action with average volume is neutral", () => {
      const stock = makeStock({
        prices: [5.0, 5.0, 5.0, 5.0, 5.0],
        volume: 250_000,
        avgVolume: 250_000,
        gapPercent: 0,
        dayChangePercent: 0,
        currentPrice: 5.0,
        dayHigh: 5.1,
        dayLow: 4.9,
        fiftyTwoWeekHigh: 10.0,
        fiftyTwoWeekLow: 2.0,
      });
      const result = computeSentiment(stock);
      expect(result.label).toBe("Neutral");
      expect(Math.abs(result.score)).toBeLessThan(20);
    });
  });

  describe("component scoring", () => {
    it("momentum is positive for uptrend", () => {
      const result = computeSentiment(makeStock({
        prices: [3.0, 3.5, 4.0, 4.5, 5.0],
      }));
      expect(result.components.momentum).toBeGreaterThan(0);
    });

    it("momentum is negative for downtrend", () => {
      const result = computeSentiment(makeStock({
        prices: [7.0, 6.5, 6.0, 5.5, 5.0],
      }));
      expect(result.components.momentum).toBeLessThan(0);
    });

    it("volume conviction is positive for high volume up move", () => {
      const result = computeSentiment(makeStock({
        volume: 1_000_000,
        avgVolume: 200_000,
        dayChangePercent: 10,
      }));
      expect(result.components.volumeConviction).toBeGreaterThan(0);
    });

    it("volume conviction is negative for high volume down move", () => {
      const result = computeSentiment(makeStock({
        volume: 1_000_000,
        avgVolume: 200_000,
        dayChangePercent: -10,
      }));
      expect(result.components.volumeConviction).toBeLessThan(0);
    });

    it("gap sentiment reflects gap direction", () => {
      const gapUp = computeSentiment(makeStock({ gapPercent: 10 }));
      const gapDown = computeSentiment(makeStock({ gapPercent: -10 }));
      expect(gapUp.components.gapSentiment).toBeGreaterThan(0);
      expect(gapDown.components.gapSentiment).toBeLessThan(0);
    });

    it("intraday strength is positive when closing near high", () => {
      const result = computeSentiment(makeStock({
        currentPrice: 5.4,
        dayHigh: 5.5,
        dayLow: 4.6,
      }));
      expect(result.components.intradayStrength).toBeGreaterThan(0);
    });

    it("intraday strength is negative when closing near low", () => {
      const result = computeSentiment(makeStock({
        currentPrice: 4.7,
        dayHigh: 5.5,
        dayLow: 4.6,
      }));
      expect(result.components.intradayStrength).toBeLessThan(0);
    });
  });

  describe("edge cases", () => {
    it("handles stock with no price history gracefully", () => {
      const result = computeSentiment(makeStock({ prices: [] }));
      expect(result.components.momentum).toBe(0);
    });

    it("handles stock with zero average volume", () => {
      const result = computeSentiment(makeStock({ avgVolume: 0 }));
      expect(result.components.volumeConviction).toBe(0);
    });

    it("handles stock with equal 52-week high and low", () => {
      const result = computeSentiment(makeStock({
        fiftyTwoWeekHigh: 5.0,
        fiftyTwoWeekLow: 5.0,
      }));
      expect(result.components.weekPosition).toBe(0);
    });

    it("handles stock with equal day high and low", () => {
      const result = computeSentiment(makeStock({
        dayHigh: 5.0,
        dayLow: 5.0,
      }));
      expect(result.components.intradayStrength).toBe(0);
    });

    it("handles negligible gap", () => {
      const result = computeSentiment(makeStock({ gapPercent: 0.2 }));
      expect(result.components.gapSentiment).toBe(0);
    });
  });
});
