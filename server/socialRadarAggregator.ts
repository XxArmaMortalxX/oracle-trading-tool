/**
 * Unified Social Radar Aggregator
 * 
 * Merges mention data from Reddit, X (Twitter), and TikTok into a single
 * unified view per ticker. Combines mention counts, engagement metrics,
 * and sentiment splits across all platforms.
 * 
 * Each ticker gets:
 * - Total mentions across all platforms
 * - Per-platform breakdown (reddit: 45, x: 30, tiktok: 12)
 * - Combined sentiment split (weighted by mention count per platform)
 * - Platform-specific engagement metrics
 */

import { type TickerSentimentSplit, computeSentimentSplit, type PostMention } from "./redditSentiment";
import { fetchRedditSentimentCached, refreshRedditSentiment, type RedditSentimentSnapshot } from "./redditSentiment";
import { fetchXMentionsCached, refreshXMentions, type XSnapshot, type XMentionData } from "./xTracker";
import { fetchTikTokMentionsCached, refreshTikTokMentions, type TikTokSnapshot, type TikTokMentionData } from "./tiktokTracker";
import {
  fetchRedditMentionsCached,
  runRedditScan,
  type RedditMentionData,
} from "./redditTracker";

// ── Types ──

export type PlatformSource = "reddit" | "x" | "tiktok";

export interface PlatformBreakdown {
  platform: PlatformSource;
  mentions: number;
  engagement: number;
  sentiment: TickerSentimentSplit | null;
}

export interface UnifiedTickerData {
  ticker: string;
  name: string;
  /** Total mentions across all platforms */
  totalMentions: number;
  /** Total engagement (upvotes + likes + retweets + views) */
  totalEngagement: number;
  /** Per-platform breakdown */
  platforms: PlatformBreakdown[];
  /** Number of platforms where this ticker appears */
  platformCount: number;
  /** Combined sentiment split across all platforms */
  combinedSentiment: TickerSentimentSplit;
  /** Reddit-specific velocity data (from the existing tracker) */
  redditVelocity: {
    velocityPct: number;
    velocitySignal: string;
    mentions24hAgo: number;
    rank: number;
    rank24hAgo: number;
    upvotes: number;
  } | null;
}

export interface UnifiedRadarSnapshot {
  fetchedAt: Date;
  totalTickers: number;
  /** Total posts/tweets/videos scanned across all platforms */
  totalContentScanned: {
    reddit: number;
    x: number;
    tiktok: number;
    total: number;
  };
  tickers: UnifiedTickerData[];
}

// ── Aggregation Logic ──

/**
 * Merge sentiment splits from multiple platforms into one combined split.
 * Weighted by mention count per platform.
 */
function mergeSentimentSplits(
  ticker: string,
  splits: { sentiment: TickerSentimentSplit; weight: number }[]
): TickerSentimentSplit {
  const validSplits = splits.filter(s => s.sentiment.totalMentions > 0);
  
  if (validSplits.length === 0) {
    return {
      ticker,
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
    };
  }
  
  // Sum raw counts across platforms
  let totalBullish = 0;
  let totalBearish = 0;
  let totalNeutral = 0;
  const allBullishSignals = new Map<string, number>();
  const allBearishSignals = new Map<string, number>();
  
  for (const { sentiment } of validSplits) {
    totalBullish += sentiment.bullishCount;
    totalBearish += sentiment.bearishCount;
    totalNeutral += sentiment.neutralCount;
    
    for (const s of sentiment.topBullishSignals) {
      allBullishSignals.set(s, (allBullishSignals.get(s) || 0) + 1);
    }
    for (const s of sentiment.topBearishSignals) {
      allBearishSignals.set(s, (allBearishSignals.get(s) || 0) + 1);
    }
  }
  
  const total = totalBullish + totalBearish + totalNeutral;
  if (total === 0) {
    return {
      ticker,
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
    };
  }
  
  const bullishPct = Math.round((totalBullish / total) * 100);
  const bearishPct = Math.round((totalBearish / total) * 100);
  const neutralPct = 100 - bullishPct - bearishPct;
  
  let crowdBias: "LONG_BIAS" | "SHORT_BIAS" | "MIXED";
  if (bullishPct >= 60) {
    crowdBias = "LONG_BIAS";
  } else if (bearishPct >= 60) {
    crowdBias = "SHORT_BIAS";
  } else {
    crowdBias = "MIXED";
  }
  
  const topBullishSignals = Array.from(allBullishSignals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([signal]) => signal);
    
  const topBearishSignals = Array.from(allBearishSignals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([signal]) => signal);
  
  return {
    ticker,
    totalMentions: total,
    bullishCount: totalBullish,
    bearishCount: totalBearish,
    neutralCount: totalNeutral,
    bullishPct,
    bearishPct,
    neutralPct,
    crowdBias,
    topBullishSignals,
    topBearishSignals,
  };
}

/**
 * Aggregate data from all three platforms into a unified radar snapshot.
 */
export async function buildUnifiedRadar(): Promise<UnifiedRadarSnapshot> {
  // Fetch data from all platforms in parallel
  const [redditVelocity, redditSentiment, xData, tiktokData] = await Promise.all([
    fetchRedditMentionsCached().catch(() => null),
    fetchRedditSentimentCached().catch(() => null),
    fetchXMentionsCached().catch(() => null),
    fetchTikTokMentionsCached().catch(() => null),
  ]);
  
  // Build a unified map of all tickers
  const tickerMap = new Map<string, {
    redditMentions: number;
    redditEngagement: number;
    redditSentiment: TickerSentimentSplit | null;
    redditVelocityData: any | null;
    xMentions: number;
    xEngagement: number;
    xSentiment: TickerSentimentSplit | null;
    tiktokMentions: number;
    tiktokEngagement: number;
    tiktokSentiment: TickerSentimentSplit | null;
    name: string;
  }>();
  
  const getOrCreate = (ticker: string) => {
    if (!tickerMap.has(ticker)) {
      tickerMap.set(ticker, {
        redditMentions: 0,
        redditEngagement: 0,
        redditSentiment: null,
        redditVelocityData: null,
        xMentions: 0,
        xEngagement: 0,
        xSentiment: null,
        tiktokMentions: 0,
        tiktokEngagement: 0,
        tiktokSentiment: null,
        name: "",
      });
    }
    return tickerMap.get(ticker)!;
  };
  
  // Merge Reddit velocity data
  if (redditVelocity) {
    for (const t of redditVelocity.tickers) {
      const entry = getOrCreate(t.ticker);
      entry.redditMentions = t.mentions;
      entry.redditEngagement = t.upvotes || 0;
      entry.redditVelocityData = t;
      entry.name = t.name || "";
    }
  }
  
  // Merge Reddit sentiment data
  if (redditSentiment) {
    for (const [ticker, sentiment] of Array.from(redditSentiment.tickers.entries())) {
      const entry = getOrCreate(ticker);
      entry.redditSentiment = sentiment;
      // If no velocity data, use sentiment mention count
      if (entry.redditMentions === 0) {
        entry.redditMentions = sentiment.totalMentions;
      }
    }
  }
  
  // Merge X data
  if (xData) {
    for (const [ticker, data] of Array.from(xData.tickers.entries())) {
      const entry = getOrCreate(ticker);
      entry.xMentions = data.mentions;
      entry.xEngagement = data.engagement;
      entry.xSentiment = data.sentiment;
    }
  }
  
  // Merge TikTok data
  if (tiktokData) {
    for (const [ticker, data] of Array.from(tiktokData.tickers.entries())) {
      const entry = getOrCreate(ticker);
      entry.tiktokMentions = data.mentions;
      entry.tiktokEngagement = data.engagement;
      entry.tiktokSentiment = data.sentiment;
    }
  }
  
  // Build unified ticker list
  const unifiedTickers: UnifiedTickerData[] = [];
  
  for (const [ticker, data] of Array.from(tickerMap.entries())) {
    const totalMentions = data.redditMentions + data.xMentions + data.tiktokMentions;
    const totalEngagement = data.redditEngagement + data.xEngagement + data.tiktokEngagement;
    
    // Build platform breakdown
    const platforms: PlatformBreakdown[] = [];
    if (data.redditMentions > 0 || data.redditSentiment) {
      platforms.push({
        platform: "reddit",
        mentions: data.redditMentions,
        engagement: data.redditEngagement,
        sentiment: data.redditSentiment,
      });
    }
    if (data.xMentions > 0 || data.xSentiment) {
      platforms.push({
        platform: "x",
        mentions: data.xMentions,
        engagement: data.xEngagement,
        sentiment: data.xSentiment,
      });
    }
    if (data.tiktokMentions > 0 || data.tiktokSentiment) {
      platforms.push({
        platform: "tiktok",
        mentions: data.tiktokMentions,
        engagement: data.tiktokEngagement,
        sentiment: data.tiktokSentiment,
      });
    }
    
    // Merge sentiment across platforms
    const sentimentInputs = platforms
      .filter(p => p.sentiment != null)
      .map(p => ({ sentiment: p.sentiment!, weight: p.mentions }));
    
    const combinedSentiment = mergeSentimentSplits(ticker, sentimentInputs);
    
    // Reddit velocity data
    const rv = data.redditVelocityData;
    const redditVelocity = rv ? {
      velocityPct: rv.velocityPct ?? 0,
      velocitySignal: rv.velocitySignal ?? "STABLE",
      mentions24hAgo: rv.mentions24hAgo ?? 0,
      rank: rv.rank ?? 0,
      rank24hAgo: rv.rank24hAgo ?? 0,
      upvotes: rv.upvotes ?? 0,
    } : null;
    
    unifiedTickers.push({
      ticker,
      name: data.name || ticker,
      totalMentions,
      totalEngagement,
      platforms,
      platformCount: platforms.length,
      combinedSentiment,
      redditVelocity,
    });
  }
  
  // Sort by total mentions (descending), then by platform count
  unifiedTickers.sort((a, b) => {
    if (b.platformCount !== a.platformCount) return b.platformCount - a.platformCount;
    return b.totalMentions - a.totalMentions;
  });
  
  return {
    fetchedAt: new Date(),
    totalTickers: unifiedTickers.length,
    totalContentScanned: {
      reddit: redditSentiment?.totalPosts ?? 0,
      x: xData?.totalTweets ?? 0,
      tiktok: tiktokData?.totalVideos ?? 0,
      total: (redditSentiment?.totalPosts ?? 0) + (xData?.totalTweets ?? 0) + (tiktokData?.totalVideos ?? 0),
    },
    tickers: unifiedTickers,
  };
}

// ── Cache ──

let cachedUnifiedRadar: UnifiedRadarSnapshot | null = null;
const UNIFIED_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get unified radar data with caching.
 */
export async function getUnifiedRadarCached(): Promise<UnifiedRadarSnapshot> {
  if (cachedUnifiedRadar && (Date.now() - cachedUnifiedRadar.fetchedAt.getTime()) < UNIFIED_CACHE_TTL_MS) {
    return cachedUnifiedRadar;
  }
  
  cachedUnifiedRadar = await buildUnifiedRadar();
  return cachedUnifiedRadar;
}

/**
 * Force refresh all platforms and rebuild unified radar.
 */
export async function refreshUnifiedRadar(): Promise<{
  snapshot: UnifiedRadarSnapshot;
  platformResults: {
    reddit: { totalTickers: number; totalPosts: number };
    x: { totalTickers: number; totalTweets: number };
    tiktok: { totalTickers: number; totalVideos: number };
  };
}> {
  // Refresh all platforms in parallel
  const [redditResult, xResult, tiktokResult] = await Promise.allSettled([
    Promise.all([runRedditScan(), refreshRedditSentiment()]),
    refreshXMentions(),
    refreshTikTokMentions(),
  ]);
  
  // Extract results
  const reddit = redditResult.status === "fulfilled"
    ? { totalTickers: redditResult.value[1].totalTickers, totalPosts: redditResult.value[1].totalPosts }
    : { totalTickers: 0, totalPosts: 0 };
    
  const x = xResult.status === "fulfilled"
    ? { totalTickers: xResult.value.totalTickers, totalTweets: xResult.value.totalTweets }
    : { totalTickers: 0, totalTweets: 0 };
    
  const tiktok = tiktokResult.status === "fulfilled"
    ? { totalTickers: tiktokResult.value.totalTickers, totalVideos: tiktokResult.value.totalVideos }
    : { totalTickers: 0, totalVideos: 0 };
  
  // Log any failures
  if (redditResult.status === "rejected") console.warn("[UnifiedRadar] Reddit refresh failed:", redditResult.reason);
  if (xResult.status === "rejected") console.warn("[UnifiedRadar] X refresh failed:", xResult.reason);
  if (tiktokResult.status === "rejected") console.warn("[UnifiedRadar] TikTok refresh failed:", tiktokResult.reason);
  
  // Rebuild unified view
  cachedUnifiedRadar = null;
  const snapshot = await getUnifiedRadarCached();
  
  return {
    snapshot,
    platformResults: { reddit, x, tiktok },
  };
}
