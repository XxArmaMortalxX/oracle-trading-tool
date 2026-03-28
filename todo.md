# Oracle Decoded — Migration TODO

## Database Schema
- [x] Create scan_sessions table
- [x] Create scan_picks table
- [x] Create notification_preferences table
- [x] Run migrations via webdev_execute_sql

## Server-Side Code
- [x] Migrate shared/types.ts (OraclePick, ScanSession, NotificationPrefs types)
- [x] Migrate shared/const.ts (cookie name, constants)
- [x] Migrate server/oracleScanner.ts (scoring algorithm + Yahoo Finance API)
- [x] Migrate server/scanRunner.ts (fetch → score → store → notify pipeline)
- [x] Migrate server/routers.ts (scan + notification tRPC routes)
- [x] Migrate server/scanDb.ts (database query helpers)

## Frontend Design System
- [x] Migrate index.css (Signal Deck dark theme, emerald/rose/indigo palette)
- [x] Migrate index.html (Google Fonts: Instrument Sans, DM Sans, IBM Plex Mono)
- [x] Migrate Layout component (nav with 6 routes, mobile menu)

## Frontend Pages
- [x] Migrate Home page (hero, stats, features, three engines)
- [x] Migrate Methodology page (three engines deep dive)
- [x] Migrate Framework page (7-step pennystocking)
- [x] Migrate Calculator page (RCT calculator)
- [x] Migrate Screener page (stock screener simulator)
- [x] Migrate Dashboard page (live picks, scan history, notifications)

## App Configuration
- [x] Migrate App.tsx (routes, theme provider)
- [x] Client const.ts (getLoginUrl) — already in new scaffold

## Tests
- [x] Migrate oracleScanner.test.ts (10 tests)
- [x] Verify auth.logout.test.ts still passes (1 test)
- [x] All 11 tests passing

## Final Verification
- [x] Dev server runs without errors
- [x] All pages render correctly in browser
- [x] Save checkpoint and deliver

## Real-Time Market Data Update
- [x] Research available real-time stock market data APIs
- [x] Update oracleScanner.ts to fetch live market data (prices, volume, gaps, market cap, float)
- [x] Expand the scan universe to cover more tickers dynamically (200+ tickers)
- [x] Update the Screener page to use live data instead of sample data
- [x] Test scanner with real market data end-to-end (28 tests passing)
- [x] Verify Dashboard displays live picks correctly

## Screener Live Data Integration
- [x] Create backend tRPC screener.scan endpoint that fetches live data from Yahoo Finance
- [x] Support server-side filtering by price range, volume, gap %, and change %
- [x] Update Screener.tsx to call the tRPC endpoint instead of using static sample data
- [x] Add loading states, error handling, rate-limit warning, and empty states for live data
- [x] Write vitest tests for the screener endpoint (8 tests with mocked data)
- [x] Verify end-to-end in browser

## Dashboard Live Picks Refresh Button
- [x] Review current Dashboard refresh button implementation
- [x] Add scan.refreshPicks tRPC mutation (forces fresh Yahoo Finance scan, bypasses same-day dedup)
- [x] Update scanRunner.ts with force option to bypass same-day check
- [x] Wire Refresh button to call refreshPicks mutation with spinner + toast feedback
- [x] Ensure refresh button pulls real-time data from Yahoo Finance (verified via curl: 20 picks, 105 stocks)
- [x] Add loading state feedback when refreshing (spinner + "Scanning Market" badge)
- [x] Test refresh functionality end-to-end (curl verified: session #30005, #30006)
- [x] Write/update tests for the refresh flow (2 new tests, 38 total passing)

## Sentiment Data Integration
- [x] Research free sentiment APIs (StockTwits blocked by Cloudflare, Finnhub needs key, Data API quota limited)
- [x] Build Technical Sentiment Engine (sentimentEngine.ts) — derives sentiment from price action data
- [x] Add sentimentScore and sentimentLabel columns to scan_picks DB table (migration applied)
- [x] Integrate sentiment into oracleScanner.ts (computed per pick during scan)
- [x] Store sentiment in DB via scanRunner.ts
- [x] Display sentiment badges on Dashboard Live Picks table (color-coded with icons)
- [x] Display sentiment on Screener results (new column with badges)
- [x] Sentiment engine analyzes: momentum, volume conviction, gap, 52-week position, intraday strength
- [x] Write 20 comprehensive sentiment engine tests (sentimentEngine.test.ts)
- [x] All 58 tests passing across 5 test files
- [x] Verify end-to-end: 20 picks with sentiment scores (-60 to +12) displayed correctly

## Sentiment Trend Arrows
- [x] Create sentiment_history DB table with ticker index (migration 0003 applied)
- [x] Add getPreviousSentimentByTickers and storeSentimentSnapshots helpers to scanDb.ts
- [x] Update scanRunner to store sentiment snapshots after each scan
- [x] Build computeSentimentTrend function in sentimentEngine.ts (improving/declining/stable + delta)
- [x] Add sentimentTrend, sentimentDelta, sentimentTransition fields to pick data
- [x] Enrich Dashboard latestPicks and refreshPicks with trend data from DB history
- [x] Display trend arrows on Dashboard picks table (↑/↓/→ with color-coded badges + transitions)
- [x] Enrich Screener results with trend data by comparing against DB history
- [x] Display trend arrows on Screener results (new Trend column)
- [x] Show transition labels (e.g., "Neutral → Bullish")
- [x] All 58 tests passing across 5 test files
- [x] Verified end-to-end: live scan stores history, trends computed correctly


## Reddit Mention Velocity Tracker
- [x] Research Reddit API/data access methods (ApeWisdom API — free, no auth, tracks 500+ tickers)
- [x] Build redditTracker.ts module using ApeWisdom API (fetchRedditMentionsCached, runRedditScan)
- [x] Implement velocity computation (mentions vs 24h ago, acceleration %, signal classification)
- [x] Signal classification: EXPLODING (≥200%), SURGING (≥100%), RISING (≥30%), STABLE, FADING, COLD
- [x] Create reddit_mentions DB table with ticker index (migration 0004 applied)
- [x] Add tRPC routes: reddit.trending, reddit.forTickers, reddit.tickerHistory, reddit.refresh, reddit.topTrending
- [x] Build SocialRadar component on Dashboard (top movers, velocity badges, refresh button)
- [x] Integrate Reddit data into Dashboard picks table (REDDIT column with mentions + velocity %)
- [x] Integrate Reddit data into Screener results (mentions, velocity, signal per stock)
- [x] Server-side caching (10-min TTL) to reduce ApeWisdom API calls
- [x] Write 18 Reddit tracker tests (velocity calc, signal classification, data transformation, edge cases)
- [x] All 76 tests passing across 6 test files
- [x] Verified: 500 tickers tracked, RCKT EXPLODING at 2150%, SNAP EXPLODING at 900%

## Reddit Sentiment Classification
- [x] Build keyword-based sentiment classifier (bullish/bearish/neutral) with defined signal words
- [x] Integrate classifier into Reddit tracker to analyze post titles for each ticker mention
- [x] Compute sentiment split per ticker (% bullish / % bearish / % neutral)
- [x] Add bullishPct, bearishPct, neutralPct, dominantBias fields to Reddit mention data
- [x] Computed in real-time from Reddit posts (no DB schema change needed — cached 10 min)
- [x] Update tRPC routes to return sentiment split with Reddit data
- [x] Update Social Radar UI with sentiment split bars and bias badges (🟢 Long / 🔴 Short / ⚪ Mixed)
- [x] Update Dashboard picks table REDDIT column with bias indicator
- [x] Update Screener results with Reddit sentiment data
- [x] Write 23 tests for sentiment classifier (keyword matching, edge cases, split computation)
- [x] All 99 tests passing across 7 test files
- [x] Verify end-to-end and save checkpoint

## Sentiment Shift Alerts (Bearish → Bullish)
- [x] Create reddit_sentiment_snapshots DB table (migration 0005 applied)
- [x] Create sentiment_shift_alerts DB table (migration 0005 applied)
- [x] Build shift detection engine (sentimentShiftDetector.ts) with severity classification
- [x] Define shift severity levels: DRAMATIC (≥40pt), MODERATE (≥25pt), MINOR (≥15pt)
- [x] Detect 6 shift directions: BEARISH_TO_BULLISH, MIXED_TO_BULLISH, BULLISH_TO_BEARISH, etc.
- [x] Integrate shift detection into Reddit refresh flow (auto-detect on each scan)
- [x] Send owner notification via notifyOwner for bearish→bullish shifts
- [x] Add tRPC routes: alerts.recent, alerts.history, alerts.dismiss, alerts.count
- [x] Build SentimentShiftAlerts panel on Dashboard with alert cards, severity badges, dismiss
- [x] Show shift detection results in Social Radar refresh toast
- [x] Write 25 unit tests for shift detection (severity, direction, detection, routes)
- [x] All 124 tests passing across 8 test files
- [x] Verify end-to-end and save checkpoint

## Rebrand to "The Axiarch Trading Algorithm"
- [x] Update HTML page title in index.html
- [x] Update navbar logo text (Layout.tsx): Axi + arch
- [x] Update footer text (Layout.tsx)
- [x] Update Home.tsx hero, features, signal preview, CTA (8 references)
- [x] Update Methodology.tsx headings, engine descriptions, timeline (14 references)
- [x] Update Framework.tsx step data, sidebar label (20 references)
- [x] Update Calculator.tsx descriptions (3 references)
- [x] Update Screener.tsx header, defaults, disclaimer (6 references)
- [x] Update Dashboard.tsx title, picks header, disclaimer (8 references)
- [x] Update shared/const.ts comment
- [x] TypeScript compiles cleanly, all 124 tests pass
- [ ] VITE_APP_TITLE is a built-in secret (cannot be changed via code)

## Color Scheme Change & Title Fix
- [x] Change accent color from indigo to red across CSS variables and theme (oklch hue 277 → 25)
- [x] All indigo Tailwind classes now resolve to red via --color-indigo theme variable
- [x] Updated --primary, --ring, --sidebar-primary, --sidebar-ring, --chart-3, .signal-card-neutral, .glow-indigo, .text-gradient
- [x] Remove "Decoding the" from hero title on Home page (now "The Axiarch Algorithm")
- [x] TypeScript compiles cleanly

## Landing Page & Waitlist
- [x] Create waitlist table in DB schema (email, name, timestamp, source) — migration 0006
- [x] Add tRPC routes: waitlist.join (public), waitlist.count (protected)
- [x] Build Landing.tsx at root URL with hero, features grid, signal preview, pricing, waitlist form
- [x] Created Landing.tsx as new root page; old Home.tsx preserved
- [x] Update App.tsx routing: / → Landing, /pricing → Pricing, all tools gated

## Stripe Paywall ($29.99/month)
- [x] Add Stripe feature via webdev_add_feature, installed stripe package
- [x] Create stripeProducts.ts with AXIARCH_PRO ($29.99/month)
- [x] Create subscriptions table in DB schema — migration 0006
- [x] Build subscriberProcedure in trpc.ts with owner bypass (OWNER_OPEN_ID)
- [x] Gate all tool pages behind SubscriptionGate component
- [x] Build Pricing.tsx with Stripe checkout integration
- [x] Handle Stripe webhooks: checkout.session.completed, invoice.paid, subscription.updated/deleted
- [x] Billing portal for managing subscription (billing.createPortal route)
- [x] Owner (admin) always has free access — isOwner check in billing.status and subscriberProcedure
- [x] Write 11 tests for waitlist, subscription, products, and owner bypass
- [x] All 135 tests passing across 9 test files

## Bug Fixes
- [x] Fix OAuth login 403 error — reverted state param to simple base64(redirectUri) format

## Landing Page Refinement
- [x] Sharpen hero: "Stop Guessing. Start Knowing." with urgency copy
- [x] Add "How It Works" 3-step section with connector arrows
- [x] Add animated platform stats bar (149+ stocks, 20 picks, 3 subs, 6 tools)
- [x] Add scrolling ticker tape animation for market energy
- [x] Improve feature cards with outcome-focused copy and hover effects
- [x] Add FAQ accordion section (5 questions addressing common objections)
- [x] Add 4th signal preview card for more visual weight
- [x] Improve CTA hierarchy with trust badges (Cancel anytime, 60s setup, Secure checkout)
- [x] Add section labels (HOW IT WORKS, PLATFORM FEATURES, SIGNAL ENGINE, etc.)
- [x] Polish animations, spacing, and visual flow
- [x] Stronger final CTA: "The Market Doesn't Wait. Neither Should You."

## Unified Social Radar (Reddit + X + TikTok)
- [x] Build X (Twitter) tracker module (xTracker.ts) — Data API user tweets + public cashtag search
- [x] Build TikTok tracker module (tiktokTracker.ts) — Data API keyword search for stock tickers
- [x] Create unified social radar aggregator (socialRadarAggregator.ts) merging all 3 platforms
- [x] Combine mention counts, engagement, velocity signals, and sentiment across platforms
- [x] Per-platform breakdown with Reddit/X/TikTok badges showing mention counts
- [x] New tRPC routes: socialRadar.unified (cached), socialRadar.refresh (all platforms)
- [x] Rewritten SocialRadar UI with platform icons, stats bar, combined metrics
- [x] CROSS-PLATFORM badge for tickers appearing on all 3 platforms
- [x] Sentiment classifier reused across all platforms (same keyword matching)
- [x] Shift detection integrated into unified refresh flow
- [x] Write 16 tests for unified aggregator (merging, sentiment, platform breakdown)
- [x] All 151 tests passing across 10 test files
- [x] Legacy Reddit routes preserved for backward compatibility

## NLP Sentiment Classifier Upgrade
- [x] Build LLM-based classifier (Gemini 2.5 Flash) with structured JSON output for batch classification
- [x] Build negation-aware keyword fallback (handles "not bullish", "don't buy", "won't crash", "never sell", etc.)
- [x] Add sarcasm detection heuristics (quoted phrases, "sure totally", "trust me bro", excessive punctuation)
- [x] Add past tense / temporal modifier handling ("was bullish" = reduced weight)
- [x] Create nlpSentimentClassifier.ts: LLM primary (Tier 1) + enhanced keyword fallback (Tier 2)
- [x] Add batch processing (25 posts per LLM call) with in-memory result cache (5000 entries)
- [x] Integrate into redditSentiment.ts (re-exports classifyPostSentiment, async processPostsForSentiment)
- [x] xTracker.ts and tiktokTracker.ts automatically use new classifier via redditSentiment imports
- [x] Write 40 tests: negation (7), sarcasm (3), temporal (2), real-world (6), confidence (3), batch (4), edge cases (6), basic (6), API (3)
- [x] All 191 tests passing across 11 test files (40 new NLP + 151 existing)
- [x] LLM cooldown: 5 min after failure, auto-retry, graceful fallback to enhanced keywords

## SEO Meta Tags & Descriptions
- [x] Add meta description, keywords (12 targeted terms), and author tags
- [x] Add Open Graph tags for Facebook/LinkedIn sharing
- [x] Add Twitter Card tags (summary_large_image) for X sharing
- [x] Add JSON-LD structured data: SoftwareApplication, Organization, FAQPage (4 Q&As)
- [x] Add canonical URL (axiarchtrading.live), robots index/follow, theme-color
- [x] Add Apple mobile web app meta tags
