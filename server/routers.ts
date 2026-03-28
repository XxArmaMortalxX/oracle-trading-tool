import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, subscriberProcedure, adminProcedure, router } from "./_core/trpc";
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
import {
  fetchRedditMentionsCached,
  runRedditScan,
  getLatestMentionsForTickers,
  getTopTrendingTickers,
  getTickerVelocityHistory,
  type RedditMentionData,
} from "./redditTracker";
import {
  fetchRedditSentimentCached,
  refreshRedditSentiment,
  getSentimentForTickers,
  type TickerSentimentSplit,
} from "./redditSentiment";
import {
  runShiftDetection,
  getRecentAlerts,
  getAlertHistory,
  dismissAlert,
  getActiveAlertCount,
  type DetectedShift,
} from "./sentimentShiftDetector";
import {
  getUnifiedRadarCached,
  refreshUnifiedRadar,
} from "./socialRadarAggregator";

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

/** Helper to serialize a TickerSentimentSplit for JSON transport */
function serializeSentimentSplit(split: TickerSentimentSplit | undefined) {
  if (!split) {
    return {
      redditSentimentBullishPct: null as number | null,
      redditSentimentBearishPct: null as number | null,
      redditSentimentNeutralPct: null as number | null,
      redditSentimentCrowdBias: null as string | null,
      redditSentimentMentions: null as number | null,
      redditSentimentTopBullish: null as string[] | null,
      redditSentimentTopBearish: null as string[] | null,
    };
  }
  return {
    redditSentimentBullishPct: split.bullishPct,
    redditSentimentBearishPct: split.bearishPct,
    redditSentimentNeutralPct: split.neutralPct,
    redditSentimentCrowdBias: split.crowdBias,
    redditSentimentMentions: split.totalMentions,
    redditSentimentTopBullish: split.topBullishSignals,
    redditSentimentTopBearish: split.topBearishSignals,
  };
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

    /** Get the latest picks (most recent completed scan) with sentiment trends + Reddit data + Reddit sentiment */
    latestPicks: publicProcedure.query(async () => {
      const picks = await getLatestPicks();
      if (picks.length === 0) return [];

      // Get previous sentiment for trend arrows
      const sessionId = picks[0].sessionId;
      const tickers = picks.map(p => p.ticker);
      const previousSentiments = await getPreviousSentimentByTickers(tickers, sessionId);

      // Get Reddit mention data for these tickers
      let redditMap = new Map<string, RedditMentionData>();
      try {
        redditMap = await getLatestMentionsForTickers(tickers);
      } catch { /* DB may not be available */ }

      // Get Reddit sentiment classification for these tickers
      let sentimentMap = new Map<string, TickerSentimentSplit>();
      try {
        sentimentMap = await getSentimentForTickers(tickers);
      } catch { /* Reddit API may not be available */ }

      return picks.map(p => {
        const prev = previousSentiments.get(p.ticker);
        const trend = computeSentimentTrend(
          p.sentimentScore ?? 0,
          (p.sentimentLabel as any) ?? "Neutral",
          prev?.score ?? null,
          prev?.label ?? null,
        );
        const reddit = redditMap.get(p.ticker);
        const sentiment = sentimentMap.get(p.ticker);
        return {
          ...p,
          sentimentTrend: trend.trend,
          sentimentDelta: trend.delta,
          sentimentTransition: trend.transition,
          previousSentimentLabel: trend.previousLabel,
          previousSentimentScore: trend.previousScore,
          redditMentions: reddit?.mentions ?? null,
          redditMentions24hAgo: reddit?.mentions24hAgo ?? null,
          redditVelocityPct: reddit?.velocityPct ?? null,
          redditVelocitySignal: reddit?.velocitySignal ?? null,
          redditRank: reddit?.rank ?? null,
          redditUpvotes: reddit?.upvotes ?? null,
          ...serializeSentimentSplit(sentiment),
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

        // Get Reddit mention data for screener results
        let redditMap = new Map<string, RedditMentionData>();
        try {
          redditMap = await getLatestMentionsForTickers(tickers);
        } catch { /* DB may not be available */ }

        // Get Reddit sentiment classification for screener results
        let sentimentSplitMap = new Map<string, TickerSentimentSplit>();
        try {
          sentimentSplitMap = await getSentimentForTickers(tickers);
        } catch { /* Reddit API may not be available */ }

        const enrichedResults = results.map(r => {
          const prev = previousSentiments.get(r.ticker);
          const trend = computeSentimentTrend(
            r.sentimentScore,
            r.sentimentLabel as any,
            prev?.score ?? null,
            prev?.label ?? null,
          );
          const reddit = redditMap.get(r.ticker);
          const sentimentSplit = sentimentSplitMap.get(r.ticker);
          return {
            ...r,
            sentimentTrend: trend.trend,
            sentimentDelta: trend.delta,
            sentimentTransition: trend.transition,
            previousSentimentLabel: trend.previousLabel,
            redditMentions: reddit?.mentions ?? null,
            redditVelocityPct: reddit?.velocityPct ?? null,
            redditVelocitySignal: reddit?.velocitySignal ?? null,
            redditRank: reddit?.rank ?? null,
            ...serializeSentimentSplit(sentimentSplit),
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

  // ── Unified Social Radar (Reddit + X + TikTok) ──
  socialRadar: router({
    /** Get unified radar data from all platforms (cached) */
    unified: publicProcedure.query(async () => {
      const snapshot = await getUnifiedRadarCached();
      return {
        tickers: snapshot.tickers
          .filter(t => t.totalMentions >= 2)
          .slice(0, 50),
        totalTickers: snapshot.totalTickers,
        totalContentScanned: snapshot.totalContentScanned,
        fetchedAt: snapshot.fetchedAt.toISOString(),
      };
    }),

    /** Refresh all platforms and rebuild unified radar */
    refresh: publicProcedure.mutation(async () => {
      console.log(`[SocialRadar] Manual refresh triggered across all platforms...`);
      const { snapshot, platformResults } = await refreshUnifiedRadar();

      // Also run shift detection on the fresh Reddit sentiment
      let shiftResult: { shifts: DetectedShift[]; notified: boolean } = { shifts: [], notified: false };
      try {
        const redditSentiment = await fetchRedditSentimentCached();
        shiftResult = await runShiftDetection(redditSentiment.tickers);
      } catch (err) {
        console.warn("[SocialRadar] Shift detection failed:", err);
      }

      return {
        totalTickers: snapshot.totalTickers,
        totalContentScanned: snapshot.totalContentScanned,
        fetchedAt: snapshot.fetchedAt.toISOString(),
        platformResults,
        shiftsDetected: shiftResult.shifts.length,
        shiftNotified: shiftResult.notified,
        shifts: shiftResult.shifts.map(s => ({
          ticker: s.ticker,
          direction: s.direction,
          severity: s.severity,
          shiftMagnitude: s.shiftMagnitude,
          previousBullishPct: s.previousBullishPct,
          newBullishPct: s.newBullishPct,
        })),
      };
    }),
  }),

  // ── Reddit Mention Velocity + Sentiment (legacy, kept for compatibility) ──
  reddit: router({
    /** Get current Reddit mention velocity data with sentiment classification (cached, fast) */
    trending: publicProcedure.query(async () => {
      const snapshot = await fetchRedditMentionsCached();
      // Return top 30 by velocity
      const sorted = Array.from(snapshot.tickers)
        .filter(t => t.mentions >= 5)
        .sort((a, b) => b.velocityPct - a.velocityPct)
        .slice(0, 30);

      // Get sentiment classification for these tickers
      const tickerNames = sorted.map(t => t.ticker);
      let sentimentMap = new Map<string, TickerSentimentSplit>();
      try {
        sentimentMap = await getSentimentForTickers(tickerNames);
      } catch { /* Reddit sentiment may not be available */ }

      const tickersWithSentiment = sorted.map(t => {
        const sentiment = sentimentMap.get(t.ticker);
        return {
          ...t,
          ...serializeSentimentSplit(sentiment),
        };
      });

      return {
        tickers: tickersWithSentiment,
        totalTracked: snapshot.totalTickers,
        fetchedAt: snapshot.fetchedAt.toISOString(),
        cached: (Date.now() - snapshot.fetchedAt.getTime()) > 1000,
      };
    }),

    /** Get Reddit mention data for specific tickers (from DB) */
    forTickers: publicProcedure
      .input(z.object({ tickers: z.array(z.string()).max(100) }))
      .query(async ({ input }) => {
        const mentionsMap = await getLatestMentionsForTickers(input.tickers);
        const result: Record<string, RedditMentionData> = {};
        for (const [ticker, data] of Array.from(mentionsMap.entries())) {
          result[ticker] = data;
        }
        return result;
      }),

    /** Get velocity history for a specific ticker */
    tickerHistory: publicProcedure
      .input(z.object({ ticker: z.string() }))
      .query(async ({ input }) => {
        return getTickerVelocityHistory(input.ticker);
      }),

    /** Trigger a full Reddit scan — fetches from ApeWisdom and stores in DB.
     *  Also refreshes Reddit sentiment classification and runs shift detection. */
    refresh: publicProcedure.mutation(async () => {
      console.log(`[Reddit] Manual refresh triggered...`);
      // Refresh both velocity data and sentiment classification
      const [snapshot, sentimentSnapshot] = await Promise.all([
        runRedditScan(),
        refreshRedditSentiment(),
      ]);

      // Run shift detection on the fresh sentiment data
      let shiftResult: { shifts: DetectedShift[]; notified: boolean } = { shifts: [], notified: false };
      try {
        shiftResult = await runShiftDetection(sentimentSnapshot.tickers);
      } catch (err) {
        console.warn("[Reddit] Shift detection failed:", err);
      }

      return {
        totalTickers: snapshot.totalTickers,
        snapshotId: snapshot.snapshotId,
        fetchedAt: snapshot.fetchedAt.toISOString(),
        topMovers: snapshot.tickers
          .filter(t => t.mentions >= 5)
          .sort((a, b) => b.velocityPct - a.velocityPct)
          .slice(0, 10),
        shiftsDetected: shiftResult.shifts.length,
        shiftNotified: shiftResult.notified,
        shifts: shiftResult.shifts.map(s => ({
          ticker: s.ticker,
          direction: s.direction,
          severity: s.severity,
          shiftMagnitude: s.shiftMagnitude,
          previousBullishPct: s.previousBullishPct,
          newBullishPct: s.newBullishPct,
        })),
      };
    }),

    /** Get top trending tickers from DB (stored snapshots) */
    topTrending: publicProcedure.query(async () => {
      return getTopTrendingTickers(20);
    }),

    /** Get Reddit sentiment classification data (from live post analysis) */
    sentiment: publicProcedure.query(async () => {
      const snapshot = await fetchRedditSentimentCached();
      // Convert Map to sorted array
      const entries = Array.from(snapshot.tickers.entries())
        .map(([_ticker, split]) => ({ ...split }))
        .filter(s => s.totalMentions >= 2)
        .sort((a, b) => b.totalMentions - a.totalMentions)
        .slice(0, 50);

      return {
        tickers: entries,
        totalPosts: snapshot.totalPosts,
        totalTickers: snapshot.totalTickers,
        fetchedAt: snapshot.fetchedAt.toISOString(),
      };
    }),
  }),

  // ── Sentiment Shift Alerts ──
  alerts: router({
    /** Get recent undismissed alerts */
    recent: publicProcedure.query(async () => {
      const alerts = await getRecentAlerts(20);
      return alerts;
    }),

    /** Get alert history (including dismissed) */
    history: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;
        return getAlertHistory(limit, offset);
      }),

    /** Dismiss an alert */
    dismiss: publicProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ input }) => {
        await dismissAlert(input.alertId);
        return { success: true };
      }),

    /** Get count of active (undismissed) alerts */
    count: publicProcedure.query(async () => {
      const count = await getActiveAlertCount();
      return { count };
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

  // ── Waitlist ──
  waitlist: router({
    /** Join the waitlist (public, no auth required) */
    join: publicProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().max(255).optional(),
        source: z.string().max(50).optional(),
      }))
      .mutation(async ({ input }) => {
        const { addToWaitlist } = await import("./stripeService");
        return addToWaitlist(input.email, input.name, input.source);
      }),

    /** Get waitlist count (public) */
    count: publicProcedure.query(async () => {
      const { getWaitlistCount } = await import("./stripeService");
      const count = await getWaitlistCount();
      return { count };
    }),
  }),

  // ── Subscription & Billing ──
  billing: router({
    /** Get current user's subscription status */
    status: protectedProcedure.query(async ({ ctx }) => {
      const { getUserSubscription, isUserSubscribed } = await import("./stripeService");
      const { isFreeAccessPeriod, FREE_ACCESS_UNTIL } = await import("../shared/const");
      const sub = await getUserSubscription(ctx.user.id);
      const isSubscribed = await isUserSubscribed(ctx.user.id, ctx.user.openId);
      const isOwner = ctx.user.role === "admin";
      const freeAccess = isFreeAccessPeriod();
      return {
        isSubscribed: isSubscribed || freeAccess,
        isOwner,
        isFreeAccess: freeAccess,
        freeAccessUntil: FREE_ACCESS_UNTIL.toISOString(),
        status: isOwner ? "active" : freeAccess ? "free_access" : (sub?.status ?? "inactive"),
        currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: sub?.cancelAtPeriodEnd === 1,
      };
    }),

    /** Create a Stripe checkout session */
    createCheckout: protectedProcedure
      .input(z.object({ origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const { createCheckoutSession } = await import("./stripeService");
        const url = await createCheckoutSession({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          origin: input.origin,
        });
        return { url };
      }),

    /** Create a Stripe billing portal session */
    createPortal: protectedProcedure
      .input(z.object({ origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const { getUserSubscription, createBillingPortalSession } = await import("./stripeService");
        const sub = await getUserSubscription(ctx.user.id);
        if (!sub?.stripeCustomerId) {
          throw new Error("No billing account found. Please subscribe first.");
        }
        const url = await createBillingPortalSession(
          sub.stripeCustomerId,
          `${input.origin}/dashboard`
        );
        return { url };
      }),
  }),
});

export type AppRouter = typeof appRouter;
