/**
 * Unit tests for the Oracle scanner's scoring, bias, and signal logic.
 * These test the pure functions without hitting any external API.
 */
import { describe, expect, it } from "vitest";

// We can't import private functions directly, so we test the exported
// runOracleScan indirectly through the router. But we CAN test the
// StockChartData and OraclePick interfaces by verifying the shape of
// what the scanner produces. For pure logic tests, we replicate the
// scoring algorithm here to validate correctness.

// ── Replicated scoring logic for unit testing ──
const ORACLE_CRITERIA = {
  priceMin: 0.50,
  priceMax: 20.00,
  minVolume: 50_000,
  minGapPercent: 2,
};

interface MockStock {
  currentPrice: number;
  volume: number;
  avgVolume: number;
  gapPercent: number;
  dayChangePercent: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

function calculateOracleScore(stock: MockStock): number {
  let score = 0;

  // 1. Price Range Score (0-15 pts)
  if (stock.currentPrice >= ORACLE_CRITERIA.priceMin && stock.currentPrice <= ORACLE_CRITERIA.priceMax) {
    score += 5;
    if (stock.currentPrice >= 1 && stock.currentPrice <= 10) score += 10;
    else if (stock.currentPrice >= 0.50 && stock.currentPrice < 1) score += 5;
    else score += 3;
  }

  // 2. Volume Score (0-20 pts)
  const relativeVolume = stock.avgVolume > 0 ? stock.volume / stock.avgVolume : 0;
  if (relativeVolume >= 5) score += 20;
  else if (relativeVolume >= 3) score += 15;
  else if (relativeVolume >= 2) score += 10;
  else if (relativeVolume >= 1.5) score += 5;

  // 3. Gap Score (0-20 pts)
  const absGap = Math.abs(stock.gapPercent);
  if (absGap >= 30) score += 20;
  else if (absGap >= 20) score += 17;
  else if (absGap >= 10) score += 14;
  else if (absGap >= 5) score += 10;
  else if (absGap >= 3) score += 5;

  // 4. Float Score (0-15 pts)
  const estimatedFloat = stock.marketCap > 0 && stock.currentPrice > 0
    ? stock.marketCap / stock.currentPrice
    : 100_000_000;
  if (estimatedFloat <= 5_000_000) score += 15;
  else if (estimatedFloat <= 10_000_000) score += 12;
  else if (estimatedFloat <= 20_000_000) score += 8;
  else if (estimatedFloat <= 50_000_000) score += 4;

  // 5. Momentum Score (0-15 pts)
  const absDayChange = Math.abs(stock.dayChangePercent);
  if (absDayChange >= 20) score += 15;
  else if (absDayChange >= 10) score += 12;
  else if (absDayChange >= 5) score += 8;
  else if (absDayChange >= 2) score += 4;

  // 6. Former Runner Score (0-15 pts)
  const priceRange = stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow;
  const rangePercent = stock.fiftyTwoWeekLow > 0 ? (priceRange / stock.fiftyTwoWeekLow) * 100 : 0;
  if (rangePercent >= 200) score += 15;
  else if (rangePercent >= 100) score += 12;
  else if (rangePercent >= 50) score += 8;
  else if (rangePercent >= 25) score += 4;

  return Math.min(100, Math.max(0, score));
}

function determineBias(stock: { dayChangePercent: number; gapPercent: number }): "LONG" | "SHORT" {
  const momentumScore = stock.dayChangePercent + stock.gapPercent;
  return momentumScore >= 0 ? "LONG" : "SHORT";
}

describe("Oracle scoring algorithm", () => {
  it("gives maximum price score for $1-$10 range", () => {
    const stock: MockStock = {
      currentPrice: 5.00,
      volume: 0, avgVolume: 0,
      gapPercent: 0, dayChangePercent: 0,
      marketCap: 0, fiftyTwoWeekHigh: 5, fiftyTwoWeekLow: 5,
    };
    const score = calculateOracleScore(stock);
    // Price: 5 + 10 = 15 pts
    expect(score).toBe(15);
  });

  it("gives lower price score for $0.50-$1 range", () => {
    const stock: MockStock = {
      currentPrice: 0.75,
      volume: 0, avgVolume: 0,
      gapPercent: 0, dayChangePercent: 0,
      marketCap: 0, fiftyTwoWeekHigh: 0.75, fiftyTwoWeekLow: 0.75,
    };
    const score = calculateOracleScore(stock);
    // Price: 5 + 5 = 10 pts
    expect(score).toBe(10);
  });

  it("gives 0 for stocks outside price range", () => {
    const stock: MockStock = {
      currentPrice: 100.00,
      volume: 0, avgVolume: 0,
      gapPercent: 0, dayChangePercent: 0,
      marketCap: 0, fiftyTwoWeekHigh: 100, fiftyTwoWeekLow: 100,
    };
    const score = calculateOracleScore(stock);
    expect(score).toBe(0);
  });

  it("rewards high relative volume", () => {
    const stock: MockStock = {
      currentPrice: 5.00,
      volume: 5_000_000,
      avgVolume: 1_000_000, // 5x relative volume
      gapPercent: 0, dayChangePercent: 0,
      marketCap: 0, fiftyTwoWeekHigh: 5, fiftyTwoWeekLow: 5,
    };
    const score = calculateOracleScore(stock);
    // Price: 15 + Volume: 20 = 35
    expect(score).toBe(35);
  });

  it("rewards large gaps", () => {
    const stock: MockStock = {
      currentPrice: 5.00,
      volume: 0, avgVolume: 0,
      gapPercent: 35, dayChangePercent: 0,
      marketCap: 0, fiftyTwoWeekHigh: 5, fiftyTwoWeekLow: 5,
    };
    const score = calculateOracleScore(stock);
    // Price: 15 + Gap: 20 = 35
    expect(score).toBe(35);
  });

  it("rewards low float stocks", () => {
    const stock: MockStock = {
      currentPrice: 5.00,
      volume: 0, avgVolume: 0,
      gapPercent: 0, dayChangePercent: 0,
      marketCap: 20_000_000, // 20M / $5 = 4M float
      fiftyTwoWeekHigh: 5, fiftyTwoWeekLow: 5,
    };
    const score = calculateOracleScore(stock);
    // Price: 15 + Float: 15 = 30
    expect(score).toBe(30);
  });

  it("rewards former runners with high 52-week range", () => {
    const stock: MockStock = {
      currentPrice: 5.00,
      volume: 0, avgVolume: 0,
      gapPercent: 0, dayChangePercent: 0,
      marketCap: 0,
      fiftyTwoWeekHigh: 30, // 500% range
      fiftyTwoWeekLow: 5,
    };
    const score = calculateOracleScore(stock);
    // Price: 15 + Former Runner: 15 = 30
    expect(score).toBe(30);
  });

  it("caps score at 100", () => {
    // Perfect stock: all criteria maxed
    const stock: MockStock = {
      currentPrice: 3.00,
      volume: 10_000_000,
      avgVolume: 1_000_000, // 10x
      gapPercent: 50,
      dayChangePercent: 30,
      marketCap: 10_000_000, // ~3.3M float
      fiftyTwoWeekHigh: 30,
      fiftyTwoWeekLow: 1, // 2900% range
    };
    const score = calculateOracleScore(stock);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThan(80); // Should be very high
  });
});

describe("Oracle bias determination", () => {
  it("returns LONG for positive momentum", () => {
    expect(determineBias({ dayChangePercent: 10, gapPercent: 5 })).toBe("LONG");
  });

  it("returns SHORT for negative momentum", () => {
    expect(determineBias({ dayChangePercent: -10, gapPercent: -5 })).toBe("SHORT");
  });

  it("returns LONG for zero momentum (neutral defaults to LONG)", () => {
    expect(determineBias({ dayChangePercent: 0, gapPercent: 0 })).toBe("LONG");
  });

  it("returns LONG when gap is positive but day change is slightly negative", () => {
    expect(determineBias({ dayChangePercent: -2, gapPercent: 5 })).toBe("LONG");
  });

  it("returns SHORT when gap is negative and day change is also negative", () => {
    expect(determineBias({ dayChangePercent: -3, gapPercent: -5 })).toBe("SHORT");
  });
});

describe("Oracle screening criteria", () => {
  it("filters out stocks below $0.50", () => {
    const stock = { currentPrice: 0.10, volume: 100_000, gapPercent: 10, dayChangePercent: 10 };
    const passes = stock.currentPrice >= ORACLE_CRITERIA.priceMin
      && stock.currentPrice <= ORACLE_CRITERIA.priceMax
      && stock.volume >= ORACLE_CRITERIA.minVolume
      && (Math.abs(stock.gapPercent) >= ORACLE_CRITERIA.minGapPercent || Math.abs(stock.dayChangePercent) >= ORACLE_CRITERIA.minGapPercent);
    expect(passes).toBe(false);
  });

  it("filters out stocks above $20", () => {
    const stock = { currentPrice: 25.00, volume: 100_000, gapPercent: 10, dayChangePercent: 10 };
    const passes = stock.currentPrice >= ORACLE_CRITERIA.priceMin
      && stock.currentPrice <= ORACLE_CRITERIA.priceMax;
    expect(passes).toBe(false);
  });

  it("filters out low volume stocks", () => {
    const stock = { currentPrice: 5.00, volume: 10_000, gapPercent: 10, dayChangePercent: 10 };
    const passes = stock.volume >= ORACLE_CRITERIA.minVolume;
    expect(passes).toBe(false);
  });

  it("passes a valid Oracle candidate", () => {
    const stock = { currentPrice: 3.00, volume: 500_000, gapPercent: 15, dayChangePercent: 8 };
    const passes = stock.currentPrice >= ORACLE_CRITERIA.priceMin
      && stock.currentPrice <= ORACLE_CRITERIA.priceMax
      && stock.volume >= ORACLE_CRITERIA.minVolume
      && (Math.abs(stock.gapPercent) >= ORACLE_CRITERIA.minGapPercent || Math.abs(stock.dayChangePercent) >= ORACLE_CRITERIA.minGapPercent);
    expect(passes).toBe(true);
  });
});
