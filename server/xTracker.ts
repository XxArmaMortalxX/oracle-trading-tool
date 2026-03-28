/**
 * X (Twitter) Stock Mention Tracker
 * 
 * Fetches stock-related tweets from popular finance accounts using the
 * Manus Data API (Twitter/get_user_tweets), extracts ticker mentions,
 * and classifies sentiment using the shared sentiment classifier.
 * 
 * Approach:
 * - Fetch recent tweets from popular stock-focused Twitter accounts
 * - Extract $TICKER cashtag mentions and uppercase ticker patterns
 * - Classify each mention as Bullish/Bearish/Neutral
 * - Aggregate per-ticker mention counts and sentiment splits
 */

import { callDataApi } from "./_core/dataApi";
import { classifyPostSentiment, extractTickers, type PostMention, computeSentimentSplit, type TickerSentimentSplit } from "./redditSentiment";

// ── Types ──

export interface XMentionData {
  ticker: string;
  mentions: number;
  engagement: number; // likes + retweets
  sentiment: TickerSentimentSplit;
}

export interface XSnapshot {
  fetchedAt: Date;
  totalTweets: number;
  totalTickers: number;
  tickers: Map<string, XMentionData>;
}

interface TweetData {
  text: string;
  likes: number;
  retweets: number;
  replies: number;
}

// ── Popular Stock Twitter Accounts ──
// These accounts frequently discuss stocks with cashtags.
// We fetch their recent tweets and extract ticker mentions.

const STOCK_TWITTER_ACCOUNTS: { userId: string; handle: string }[] = [
  { userId: "361aboratory", handle: "unusual_whales" },   // Unusual Whales
  { userId: "1334488366523658243", handle: "DeItaone" },   // Walter Bloomberg
  { userId: "1541576208", handle: "StockMKTNewz" },        // Stock Market News
  { userId: "2768501", handle: "ReformedBroker" },         // Josh Brown
  { userId: "14281853", handle: "jimcramer" },             // Jim Cramer
  { userId: "50585544", handle: "staboratory" },           // Stocktwits
  { userId: "624413", handle: "MarketWatch" },             // MarketWatch
  { userId: "69620713", handle: "OptionsAction" },         // Options Action
  { userId: "1652541", handle: "Benzinga" },               // Benzinga
  { userId: "2884641", handle: "WSJmarkets" },             // WSJ Markets
];

// We only fetch from a subset to stay within rate limits
const MAX_ACCOUNTS_PER_SCAN = 5;
const TWEETS_PER_ACCOUNT = 20;

/**
 * Parse tweets from the Twitter API response structure.
 */
function parseTweetsFromResponse(response: any): TweetData[] {
  const tweets: TweetData[] = [];
  
  try {
    const timeline = response?.result?.timeline;
    if (!timeline) return tweets;
    
    const instructions = timeline.instructions || [];
    for (const instruction of instructions) {
      if (instruction.type === "TimelineAddEntries") {
        const entries = instruction.entries || [];
        for (const entry of entries) {
          if (entry.entryId?.startsWith("tweet-")) {
            const tweetResult = entry.content?.itemContent?.tweet_results?.result;
            if (tweetResult) {
              const legacy = tweetResult.legacy || {};
              const text = legacy.full_text || "";
              tweets.push({
                text,
                likes: legacy.favorite_count || 0,
                retweets: legacy.retweet_count || 0,
                replies: legacy.reply_count || 0,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("[XTracker] Error parsing tweet response:", err);
  }
  
  return tweets;
}

/**
 * Fetch tweets from a specific Twitter user using the Data API.
 */
async function fetchUserTweets(userId: string, count: number = TWEETS_PER_ACCOUNT): Promise<TweetData[]> {
  try {
    const result = await callDataApi("Twitter/get_user_tweets", {
      query: { user: userId, count: String(count) },
    });
    return parseTweetsFromResponse(result);
  } catch (err) {
    console.warn(`[XTracker] Error fetching tweets for user ${userId}:`, err);
    return [];
  }
}

/**
 * Fetch tweets from all target accounts and extract stock mentions.
 */
export async function fetchXMentions(): Promise<XSnapshot> {
  const allTweets: { text: string; engagement: number }[] = [];
  
  // Rotate through accounts — pick a random subset each scan
  const shuffled = [...STOCK_TWITTER_ACCOUNTS].sort(() => Math.random() - 0.5);
  const accountsToFetch = shuffled.slice(0, MAX_ACCOUNTS_PER_SCAN);
  
  for (const account of accountsToFetch) {
    try {
      const tweets = await fetchUserTweets(account.userId);
      for (const t of tweets) {
        allTweets.push({
          text: t.text,
          engagement: t.likes + t.retweets,
        });
      }
      // Small delay between accounts
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.warn(`[XTracker] Failed to fetch @${account.handle}:`, err);
    }
  }
  
  console.log(`[XTracker] Fetched ${allTweets.length} tweets from ${accountsToFetch.length} accounts`);
  
  // Extract tickers and classify sentiment
  const tickerMentions = new Map<string, PostMention[]>();
  const tickerEngagement = new Map<string, number>();
  
  for (const tweet of allTweets) {
    const tickers = extractTickers(tweet.text);
    for (const ticker of tickers) {
      const result = classifyPostSentiment(tweet.text, ticker);
      const mention: PostMention = {
        ticker,
        title: tweet.text,
        subreddit: "x.com", // platform identifier
        score: tweet.engagement,
        classification: result.classification,
        bullishSignals: result.bullishSignals,
        bearishSignals: result.bearishSignals,
      };
      
      if (!tickerMentions.has(ticker)) {
        tickerMentions.set(ticker, []);
        tickerEngagement.set(ticker, 0);
      }
      tickerMentions.get(ticker)!.push(mention);
      tickerEngagement.set(ticker, (tickerEngagement.get(ticker) || 0) + tweet.engagement);
    }
  }
  
  // Build ticker data map
  const tickerData = new Map<string, XMentionData>();
  for (const [ticker, mentions] of Array.from(tickerMentions.entries())) {
    tickerData.set(ticker, {
      ticker,
      mentions: mentions.length,
      engagement: tickerEngagement.get(ticker) || 0,
      sentiment: computeSentimentSplit(ticker, mentions),
    });
  }
  
  console.log(`[XTracker] Found ${tickerData.size} tickers from X/Twitter`);
  
  return {
    fetchedAt: new Date(),
    totalTweets: allTweets.length,
    totalTickers: tickerData.size,
    tickers: tickerData,
  };
}

// ── Server-side Cache ──

let cachedXSnapshot: XSnapshot | null = null;
const X_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch X mentions with caching.
 */
export async function fetchXMentionsCached(): Promise<XSnapshot> {
  if (cachedXSnapshot && (Date.now() - cachedXSnapshot.fetchedAt.getTime()) < X_CACHE_TTL_MS) {
    return cachedXSnapshot;
  }
  
  cachedXSnapshot = await fetchXMentions();
  return cachedXSnapshot;
}

/**
 * Force refresh X data (bypasses cache).
 */
export async function refreshXMentions(): Promise<XSnapshot> {
  cachedXSnapshot = null;
  return fetchXMentionsCached();
}
