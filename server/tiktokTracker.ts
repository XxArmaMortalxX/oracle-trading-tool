/**
 * TikTok Stock Mention Tracker
 * 
 * Searches TikTok for stock-related content using the Manus Data API
 * (Tiktok/search_tiktok_video_general), extracts ticker mentions from
 * video descriptions, and classifies sentiment.
 * 
 * TikTok's "fintok" community is a significant driver of retail
 * sentiment — this tracker captures that signal.
 */

import { callDataApi } from "./_core/dataApi";
import { classifyPostSentiment, extractTickers, type PostMention, computeSentimentSplit, type TickerSentimentSplit } from "./redditSentiment";

// ── Types ──

export interface TikTokMentionData {
  ticker: string;
  mentions: number;
  engagement: number; // likes + views
  sentiment: TickerSentimentSplit;
}

export interface TikTokSnapshot {
  fetchedAt: Date;
  totalVideos: number;
  totalTickers: number;
  tickers: Map<string, TikTokMentionData>;
}

interface TikTokVideoData {
  description: string;
  likes: number;
  views: number;
  comments: number;
}

// ── Search Keywords ──
// We search for stock-related terms to find fintok content.
// Each keyword targets a different segment of stock TikTok.

const SEARCH_KEYWORDS = [
  "stock picks today",
  "stocks to buy",
  "day trading stocks",
  "stock market today",
  "penny stocks",
  "short squeeze stocks",
  "meme stocks",
  "options trading",
];

const MAX_SEARCHES_PER_SCAN = 4; // Limit API calls per scan

/**
 * Parse TikTok search results from the API response.
 */
function parseVideosFromResponse(response: any): TikTokVideoData[] {
  const videos: TikTokVideoData[] = [];
  
  try {
    const data = response?.data || [];
    
    for (const item of data) {
      const desc = item.desc || item.title || "";
      const stats = item.statistics || item.stats || {};
      
      videos.push({
        description: desc,
        likes: stats.digg_count || stats.diggCount || stats.like_count || 0,
        views: stats.play_count || stats.playCount || stats.view_count || 0,
        comments: stats.comment_count || stats.commentCount || 0,
      });
    }
  } catch (err) {
    console.warn("[TikTokTracker] Error parsing response:", err);
  }
  
  return videos;
}

/**
 * Search TikTok for videos matching a keyword.
 */
async function searchTikTokVideos(keyword: string): Promise<TikTokVideoData[]> {
  try {
    const result = await callDataApi("Tiktok/search_tiktok_video_general", {
      query: { keyword },
    });
    return parseVideosFromResponse(result);
  } catch (err) {
    console.warn(`[TikTokTracker] Error searching "${keyword}":`, err);
    return [];
  }
}

/**
 * Fetch TikTok stock mentions by searching multiple keywords.
 */
export async function fetchTikTokMentions(): Promise<TikTokSnapshot> {
  const allVideos: { description: string; engagement: number }[] = [];
  
  // Rotate through keywords — pick a random subset each scan
  const shuffled = [...SEARCH_KEYWORDS].sort(() => Math.random() - 0.5);
  const keywordsToSearch = shuffled.slice(0, MAX_SEARCHES_PER_SCAN);
  
  for (const keyword of keywordsToSearch) {
    try {
      const videos = await searchTikTokVideos(keyword);
      for (const v of videos) {
        allVideos.push({
          description: v.description,
          engagement: v.likes + v.views,
        });
      }
      // Small delay between searches
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.warn(`[TikTokTracker] Failed to search "${keyword}":`, err);
    }
  }
  
  console.log(`[TikTokTracker] Fetched ${allVideos.length} videos from ${keywordsToSearch.length} searches`);
  
  // Deduplicate by description
  const seen = new Set<string>();
  const unique = allVideos.filter(v => {
    const key = v.description.slice(0, 100);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // Extract tickers and classify sentiment
  const tickerMentions = new Map<string, PostMention[]>();
  const tickerEngagement = new Map<string, number>();
  
  for (const video of unique) {
    const tickers = extractTickers(video.description);
    for (const ticker of tickers) {
      const result = classifyPostSentiment(video.description, ticker);
      const mention: PostMention = {
        ticker,
        title: video.description,
        subreddit: "tiktok.com", // platform identifier
        score: video.engagement,
        classification: result.classification,
        bullishSignals: result.bullishSignals,
        bearishSignals: result.bearishSignals,
      };
      
      if (!tickerMentions.has(ticker)) {
        tickerMentions.set(ticker, []);
        tickerEngagement.set(ticker, 0);
      }
      tickerMentions.get(ticker)!.push(mention);
      tickerEngagement.set(ticker, (tickerEngagement.get(ticker) || 0) + video.engagement);
    }
  }
  
  // Build ticker data map
  const tickerData = new Map<string, TikTokMentionData>();
  for (const [ticker, mentions] of Array.from(tickerMentions.entries())) {
    tickerData.set(ticker, {
      ticker,
      mentions: mentions.length,
      engagement: tickerEngagement.get(ticker) || 0,
      sentiment: computeSentimentSplit(ticker, mentions),
    });
  }
  
  console.log(`[TikTokTracker] Found ${tickerData.size} tickers from TikTok`);
  
  return {
    fetchedAt: new Date(),
    totalVideos: unique.length,
    totalTickers: tickerData.size,
    tickers: tickerData,
  };
}

// ── Server-side Cache ──

let cachedTikTokSnapshot: TikTokSnapshot | null = null;
const TIKTOK_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch TikTok mentions with caching.
 */
export async function fetchTikTokMentionsCached(): Promise<TikTokSnapshot> {
  if (cachedTikTokSnapshot && (Date.now() - cachedTikTokSnapshot.fetchedAt.getTime()) < TIKTOK_CACHE_TTL_MS) {
    return cachedTikTokSnapshot;
  }
  
  cachedTikTokSnapshot = await fetchTikTokMentions();
  return cachedTikTokSnapshot;
}

/**
 * Force refresh TikTok data (bypasses cache).
 */
export async function refreshTikTokMentions(): Promise<TikTokSnapshot> {
  cachedTikTokSnapshot = null;
  return fetchTikTokMentionsCached();
}
