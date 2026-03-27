/**
 * Reddit Mention Velocity Tracker
 * 
 * Fetches stock mention data from ApeWisdom (which aggregates Reddit mentions
 * from r/wallstreetbets, r/pennystocks, r/shortsqueeze, r/stocks, etc.)
 * and computes mention velocity — how fast mentions are accelerating.
 * 
 * A stock going from 5 mentions/hour to 50 mentions/hour is the signal.
 * That acceleration is what this tracker detects.
 */

import { getDb } from "./db";
import { redditMentions } from "../drizzle/schema";
import { desc, eq, and, gte, sql } from "drizzle-orm";

// ── Types ──

export interface RedditMentionData {
  ticker: string;
  name: string;
  rank: number;
  mentions: number;
  mentions24hAgo: number;
  upvotes: number;
  rank24hAgo: number;
  /** Absolute velocity: mentions - mentions24hAgo */
  velocityAbs: number;
  /** Percentage velocity: ((mentions / mentions24hAgo) - 1) * 100 */
  velocityPct: number;
  /** Velocity classification */
  velocitySignal: "EXPLODING" | "SURGING" | "RISING" | "STABLE" | "FADING" | "COLD";
}

export interface VelocitySnapshot {
  snapshotId: string;
  fetchedAt: Date;
  totalTickers: number;
  tickers: RedditMentionData[];
}

export interface TickerVelocityHistory {
  ticker: string;
  current: RedditMentionData | null;
  history: Array<{
    mentions: number;
    velocityPct: number;
    velocityAbs: number;
    rank: number;
    createdAt: Date;
  }>;
  /** Acceleration: is velocity itself increasing? */
  acceleration: "ACCELERATING" | "DECELERATING" | "STEADY";
  /** Mentions per hour estimate based on 24h window */
  mentionsPerHour: number;
}

// ── ApeWisdom API ──

const APEWISDOM_BASE = "https://apewisdom.io/api/v1.0";
const MAX_PAGES = 5; // Up to 500 tickers (100 per page)

interface ApeWisdomResult {
  rank: number;
  ticker: string;
  name: string;
  mentions: number;
  upvotes: number;
  rank_24h_ago: number;
  mentions_24h_ago: number;
}

interface ApeWisdomResponse {
  count: number;
  pages: number;
  current_page: number;
  results: ApeWisdomResult[];
}

/**
 * Fetch mention data from ApeWisdom API (aggregates Reddit stock mentions).
 * Fetches multiple pages to get comprehensive coverage.
 */
export async function fetchRedditMentions(maxPages = MAX_PAGES): Promise<RedditMentionData[]> {
  const allResults: RedditMentionData[] = [];
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = `${APEWISDOM_BASE}/filter/all-stocks/page/${page}`;
      const resp = await fetch(url, {
        headers: { "User-Agent": "OracleDecoded/1.0" },
        signal: AbortSignal.timeout(10000),
      });
      
      if (!resp.ok) {
        console.warn(`[RedditTracker] ApeWisdom page ${page} returned ${resp.status}`);
        break;
      }
      
      const data: ApeWisdomResponse = await resp.json();
      
      if (!data.results || data.results.length === 0) break;
      
      for (const r of data.results) {
        const mentions = r.mentions || 0;
        const mentions24hAgo = r.mentions_24h_ago || 0;
        const velocityAbs = mentions - mentions24hAgo;
        const velocityPct = mentions24hAgo > 0
          ? ((mentions / mentions24hAgo) - 1) * 100
          : mentions > 0 ? 999 : 0;
        
        allResults.push({
          ticker: r.ticker,
          name: r.name || r.ticker,
          rank: r.rank,
          mentions,
          mentions24hAgo,
          upvotes: r.upvotes || 0,
          rank24hAgo: r.rank_24h_ago || 0,
          velocityAbs,
          velocityPct,
          velocitySignal: classifyVelocity(velocityPct, velocityAbs, mentions),
        });
      }
      
      // Stop if we've fetched all pages
      if (page >= data.pages) break;
      
      // Small delay between pages to be respectful
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      console.warn(`[RedditTracker] Error fetching page ${page}:`, err);
      break;
    }
  }
  
  console.log(`[RedditTracker] Fetched ${allResults.length} tickers from ApeWisdom`);
  return allResults;
}

/**
 * Classify mention velocity into a signal level.
 * 
 * EXPLODING: >200% increase with significant absolute volume
 * SURGING: >100% increase or large absolute jump
 * RISING: >30% increase
 * STABLE: -30% to +30%
 * FADING: -30% to -60%
 * COLD: <-60% or very low mentions
 */
export function classifyVelocity(velocityPct: number, velocityAbs: number, currentMentions: number): RedditMentionData["velocitySignal"] {
  // Need minimum mentions to be meaningful
  if (currentMentions < 3) return "COLD";
  
  if (velocityPct > 200 && velocityAbs >= 10) return "EXPLODING";
  if (velocityPct > 100 || velocityAbs >= 50) return "SURGING";
  if (velocityPct > 30) return "RISING";
  if (velocityPct > -30) return "STABLE";
  if (velocityPct > -60) return "FADING";
  return "COLD";
}

// ── DB Operations ──

/**
 * Store a snapshot of Reddit mention data in the database.
 */
export async function storeRedditSnapshot(data: RedditMentionData[]): Promise<string> {
  const db = await getDb();
  if (!db || data.length === 0) return "";
  
  const snapshotId = `reddit-${Date.now()}`;
  
  // Insert in batches of 50
  const batchSize = 50;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await db.insert(redditMentions).values(
      batch.map(d => ({
        ticker: d.ticker,
        mentions: d.mentions,
        mentions24hAgo: d.mentions24hAgo,
        upvotes: d.upvotes,
        rank: d.rank,
        rank24hAgo: d.rank24hAgo,
        velocityPct: d.velocityPct,
        velocityAbs: d.velocityAbs,
        snapshotId,
      }))
    );
  }
  
  console.log(`[RedditTracker] Stored ${data.length} mention records (snapshot: ${snapshotId})`);
  return snapshotId;
}

/**
 * Get the latest Reddit mention data for specific tickers.
 */
export async function getLatestMentionsForTickers(tickers: string[]): Promise<Map<string, RedditMentionData>> {
  const db = await getDb();
  const result = new Map<string, RedditMentionData>();
  if (!db || tickers.length === 0) return result;
  
  try {
    // Get the most recent snapshot ID
    const latestRow = await db
      .select({ snapshotId: redditMentions.snapshotId })
      .from(redditMentions)
      .orderBy(desc(redditMentions.createdAt))
      .limit(1);
    
    if (latestRow.length === 0 || !latestRow[0].snapshotId) return result;
    
    const latestSnapshotId = latestRow[0].snapshotId;
    
    // Get all mentions from the latest snapshot for our tickers
    const rows = await db
      .select()
      .from(redditMentions)
      .where(eq(redditMentions.snapshotId, latestSnapshotId));
    
    for (const row of rows) {
      if (tickers.includes(row.ticker)) {
        result.set(row.ticker, {
          ticker: row.ticker,
          name: row.ticker, // ApeWisdom name not stored, use ticker
          rank: row.rank || 0,
          mentions: row.mentions,
          mentions24hAgo: row.mentions24hAgo || 0,
          upvotes: row.upvotes || 0,
          rank24hAgo: row.rank24hAgo || 0,
          velocityAbs: row.velocityAbs || 0,
          velocityPct: row.velocityPct || 0,
          velocitySignal: classifyVelocity(row.velocityPct || 0, row.velocityAbs || 0, row.mentions),
        });
      }
    }
  } catch (err) {
    console.warn("[RedditTracker] Error fetching latest mentions:", err);
  }
  
  return result;
}

/**
 * Get velocity history for a specific ticker (last N snapshots).
 */
export async function getTickerVelocityHistory(ticker: string, limit = 24): Promise<TickerVelocityHistory> {
  const db = await getDb();
  const history: TickerVelocityHistory = {
    ticker,
    current: null,
    history: [],
    acceleration: "STEADY",
    mentionsPerHour: 0,
  };
  
  if (!db) return history;
  
  try {
    const rows = await db
      .select()
      .from(redditMentions)
      .where(eq(redditMentions.ticker, ticker))
      .orderBy(desc(redditMentions.createdAt))
      .limit(limit);
    
    if (rows.length === 0) return history;
    
    // Most recent is current
    const latest = rows[0];
    history.current = {
      ticker: latest.ticker,
      name: latest.ticker,
      rank: latest.rank || 0,
      mentions: latest.mentions,
      mentions24hAgo: latest.mentions24hAgo || 0,
      upvotes: latest.upvotes || 0,
      rank24hAgo: latest.rank24hAgo || 0,
      velocityAbs: latest.velocityAbs || 0,
      velocityPct: latest.velocityPct || 0,
      velocitySignal: classifyVelocity(latest.velocityPct || 0, latest.velocityAbs || 0, latest.mentions),
    };
    
    // Build history
    history.history = rows.map(r => ({
      mentions: r.mentions,
      velocityPct: r.velocityPct || 0,
      velocityAbs: r.velocityAbs || 0,
      rank: r.rank || 0,
      createdAt: r.createdAt,
    }));
    
    // Compute acceleration (is velocity itself increasing?)
    if (rows.length >= 2) {
      const currentVel = latest.velocityPct || 0;
      const previousVel = rows[1].velocityPct || 0;
      const velDelta = currentVel - previousVel;
      
      if (velDelta > 20) history.acceleration = "ACCELERATING";
      else if (velDelta < -20) history.acceleration = "DECELERATING";
      else history.acceleration = "STEADY";
    }
    
    // Estimate mentions per hour (24h window)
    history.mentionsPerHour = Math.round((latest.mentions || 0) / 24 * 10) / 10;
    
  } catch (err) {
    console.warn("[RedditTracker] Error fetching velocity history:", err);
  }
  
  return history;
}

/**
 * Get the top trending tickers by velocity (biggest movers).
 */
export async function getTopTrendingTickers(limit = 20): Promise<RedditMentionData[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    // Get the most recent snapshot
    const latestRow = await db
      .select({ snapshotId: redditMentions.snapshotId })
      .from(redditMentions)
      .orderBy(desc(redditMentions.createdAt))
      .limit(1);
    
    if (latestRow.length === 0 || !latestRow[0].snapshotId) return [];
    
    const rows = await db
      .select()
      .from(redditMentions)
      .where(
        and(
          eq(redditMentions.snapshotId, latestRow[0].snapshotId),
          gte(redditMentions.mentions, 5) // Minimum 5 mentions to be meaningful
        )
      )
      .orderBy(desc(redditMentions.velocityPct))
      .limit(limit);
    
    return rows.map(r => ({
      ticker: r.ticker,
      name: r.ticker,
      rank: r.rank || 0,
      mentions: r.mentions,
      mentions24hAgo: r.mentions24hAgo || 0,
      upvotes: r.upvotes || 0,
      rank24hAgo: r.rank24hAgo || 0,
      velocityAbs: r.velocityAbs || 0,
      velocityPct: r.velocityPct || 0,
      velocitySignal: classifyVelocity(r.velocityPct || 0, r.velocityAbs || 0, r.mentions),
    }));
  } catch (err) {
    console.warn("[RedditTracker] Error fetching trending tickers:", err);
    return [];
  }
}

// ── Server-side Cache ──

let cachedSnapshot: VelocitySnapshot | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch Reddit mentions with caching. Returns cached data if fresh enough.
 */
export async function fetchRedditMentionsCached(): Promise<VelocitySnapshot> {
  if (cachedSnapshot && (Date.now() - cachedSnapshot.fetchedAt.getTime()) < CACHE_TTL_MS) {
    return cachedSnapshot;
  }
  
  const tickers = await fetchRedditMentions();
  
  cachedSnapshot = {
    snapshotId: `reddit-${Date.now()}`,
    fetchedAt: new Date(),
    totalTickers: tickers.length,
    tickers,
  };
  
  return cachedSnapshot;
}

/**
 * Full scan: fetch from ApeWisdom, store snapshot, return data.
 */
export async function runRedditScan(): Promise<VelocitySnapshot> {
  const snapshot = await fetchRedditMentionsCached();
  
  // Store in DB for historical tracking
  if (snapshot.tickers.length > 0) {
    await storeRedditSnapshot(snapshot.tickers);
  }
  
  return snapshot;
}
