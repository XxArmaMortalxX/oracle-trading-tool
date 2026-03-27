/**
 * Reddit Sentiment Classifier
 * 
 * Analyzes Reddit post titles to classify each ticker mention as
 * Bullish, Bearish, or Neutral using keyword/phrase matching.
 * 
 * Fetches posts from r/wallstreetbets, r/pennystocks, r/shortsqueeze
 * using Reddit's public JSON API, extracts ticker mentions, and
 * classifies the surrounding context.
 * 
 * Produces per-ticker sentiment splits:
 *   - bullishPct / bearishPct / neutralPct (0-100)
 *   - crowdBias: "LONG_BIAS" | "SHORT_BIAS" | "MIXED"
 *   - totalMentions: number of Reddit posts mentioning this ticker
 */

// ── Keyword Lists ──

const BULLISH_KEYWORDS = [
  // Direct bullish signals
  "calls", "call", "long", "buy", "buying", "bought", "moon", "mooning",
  "rocket", "rockets", "🚀", "squeeze", "squeezing", "breakout", "breaking out",
  "bullish", "bull", "bulls", "upside", "rip", "ripping", "rally", "rallying",
  "pump", "pumping", "tendies", "tendie", "diamond hands", "💎", "🙌",
  "to the moon", "going up", "gap up", "gapping up", "runner", "running",
  "parabolic", "send it", "all in", "yolo", "undervalued", "underpriced",
  "oversold", "accumulate", "accumulating", "loading", "loaded",
  "catalyst", "approval", "approved", "fda approval", "partnership",
  "contract", "deal", "upgrade", "upgraded", "beat", "beats", "earnings beat",
  "revenue beat", "guidance raise", "raised guidance", "insider buying",
  "short squeeze", "gamma squeeze", "high short interest",
  "support", "bounce", "bouncing", "recovery", "recovering",
  "double bottom", "golden cross", "breakout pattern",
  "massive volume", "huge volume", "volume spike",
  "free money", "easy money", "print money", "money printer",
  "next gme", "next amc", "next squeeze",
  "🔥", "🤑", "📈", "💰", "🌙",
];

const BEARISH_KEYWORDS = [
  // Direct bearish signals
  "puts", "put", "short", "shorting", "shorted", "sell", "selling", "sold",
  "dump", "dumping", "dumped", "crash", "crashing", "crashed",
  "bearish", "bear", "bears", "downside", "tank", "tanking", "tanked",
  "plunge", "plunging", "plunged", "drill", "drilling",
  "overvalued", "overpriced", "overbought", "bubble",
  "bag holder", "bagholder", "bagholding", "bag holding",
  "loss porn", "loss", "losses", "red", "bleeding",
  "dead cat bounce", "dead cat", "death cross", "head and shoulders",
  "resistance", "rejection", "rejected", "failed",
  "dilution", "diluted", "offering", "shelf offering", "atm offering",
  "sec investigation", "sec probe", "lawsuit", "fraud", "scam",
  "downgrade", "downgraded", "miss", "missed", "earnings miss",
  "revenue miss", "guidance cut", "lowered guidance", "insider selling",
  "delisting", "delisted", "bankruptcy", "bankrupt",
  "warning", "caution", "careful", "trap", "bull trap",
  "gap down", "gapping down", "falling knife", "knife catching",
  "rug pull", "rugpull", "ponzi",
  "📉", "🔻", "💀", "☠️", "🪦",
];

// ── Types ──

export interface PostMention {
  ticker: string;
  title: string;
  subreddit: string;
  score: number;
  classification: "BULLISH" | "BEARISH" | "NEUTRAL";
  bullishSignals: string[];
  bearishSignals: string[];
}

export interface TickerSentimentSplit {
  ticker: string;
  totalMentions: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  bullishPct: number;
  bearishPct: number;
  neutralPct: number;
  /** Dominant crowd bias based on sentiment split */
  crowdBias: "LONG_BIAS" | "SHORT_BIAS" | "MIXED";
  /** Top bullish signals found across all mentions */
  topBullishSignals: string[];
  /** Top bearish signals found across all mentions */
  topBearishSignals: string[];
}

export interface RedditSentimentSnapshot {
  fetchedAt: Date;
  totalPosts: number;
  totalTickers: number;
  tickers: Map<string, TickerSentimentSplit>;
}

// ── Classifier ──

/**
 * Classify a post title as BULLISH, BEARISH, or NEUTRAL for a given ticker.
 * Uses weighted keyword matching — longer/more specific phrases get higher weight.
 */
export function classifyPostSentiment(title: string, _ticker: string): {
  classification: "BULLISH" | "BEARISH" | "NEUTRAL";
  bullishSignals: string[];
  bearishSignals: string[];
  bullishScore: number;
  bearishScore: number;
} {
  const lower = title.toLowerCase();
  const bullishSignals: string[] = [];
  const bearishSignals: string[] = [];
  let bullishScore = 0;
  let bearishScore = 0;

  // Check bullish keywords — longer phrases get more weight
  for (const kw of BULLISH_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      bullishSignals.push(kw);
      // Multi-word phrases are stronger signals
      const weight = kw.includes(" ") ? 2 : 1;
      bullishScore += weight;
    }
  }

  // Check bearish keywords
  for (const kw of BEARISH_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      bearishSignals.push(kw);
      const weight = kw.includes(" ") ? 2 : 1;
      bearishScore += weight;
    }
  }

  // Determine classification
  let classification: "BULLISH" | "BEARISH" | "NEUTRAL";
  if (bullishScore === 0 && bearishScore === 0) {
    classification = "NEUTRAL";
  } else if (bullishScore > bearishScore) {
    classification = "BULLISH";
  } else if (bearishScore > bullishScore) {
    classification = "BEARISH";
  } else {
    // Tie — classify as NEUTRAL (mixed signals)
    classification = "NEUTRAL";
  }

  return {
    classification,
    bullishSignals: Array.from(new Set(bullishSignals)),
    bearishSignals: Array.from(new Set(bearishSignals)),
    bullishScore,
    bearishScore,
  };
}

/**
 * Compute the sentiment split for a ticker from its post mentions.
 */
export function computeSentimentSplit(ticker: string, mentions: PostMention[]): TickerSentimentSplit {
  const total = mentions.length;
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

  const bullishCount = mentions.filter(m => m.classification === "BULLISH").length;
  const bearishCount = mentions.filter(m => m.classification === "BEARISH").length;
  const neutralCount = mentions.filter(m => m.classification === "NEUTRAL").length;

  const bullishPct = Math.round((bullishCount / total) * 100);
  const bearishPct = Math.round((bearishCount / total) * 100);
  const neutralPct = 100 - bullishPct - bearishPct; // Ensure they sum to 100

  // Determine crowd bias
  let crowdBias: "LONG_BIAS" | "SHORT_BIAS" | "MIXED";
  if (bullishPct >= 60) {
    crowdBias = "LONG_BIAS";
  } else if (bearishPct >= 60) {
    crowdBias = "SHORT_BIAS";
  } else {
    crowdBias = "MIXED";
  }

  // Aggregate top signals
  const bullishSignalCounts = new Map<string, number>();
  const bearishSignalCounts = new Map<string, number>();
  for (const m of mentions) {
    for (const s of m.bullishSignals) {
      bullishSignalCounts.set(s, (bullishSignalCounts.get(s) || 0) + 1);
    }
    for (const s of m.bearishSignals) {
      bearishSignalCounts.set(s, (bearishSignalCounts.get(s) || 0) + 1);
    }
  }

  const topBullishSignals = Array.from(bullishSignalCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([signal]) => signal);

  const topBearishSignals = Array.from(bearishSignalCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([signal]) => signal);

  return {
    ticker,
    totalMentions: total,
    bullishCount,
    bearishCount,
    neutralCount,
    bullishPct,
    bearishPct,
    neutralPct,
    crowdBias,
    topBullishSignals,
    topBearishSignals,
  };
}

// ── Reddit Post Fetcher ──

const TARGET_SUBREDDITS = ["wallstreetbets", "pennystocks", "shortsqueeze"];
const POSTS_PER_SUBREDDIT = 100; // 50 hot + 50 new
const FETCH_TIMEOUT_MS = 12000;

// Common words to exclude from ticker detection
const COMMON_WORDS = new Set([
  "I", "A", "THE", "AND", "FOR", "TO", "IN", "IS", "IT", "OF", "ON", "AT",
  "OR", "IF", "MY", "AM", "AN", "AS", "BE", "BY", "DO", "GO", "HE", "ME",
  "NO", "SO", "UP", "WE", "ALL", "ANY", "ARE", "BUT", "CAN", "DID", "GET",
  "GOT", "HAS", "HAD", "HER", "HIM", "HIS", "HOW", "ITS", "LET", "MAY",
  "NEW", "NOT", "NOW", "OLD", "OUR", "OUT", "OWN", "SAY", "SHE", "TOO",
  "USE", "WAS", "WAY", "WHO", "WHY", "YET", "YOU", "JUST", "LIKE", "BEEN",
  "HAVE", "WILL", "WITH", "THIS", "THAT", "FROM", "THEY", "SOME", "THAN",
  "THEM", "THEN", "WHAT", "WHEN", "YOUR", "ALSO", "BACK", "EVEN", "GOOD",
  "MADE", "MAKE", "MOST", "MUCH", "ONLY", "OVER", "SAID", "SAME", "VERY",
  "WELL", "YEAR", "BEST", "EVER", "LAST", "LONG", "MANY", "NEXT", "TAKE",
  "WANT", "WENT", "WERE", "WORK", "KNOW", "COME", "EACH", "FIND", "GIVE",
  "HELP", "HERE", "HIGH", "KEEP", "LOOK", "PART", "REAL", "SEEM", "SHOW",
  "SUCH", "SURE", "TELL", "TIME", "TURN", "USED", "WEEK", "IPO", "CEO",
  "CFO", "SEC", "ETF", "GDP", "FED", "NYSE", "DOW", "SET", "TV", "AI",
  "VS", "USA", "UK", "EU", "US", "DD", "TA", "WSB", "IMO", "FYI", "TBH",
  "YOLO", "LOL", "RIP", "ATH", "ATL", "EOD", "EOW", "PM", "AH", "PT",
  "OG", "OP", "TL", "DR", "TLDR", "EDIT", "UPDATE", "PSA", "HUGE", "BIG",
  "BAD", "PUTS", "CALL", "CALLS", "SELL", "BUY", "HOLD", "MOON", "DIP",
  "LOSS", "GAIN", "PLAY", "MOVE", "PUMP", "DUMP", "BEAR", "BULL", "RED",
  "GREEN", "STOCK", "DAILY", "AFTER", "GOING", "ABOUT", "SINCE", "STILL",
  "COULD", "WOULD", "THINK", "EVERY", "FIRST", "GREAT", "NEVER", "OTHER",
  "PRICE", "RIGHT", "SMALL", "START", "THOSE", "THREE", "TODAY", "UNDER",
  "WHERE", "WHICH", "WORLD", "AGAIN", "BEING", "BELOW", "MIGHT", "MONEY",
  "POINT", "THESE", "THING", "WHILE", "WORST", "WATCH", "SHORT", "TRADE",
  "RALLY", "CRASH", "WORTH", "SHARE", "MARCH", "APRIL", "JUNE", "JULY",
  "RACE", "FREE", "FULL", "HALF", "HARD", "HOPE", "IDEA", "INTO", "JUST",
  "KIND", "LATE", "LEFT", "LESS", "LIFE", "LINE", "LIST", "LIVE", "LOST",
  "LOTS", "LOVE", "LUCK", "MAIN", "MARK", "MEAN", "MIND", "MISS", "MORE",
  "MUST", "NAME", "NEED", "NEWS", "NICE", "NONE", "NOTE", "ONCE", "OPEN",
  "PAID", "PAST", "PICK", "PLAN", "POST", "PURE", "PUSH", "RATE", "READ",
  "RISK", "RULE", "SAFE", "SAVE", "SEEN", "SELL", "SENT", "SIDE", "SIGN",
  "SIZE", "SOLD", "SOON", "STOP", "SURE", "TALK", "TERM", "TEST", "TEXT",
  "THEM", "THEN", "TILL", "TOLD", "TOOK", "TRUE", "TYPE", "WAIT", "WAKE",
  "WALK", "WALL", "WEAK", "WENT", "WHAT", "WHEN", "WIDE", "WILD", "WINS",
  "WISE", "WISH", "WORD", "YEAR", "ZERO",
]);

// Ticker patterns: $TICKER or standalone uppercase 2-5 letter words
const DOLLAR_TICKER_RE = /\$([A-Z]{1,5})\b/g;
const WORD_TICKER_RE = /\b([A-Z]{2,5})\b/g;

/**
 * Extract ticker symbols from a post title.
 * Prioritizes $TICKER format, falls back to uppercase word matching.
 */
export function extractTickers(title: string): string[] {
  const tickers = new Set<string>();

  // First pass: $TICKER format (high confidence)
  let match;
  const dollarRe = new RegExp(DOLLAR_TICKER_RE.source, "g");
  while ((match = dollarRe.exec(title)) !== null) {
    const t = match[1];
    if (!COMMON_WORDS.has(t)) {
      tickers.add(t);
    }
  }

  // Second pass: uppercase words (lower confidence, skip if already found $TICKER)
  const wordRe = new RegExp(WORD_TICKER_RE.source, "g");
  while ((match = wordRe.exec(title)) !== null) {
    const t = match[1];
    if (!COMMON_WORDS.has(t) && t.length >= 2) {
      tickers.add(t);
    }
  }

  return Array.from(tickers);
}

interface RedditPost {
  title: string;
  score: number;
  subreddit: string;
}

/**
 * Fetch posts from a subreddit using Reddit's public JSON API.
 */
async function fetchSubredditPosts(subreddit: string, sort: "hot" | "new", limit: number): Promise<RedditPost[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "OracleDecoded/1.0 (stock scanner)" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!resp.ok) {
      console.warn(`[RedditSentiment] r/${subreddit}/${sort} returned ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    const children = data?.data?.children || [];

    return children.map((c: any) => ({
      title: c?.data?.title || "",
      score: c?.data?.score || 0,
      subreddit,
    }));
  } catch (err) {
    console.warn(`[RedditSentiment] Error fetching r/${subreddit}/${sort}:`, err);
    return [];
  }
}

/**
 * Fetch posts from all target subreddits (hot + new).
 */
export async function fetchAllRedditPosts(): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = [];

  for (const sub of TARGET_SUBREDDITS) {
    // Fetch hot and new posts
    const [hotPosts, newPosts] = await Promise.all([
      fetchSubredditPosts(sub, "hot", 50),
      fetchSubredditPosts(sub, "new", 50),
    ]);

    allPosts.push(...hotPosts, ...newPosts);

    // Small delay between subreddits to be respectful
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Deduplicate by title
  const seen = new Set<string>();
  const unique: RedditPost[] = [];
  for (const post of allPosts) {
    if (!seen.has(post.title)) {
      seen.add(post.title);
      unique.push(post);
    }
  }

  console.log(`[RedditSentiment] Fetched ${unique.length} unique posts from ${TARGET_SUBREDDITS.length} subreddits`);
  return unique;
}

/**
 * Process all posts: extract tickers, classify sentiment, compute splits.
 */
export function processPostsForSentiment(posts: RedditPost[]): Map<string, TickerSentimentSplit> {
  // Step 1: Extract ticker mentions from all posts
  const tickerMentions = new Map<string, PostMention[]>();

  for (const post of posts) {
    const tickers = extractTickers(post.title);
    for (const ticker of tickers) {
      const result = classifyPostSentiment(post.title, ticker);
      const mention: PostMention = {
        ticker,
        title: post.title,
        subreddit: post.subreddit,
        score: post.score,
        classification: result.classification,
        bullishSignals: result.bullishSignals,
        bearishSignals: result.bearishSignals,
      };

      if (!tickerMentions.has(ticker)) {
        tickerMentions.set(ticker, []);
      }
      tickerMentions.get(ticker)!.push(mention);
    }
  }

  // Step 2: Compute sentiment split for each ticker
  const result = new Map<string, TickerSentimentSplit>();
  for (const [ticker, mentions] of Array.from(tickerMentions.entries())) {
    result.set(ticker, computeSentimentSplit(ticker, mentions));
  }

  return result;
}

// ── Server-side Cache ──

let cachedSentiment: RedditSentimentSnapshot | null = null;
const SENTIMENT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch and analyze Reddit sentiment with caching.
 * Returns cached data if fresh enough.
 */
export async function fetchRedditSentimentCached(): Promise<RedditSentimentSnapshot> {
  if (cachedSentiment && (Date.now() - cachedSentiment.fetchedAt.getTime()) < SENTIMENT_CACHE_TTL_MS) {
    return cachedSentiment;
  }

  const posts = await fetchAllRedditPosts();
  const tickers = processPostsForSentiment(posts);

  cachedSentiment = {
    fetchedAt: new Date(),
    totalPosts: posts.length,
    totalTickers: tickers.size,
    tickers,
  };

  console.log(`[RedditSentiment] Analyzed ${posts.length} posts, found ${tickers.size} tickers with sentiment data`);
  return cachedSentiment;
}

/**
 * Get sentiment split for specific tickers (from cache).
 */
export async function getSentimentForTickers(tickers: string[]): Promise<Map<string, TickerSentimentSplit>> {
  const snapshot = await fetchRedditSentimentCached();
  const result = new Map<string, TickerSentimentSplit>();

  for (const ticker of tickers) {
    const data = snapshot.tickers.get(ticker);
    if (data) {
      result.set(ticker, data);
    }
  }

  return result;
}

/**
 * Force refresh Reddit sentiment data (bypasses cache).
 */
export async function refreshRedditSentiment(): Promise<RedditSentimentSnapshot> {
  cachedSentiment = null;
  return fetchRedditSentimentCached();
}
