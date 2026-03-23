/**
 * Tests for the screener.scan tRPC endpoint.
 * We mock fetchStockData to avoid hitting the live Yahoo Finance API in tests,
 * which would cause timeouts. Instead we verify the route contract, filtering,
 * and sorting logic with deterministic mock data.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the oracleScanner module to replace fetchStockData with a fast mock
vi.mock("./oracleScanner", async (importOriginal) => {
  const original = await importOriginal<typeof import("./oracleScanner")>();

  const mockStocks: import("./oracleScanner").StockChartData[] = [
    {
      symbol: "TSTA", companyName: "Test Stock A", currentPrice: 3.50,
      previousClose: 3.00, open: 3.40, dayHigh: 4.00, dayLow: 3.20,
      volume: 2_000_000, avgVolume: 500_000, marketCap: 35_000_000,
      fiftyTwoWeekHigh: 12.00, fiftyTwoWeekLow: 2.00,
      gapPercent: 13.3, dayChangePercent: 16.7,
      prices: [3.0, 3.1, 3.2, 3.5], volumes: [500000, 600000, 700000, 2000000], timestamps: [],
    },
    {
      symbol: "TSTB", companyName: "Test Stock B", currentPrice: 1.20,
      previousClose: 1.50, open: 1.25, dayHigh: 1.30, dayLow: 1.10,
      volume: 800_000, avgVolume: 400_000, marketCap: 6_000_000,
      fiftyTwoWeekHigh: 5.00, fiftyTwoWeekLow: 1.00,
      gapPercent: -16.7, dayChangePercent: -20.0,
      prices: [1.5, 1.4, 1.3, 1.2], volumes: [400000, 500000, 600000, 800000], timestamps: [],
    },
    {
      symbol: "TSTC", companyName: "Test Stock C", currentPrice: 8.00,
      previousClose: 7.50, open: 7.80, dayHigh: 8.50, dayLow: 7.60,
      volume: 150_000, avgVolume: 100_000, marketCap: 80_000_000,
      fiftyTwoWeekHigh: 10.00, fiftyTwoWeekLow: 6.00,
      gapPercent: 4.0, dayChangePercent: 6.7,
      prices: [7.5, 7.6, 7.8, 8.0], volumes: [100000, 120000, 130000, 150000], timestamps: [],
    },
    {
      symbol: "TSTD", companyName: "Test Stock D", currentPrice: 0.60,
      previousClose: 0.55, open: 0.58, dayHigh: 0.65, dayLow: 0.55,
      volume: 5_000_000, avgVolume: 1_000_000, marketCap: 3_000_000,
      fiftyTwoWeekHigh: 3.00, fiftyTwoWeekLow: 0.30,
      gapPercent: 5.5, dayChangePercent: 9.1,
      prices: [0.55, 0.57, 0.58, 0.60], volumes: [1000000, 2000000, 3000000, 5000000], timestamps: [],
    },
    {
      symbol: "TSTE", companyName: "Test Stock E", currentPrice: 25.00,
      previousClose: 24.00, open: 24.50, dayHigh: 26.00, dayLow: 24.00,
      volume: 300_000, avgVolume: 200_000, marketCap: 500_000_000,
      fiftyTwoWeekHigh: 30.00, fiftyTwoWeekLow: 20.00,
      gapPercent: 2.1, dayChangePercent: 4.2,
      prices: [24, 24.5, 25], volumes: [200000, 250000, 300000], timestamps: [],
    },
  ];

  return {
    ...original,
    // Replace fetchStockData with a mock that returns from our mock data
    fetchStockData: vi.fn(async (symbol: string) => {
      return mockStocks.find(s => s.symbol === symbol) ?? null;
    }),
    // Override UNIQUE_UNIVERSE to only include our mock tickers
    UNIQUE_UNIVERSE: mockStocks.map(s => s.symbol),
  };
});

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("screener routes", () => {
  it("screener.scan is publicly accessible (no auth required)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.screener.scan({
      priceMin: 0.5,
      priceMax: 20,
      minVolume: 0,
      minGap: 0,
      maxFloat: 500,
      formerRunnersOnly: false,
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);
    expect(typeof result.totalFetched).toBe("number");
    expect(typeof result.scanTimeMs).toBe("number");
  });

  it("screener.scan works with default params (no input)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.screener.scan(undefined);
    expect(result).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.totalFetched).toBeGreaterThan(0);
  });

  it("screener.scan returns results with expected shape", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.screener.scan({
      priceMin: 0.5,
      priceMax: 20,
      minVolume: 0,
      minGap: 0,
      maxFloat: 500,
      formerRunnersOnly: false,
    });
    expect(result.results.length).toBeGreaterThan(0);
    const first = result.results[0];
    expect(typeof first.ticker).toBe("string");
    expect(typeof first.companyName).toBe("string");
    expect(typeof first.price).toBe("number");
    expect(typeof first.gapPercent).toBe("number");
    expect(typeof first.dayChangePercent).toBe("number");
    expect(typeof first.volume).toBe("number");
    expect(typeof first.oracleScore).toBe("number");
    expect(["LONG", "SHORT"]).toContain(first.bias);
    expect(typeof first.formerRunner).toBe("boolean");
  });

  it("screener.scan results are sorted by oracleScore descending", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.screener.scan({
      priceMin: 0.5,
      priceMax: 20,
      minVolume: 0,
      minGap: 0,
      maxFloat: 500,
      formerRunnersOnly: false,
    });
    if (result.results.length >= 2) {
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i].oracleScore).toBeLessThanOrEqual(result.results[i - 1].oracleScore);
      }
    }
  });

  it("screener.scan respects price filter", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.screener.scan({
      priceMin: 1,
      priceMax: 5,
      minVolume: 0,
      minGap: 0,
      maxFloat: 500,
      formerRunnersOnly: false,
    });
    for (const stock of result.results) {
      expect(stock.price).toBeGreaterThanOrEqual(1);
      expect(stock.price).toBeLessThanOrEqual(5);
    }
    // TSTE ($25) and TSTD ($0.60) should be filtered out
    expect(result.results.find(s => s.ticker === "TSTE")).toBeUndefined();
    expect(result.results.find(s => s.ticker === "TSTD")).toBeUndefined();
  });

  it("screener.scan filters out stocks above price max", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // TSTE is $25 which is above $20 max
    const result = await caller.screener.scan({
      priceMin: 0.5,
      priceMax: 20,
      minVolume: 0,
      minGap: 0,
      maxFloat: 500,
      formerRunnersOnly: false,
    });
    expect(result.results.find(s => s.ticker === "TSTE")).toBeUndefined();
  });

  it("screener.scan respects volume filter", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.screener.scan({
      priceMin: 0.5,
      priceMax: 20,
      minVolume: 1_000_000,
      minGap: 0,
      maxFloat: 500,
      formerRunnersOnly: false,
    });
    for (const stock of result.results) {
      expect(stock.volume).toBeGreaterThanOrEqual(1_000_000);
    }
  });

  it("screener.scan respects formerRunnersOnly filter", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.screener.scan({
      priceMin: 0.5,
      priceMax: 20,
      minVolume: 0,
      minGap: 0,
      maxFloat: 500,
      formerRunnersOnly: true,
    });
    // Former runner = 52-week range > 100%
    for (const stock of result.results) {
      expect(stock.formerRunner).toBe(true);
    }
  });
});
