import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getLatestScanSession,
  getRecentScanSessions,
  getPicksBySessionId,
  getLatestPicks,
  getNotificationPrefs,
  upsertNotificationPrefs,
  getPreviousSentimentByTickers,
} from "./scanDb";
import { executeScanRun } from "./scanRunner";
import {
  fetchStockData,
  UNIQUE_UNIVERSE,
  calculateOracleScore,
  determineBias,
  type StockChartData,
} from "./oracleScanner";
import { computeSentiment, computeSentimentTrend, type SentimentResult, type SentimentTrendResult } from "./sentimentEngine";

// ── Server-side cache for screener data ──
// Caches the raw fetched stock data for 5 minutes to reduce API calls.
// Filters are applied on top of cached data, so changing filters is instant.
interface ScreenerCache {
  stocks: StockChartData[];
  fetchedAt: number;
  fetchCount: number;
  errorCount: number;
}

let screenerCache: ScreenerCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getScreenerStocks(): Promise<ScreenerCache> {
  // Return cached data if still fresh
  if (screenerCache && (Date.now() - screenerCache.fetchedAt) < CACHE_TTL_MS) {
    console.log(`[Screener] Using cached data (${screenerCache.stocks.length} stocks, age: ${((Date.now() - screenerCache.fetchedAt) / 1000).toFixed(0)}s)`);
    return screenerCache;
  }

  console.log(`[Screener] Fetching fresh data for ${UNIQUE_UNIVERSE.length} tickers...`);
  const startTime = Date.now();

  const batchSize = 10;
  const allStocks: StockChartData[] = [];
  let errorCount = 0;

  for (let i = 0; i < UNIQUE_UNIVERSE.length; i += batchSize) {
    const batch = UNIQUE_UNIVERSE.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(fetchStockData));
    for (const r of results) {
      if (r) allStocks.push(r);
      else errorCount++;
    }
    // If we're getting all errors (rate limited), stop early to save time
    if (errorCount > 20 && allStocks.length === 0) {
      console.warn(`[Screener] API appears rate-limited after ${errorCount} failures. Stopping early.`);
      break;
    }
    if (i + batchSize < UNIQUE_UNIVERSE.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  const scanTime = Date.now() - startTime;
  console.log(`[Screener] Fetch complete in ${(scanTime / 1000).toFixed(1)}s. ${allStocks.length} stocks fetched, ${errorCount} errors.`);

  const cache: ScreenerCache = {
    stocks: allStocks,
    fetchedAt: Date.now(),
    fetchCount: allStocks.length,
    errorCount,
  };

  // Only cache if we got some results (don't cache empty results from rate limiting)
  if (allStocks.length > 0) {
    screenerCache = cache;
  }

  return cache;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ── Oracle Scanner Routes ──
  scan: router({
    /** Get the latest scan session info */
    latestSession: publicProcedure.query(async () => {
      return getLatestScanSession();
    }),

    /** Get recent scan sessions (last 7 days) */
    recentSessions: publicProcedure.query(async () => {
      return getRecentScanSessions(7);
    }),

    /** Get picks for a specific session */
    picksBySession: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return getPicksBySessionId(input.sessionId);
      }),

    /** Get the latest picks (most recent completed scan) with sentiment trends */
    latestPicks: publicProcedure.query(async () => {
      const picks = await getLatestPicks();
      if (picks.length === 0) return [];

      // Get previous sentiment for trend arrows
      const sessionId = picks[0].sessionId;
      const tickers = picks.map(p => p.ticker);
      const previousSentiments = await getPreviousSentimentByTickers(tickers, sessionId);

      return picks.map(p => {
        const prev = previousSentiments.get(p.ticker);
        const trend = computeSentimentTrend(
          p.sentimentScore ?? 0,
          (p.sentimentLabel as any) ?? "Neutral",
          prev?.score ?? null,
          prev?.label ?? null,
        );
        return {
          ...p,
          sentimentTrend: trend.trend,
          sentimentDelta: trend.delta,
          sentimentTransition: trend.transition,
          previousSentimentLabel: trend.previousLabel,
          previousSentimentScore: trend.previousScore,
        };
      });
    }),

    /** Manually trigger a scan (admin only) — always forces a fresh scan */
    triggerScan: adminProcedure.mutation(async () => {
      const result = await executeScanRun({ force: true });
      return {
        sessionId: result.sessionId,
        picksCount: result.picks.length,
        notified: result.notified,
      };
    }),

    /** Refresh live picks — fetches fresh real-time data from Yahoo Finance.
     *  Forces a new scan even if one already ran today.
     *  Returns trend data for each pick. */
    refreshPicks: publicProcedure.mutation(async () => {
      console.log(`[Dashboard] Refresh picks requested — forcing live scan...`);
      const result = await executeScanRun({ force: true });

      // Convert trends Map to a serializable object
      const trendsObj: Record<string, { trend: string; delta: number | null; transition: string | null; previousLabel: string | null }> = {};
      if (result.trends) {
        for (const [ticker, t] of Array.from(result.trends.entries())) {
          trendsObj[ticker] = {
            trend: t.trend,
            delta: t.delta,
            transition: t.transition,
            previousLabel: t.previousLabel,
          };
        }
      }

      return {
        sessionId: result.sessionId,
        picksCount: result.picks.length,
        success: true,
        trends: trendsObj,
      };
    }),
  }),

  // ── Live Screener ──
  screener: router({
    /** Fetch live stock data for the screener with server-side filtering.
     *  Uses a 5-minute server-side cache to reduce API calls.
     *  Filters are applied on top of cached data for instant results. */
    scan: publicProcedure
      .input(
        z.object({
          priceMin: z.number().min(0).default(0.5),
          priceMax: z.number().max(1000).default(20),
          minVolume: z.number().min(0).default(50000),
          minGap: z.number().min(0).default(2),
          maxFloat: z.number().min(0).default(50),
          formerRunnersOnly: z.boolean().default(false),
        }).optional()
      )
      .query(async ({ input }) => {
        const priceMin = input?.priceMin ?? 0.5;
        const priceMax = input?.priceMax ?? 20;
        const minVolume = input?.minVolume ?? 50000;
        const minGap = input?.minGap ?? 2;
        const maxFloatM = input?.maxFloat ?? 50;
        const formerRunnersOnly = input?.formerRunnersOnly ?? false;

        const startTime = Date.now();
        const cache = await getScreenerStocks();

        // Apply user filters on cached data
        const filtered = cache.stocks.filter(stock => {
          if (stock.currentPrice < priceMin || stock.currentPrice > priceMax) return false;
          if (stock.volume < minVolume) return false;
          if (Math.abs(stock.gapPercent) < minGap && Math.abs(stock.dayChangePercent) < minGap) return false;

          // Float filter (estimate from market cap / price, in millions)
          const estFloatM = stock.marketCap > 0 && stock.currentPrice > 0
            ? (stock.marketCap / stock.currentPrice) / 1_000_000
            : 999; // unknown float passes unless filter is strict
          if (estFloatM > maxFloatM && stock.marketCap > 0) return false;

          // Former runner: 52-week range > 100%
          if (formerRunnersOnly) {
            const rangePercent = stock.fiftyTwoWeekLow > 0
              ? ((stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow) / stock.fiftyTwoWeekLow) * 100
              : 0;
            if (rangePercent < 100) return false;
          }

          return true;
        });

        // Score, determine bias, and sort
        const results = filtered.map(stock => {
          const score = calculateOracleScore(stock);
          const bias = determineBias(stock);
          const estFloatM = stock.marketCap > 0 && stock.currentPrice > 0
            ? +((stock.marketCap / stock.currentPrice) / 1_000_000).toFixed(1)
            : null;
          const relativeVolume = stock.avgVolume > 0 ? +(stock.volume / stock.avgVolume).toFixed(1) : null;
          const rangePercent = stock.fiftyTwoWeekLow > 0
            ? +((stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow) / stock.fiftyTwoWeekLow * 100).toFixed(0)
            : 0;

          // Compute sentiment from price action data
          const sentiment = computeSentiment(stock);

          return {
            ticker: stock.symbol,
            companyName: stock.companyName || stock.symbol,
            price: stock.currentPrice,
            gapPercent: +stock.gapPercent.toFixed(1),
            dayChangePercent: +stock.dayChangePercent.toFixed(1),
            volume: stock.volume,
            avgVolume: stock.avgVolume,
            relativeVolume,
            floatM: estFloatM,
            marketCap: stock.marketCap,
            fiftyTwoWeekHigh: stock.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: stock.fiftyTwoWeekLow,
            rangePercent: +rangePercent,
            formerRunner: +rangePercent >= 100,
            oracleScore: score,
            bias,
            sentimentScore: sentiment.score,
            sentimentLabel: sentiment.label,
            sentimentComponents: sentiment.components,
          };
        });

        results.sort((a, b) => b.oracleScore - a.oracleScore);

        // Enrich with sentiment trends from DB history
        const tickers = results.map(r => r.ticker);
        let previousSentiments = new Map<string, { score: number; label: string; createdAt: Date }>();
        try {
          previousSentiments = await getPreviousSentimentByTickers(tickers);
        } catch { /* DB may not be available in tests */ }

        const enrichedResults = results.map(r => {
          const prev = previousSentiments.get(r.ticker);
          const trend = computeSentimentTrend(
            r.sentimentScore,
            r.sentimentLabel as any,
            prev?.score ?? null,
            prev?.label ?? null,
          );
          return {
            ...r,
            sentimentTrend: trend.trend,
            sentimentDelta: trend.delta,
            sentimentTransition: trend.transition,
            previousSentimentLabel: trend.previousLabel,
          };
        });

        const scanTime = Date.now() - startTime;
        const cacheAge = Math.round((Date.now() - cache.fetchedAt) / 1000);

        return {
          results: enrichedResults,
          totalFetched: cache.fetchCount,
          scanTimeMs: scanTime,
          cached: cacheAge > 1,
          cacheAgeSeconds: cacheAge,
          apiErrors: cache.errorCount,
        };
      }),
  }),

  // ── Notification Preferences ──
  notifications: router({
    /** Get current user's notification preferences */
    getPrefs: protectedProcedure.query(async ({ ctx }) => {
      return getNotificationPrefs(ctx.user.id);
    }),

    /** Update notification preferences */
    updatePrefs: protectedProcedure
      .input(
        z.object({
          enabled: z.number().min(0).max(1).optional(),
          minOracleScore: z.number().min(0).max(100).optional(),
          biasFilter: z.enum(["ALL", "LONG", "SHORT"]).optional(),
          maxPicks: z.number().min(1).max(20).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertNotificationPrefs(ctx.user.id, input);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
